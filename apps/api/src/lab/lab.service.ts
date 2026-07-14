import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLabOrderDto } from "./dto/create-lab-order.dto";
import { AddLabResultsDto } from "./dto/add-lab-results.dto";

const genOrderNo = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const ORDER_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  requestedBy: { select: { firstName: true, lastName: true, specialization: true } },
  collectedBy: { select: { firstName: true, lastName: true } },
  results: {
    include: { verifiedBy: { select: { firstName: true, lastName: true } } },
  },
};

@Injectable()
export class LabService {
  constructor(private prisma: PrismaService) {}

  async createOrder(dto: CreateLabOrderDto, requestedById: string, organizationId: string) {
    return this.prisma.labOrder.create({
      data: {
        orderNumber: `LAB-${genOrderNo()}`,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
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
      },
      include: ORDER_INCLUDE,
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

    return { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
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
