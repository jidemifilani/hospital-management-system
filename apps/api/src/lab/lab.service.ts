import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { EncountersService } from "../encounters/encounters.service";
import { CreateLabOrderDto } from "./dto/create-lab-order.dto";
import { AddLabResultsDto } from "./dto/add-lab-results.dto";

const genOrderNo = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const ORDER_INCLUDE = {
  // Date of birth and sex are on a lab report because reference ranges
  // depend on them: the same haemoglobin is normal for one patient and
  // not for another.
  patient: {
    select: {
      id: true, firstName: true, lastName: true, mrn: true,
      dateOfBirth: true, gender: true, phone: true,
    },
  },
  requestedBy: { select: { firstName: true, lastName: true, specialization: true } },
  collectedBy: { select: { firstName: true, lastName: true } },
  results: {
    include: { verifiedBy: { select: { firstName: true, lastName: true } } },
  },
};

@Injectable()
export class LabService {
  constructor(
    private prisma: PrismaService,
    private encounters: EncountersService,
    private events: EventEmitter2,
  ) {}

  async createOrder(dto: CreateLabOrderDto, requestedById: string, organizationId: string) {
    const encounterId = await this.resolveEncounterId(dto, requestedById, organizationId);
    const priced = await this.priceTests(dto.tests, organizationId);

    const order = await this.prisma.labOrder.create({
      data: {
        orderNumber: `LAB-${genOrderNo()}`,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        encounterId,
        priority: dto.priority ?? "ROUTINE",
        clinicalInfo: dto.clinicalInfo,
        sampleType: dto.sampleType,
        requestedById,
        organizationId,
        results: {
          create: dto.tests.map((testName) => ({
            testName,
            result: "",
          })),
        },
        items: {
          create: priced.map((t) => ({
            testName: t.testName,
            testCode: t.testCode,
            serviceItemId: t.serviceItemId,
          })),
        },
      },
      include: { ...ORDER_INCLUDE, items: true },
    });

    this.events.emit("lab.ordered", {
      labOrderId: order.id,
      encounterId,
      organizationId,
      requestedById,
      items: order.items.map((i) => ({
        id: i.id,
        serviceItemId: i.serviceItemId,
        testName: i.testName,
      })),
    });

    return order;
  }

  /** Falls back to the patient's open episode so walk-in orders still get billed. */
  private async resolveEncounterId(
    dto: CreateLabOrderDto,
    requestedById: string,
    organizationId: string,
  ) {
    if (dto.encounterId) return dto.encounterId;

    const staff = await this.prisma.staff.findFirst({
      where: { id: requestedById, organizationId },
      select: { departmentId: true },
    });
    if (!staff) return null;

    const encounter = await this.encounters.openForPatient(dto.patientId, organizationId, {
      departmentId: staff.departmentId,
      createdById: requestedById,
    });
    return encounter.id;
  }

  /** Matches each requested test against the service catalogue, by code then name. */
  private async priceTests(tests: string[], organizationId: string) {
    const catalogue = await this.prisma.serviceItem.findMany({
      where: { organizationId, category: "LABORATORY", isActive: true },
      select: { id: true, code: true, name: true },
    });

    const byCode = new Map(catalogue.map((c) => [c.code.toLowerCase(), c]));
    const byName = new Map(catalogue.map((c) => [c.name.toLowerCase(), c]));

    return tests.map((raw) => {
      const key = raw.trim().toLowerCase();
      const match = byCode.get(key) ?? byName.get(key);
      return {
        testName: match?.name ?? raw,
        testCode: match?.code ?? null,
        serviceItemId: match?.id ?? null,
      };
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters: { status?: string; patientId?: string; priority?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      deletedAt: null as null,
      ...(filters.status && { status: filters.status as any }),
      ...(filters.patientId && { patientId: filters.patientId }),
      ...(filters.priority && { priority: filters.priority as any }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.labOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          requestedBy: { select: { firstName: true, lastName: true } },
          _count: { select: { results: true } },
        },
      }),
      this.prisma.labOrder.count({ where }),
    ]);

    return { data: items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const order = await this.prisma.labOrder.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException("Lab order not found");
    return order;
  }

  async collectSample(id: string, collectedById: string, organizationId: string) {
    const order = await this.assertOrder(id, organizationId);
    if (order.status !== "PENDING") {
      throw new BadRequestException("Sample already collected or order cancelled");
    }
    return this.prisma.labOrder.update({
      where: { id },
      data: { status: "SAMPLE_COLLECTED", collectedById, collectedAt: new Date() },
      include: ORDER_INCLUDE,
    });
  }

  async addResults(id: string, dto: AddLabResultsDto, staffId: string, organizationId: string) {
    const order = await this.assertOrder(id, organizationId);
    if (order.status === "CANCELLED") throw new BadRequestException("Order is cancelled");

    await this.prisma.$transaction([
      // Upsert each result row
      ...dto.results.map((r) =>
        this.prisma.labResult.upsert({
          where: {
            labOrderId_testName: { labOrderId: id, testName: r.testName },
          },
          create: { labOrderId: id, ...r },
          update: { ...r },
        }),
      ),
      this.prisma.labOrder.update({
        where: { id },
        data: { status: "RESULTED" },
      }),
    ]);

    const critical = dto.results.filter((r) => r.isCritical);
    if (critical.length > 0) {
      this.events.emit("lab.criticalResult", {
        labOrderId: id,
        organizationId,
        patientId: order.patientId,
        requestedById: order.requestedById,
        results: critical.map((r) => ({
          testName: r.testName,
          result: r.result,
          unit: r.unit ?? null,
        })),
      });
    }

    return this.findOne(id, organizationId);
  }

  async verifyResults(id: string, staffId: string, organizationId: string) {
    await this.assertOrder(id, organizationId);
    await this.prisma.$transaction([
      this.prisma.labResult.updateMany({
        where: { labOrderId: id },
        data: { verifiedById: staffId },
      }),
      this.prisma.labOrder.update({
        where: { id },
        data: { status: "VERIFIED" },
      }),
    ]);
    return this.findOne(id, organizationId);
  }

  private async assertOrder(id: string, organizationId: string) {
    const order = await this.prisma.labOrder.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!order) throw new NotFoundException("Lab order not found");
    return order;
  }
}
