import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EncounterType, EncounterStatus, Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { ChargesService } from "../charges/charges.service";

const genEncounterNo = customAlphabet("0123456789", 8);

/** Statuses that mean the episode is still open. */
const OPEN_STATUSES: EncounterStatus[] = [
  "PLANNED",
  "ARRIVED",
  "TRIAGED",
  "IN_CONSULTATION",
  "OBSERVATION",
  "ADMITTED",
];

@Injectable()
export class EncountersService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
    private charges: ChargesService,
  ) {}

  async create(
    dto: {
      patientId: string;
      type?: EncounterType;
      departmentId: string;
      appointmentId?: string;
      attendingDoctorId?: string;
      chiefComplaint?: string;
      isBillable?: boolean;
    },
    organizationId: string,
    createdById?: string | null,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const dept = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, organizationId },
      select: { id: true },
    });
    if (!dept) throw new NotFoundException("Department not found");

    const encounter = await this.prisma.encounter.create({
      data: {
        encounterNumber: `ENC-${genEncounterNo()}`,
        patientId: dto.patientId,
        type: dto.type ?? "OUTPATIENT",
        status: "ARRIVED",
        departmentId: dto.departmentId,
        appointmentId: dto.appointmentId ?? null,
        attendingDoctorId: dto.attendingDoctorId ?? null,
        chiefComplaint: dto.chiefComplaint ?? null,
        isBillable: dto.isBillable ?? true,
        organizationId,
        createdById: createdById ?? null,
      },
      include: this.summaryInclude,
    });

    // Drives the automatic consultation charge.
    this.events.emit("encounter.started", {
      encounterId: encounter.id,
      organizationId,
      departmentId: dto.departmentId,
      createdById: createdById ?? null,
    });

    return encounter;
  }

  /**
   * Returns the patient's open encounter, creating one if none exists.
   *
   * This is what lets orders raised for a walk-in still land on an episode of
   * care (and therefore still get billed) without the clinician doing anything.
   */
  async openForPatient(
    patientId: string,
    organizationId: string,
    fallback: { departmentId: string; type?: EncounterType; createdById?: string | null },
  ) {
    const existing = await this.prisma.encounter.findFirst({
      where: {
        patientId,
        organizationId,
        deletedAt: null,
        status: { in: OPEN_STATUSES },
      },
      orderBy: { startedAt: "desc" },
    });
    if (existing) return existing;

    return this.create(
      {
        patientId,
        departmentId: fallback.departmentId,
        type: fallback.type ?? "OUTPATIENT",
      },
      organizationId,
      fallback.createdById ?? null,
    );
  }

  async findAll(
    organizationId: string,
    filters: {
      status?: EncounterStatus;
      type?: EncounterType;
      patientId?: string;
      openOnly?: boolean;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 20);

    const where: Prisma.EncounterWhereInput = {
      organizationId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.type && { type: filters.type }),
      ...(filters.patientId && { patientId: filters.patientId }),
      ...(filters.openOnly && { status: { in: OPEN_STATUSES } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        include: this.summaryInclude,
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.encounter.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        patient: true,
        department: { select: { id: true, name: true, code: true } },
        attendingDoctor: { select: { id: true, firstName: true, lastName: true, specialization: true } },
        appointment: { select: { id: true, scheduledAt: true, type: true, status: true } },
        admission: {
          include: {
            bedAssignments: {
              orderBy: { assignedAt: "desc" },
              include: { bed: { select: { id: true, bedNumber: true, ward: true, wardClass: true } } },
            },
          },
        },
        vitalSigns: { orderBy: { recordedAt: "desc" } },
        clinicalNotes: { orderBy: { createdAt: "desc" } },
        diagnoses: { orderBy: { diagnosedAt: "desc" } },
        labOrders: { include: { items: true, results: true } },
        radiologyOrders: { include: { result: true } },
        prescriptions: { include: { items: true } },
        charges: { orderBy: { incurredAt: "asc" } },
        invoices: { select: { id: true, invoiceNumber: true, total: true, status: true } },
      },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    return encounter;
  }

  async updateStatus(id: string, status: EncounterStatus, organizationId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");

    return this.prisma.encounter.update({
      where: { id },
      data: {
        status,
        ...(status === "DISCHARGED" && !encounter.endedAt && { endedAt: new Date() }),
      },
      include: this.summaryInclude,
    });
  }

  async update(
    id: string,
    dto: { attendingDoctorId?: string; chiefComplaint?: string; disposition?: string },
    organizationId: string,
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");

    return this.prisma.encounter.update({
      where: { id },
      data: dto,
      include: this.summaryInclude,
    });
  }

  /**
   * Closes an episode and sweeps its outstanding charges into a draft invoice,
   * so nothing walks out of the building unbilled.
   */
  async close(
    id: string,
    dto: { disposition?: string; autoInvoice?: boolean },
    organizationId: string,
    staffId: string,
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { admission: { select: { status: true } } },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    if (encounter.endedAt) throw new BadRequestException("Encounter is already closed");
    if (encounter.admission && encounter.admission.status === "ACTIVE") {
      throw new BadRequestException("Discharge the admission before closing this encounter");
    }

    const closed = await this.prisma.encounter.update({
      where: { id },
      data: {
        status: "DISCHARGED",
        endedAt: new Date(),
        ...(dto.disposition && { disposition: dto.disposition }),
      },
      include: this.summaryInclude,
    });

    let invoice = null;
    if (dto.autoInvoice !== false) {
      const pending = await this.prisma.charge.count({
        where: { encounterId: id, isBilled: false, isVoided: false },
      });
      if (pending > 0) {
        invoice = await this.charges.rollIntoInvoice(id, organizationId, staffId);
      }
    }

    return { encounter: closed, invoice };
  }

  private readonly summaryInclude = {
    patient: { select: { id: true, mrn: true, firstName: true, lastName: true, phone: true } },
    department: { select: { id: true, name: true, code: true } },
    attendingDoctor: { select: { id: true, firstName: true, lastName: true } },
    admission: { select: { id: true, admissionNumber: true, status: true } },
  } satisfies Prisma.EncounterInclude;
}
