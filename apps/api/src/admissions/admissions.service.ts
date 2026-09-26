import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AdmissionType, AdmissionStatus, DischargeType, Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { ChargesService } from "../charges/charges.service";

const genNo = customAlphabet("0123456789", 8);

const nightsBetween = (from: Date, to: Date) =>
  Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));

@Injectable()
export class AdmissionsService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
    private charges: ChargesService,
  ) {}

  /**
   * Admits a patient: opens (or reuses) an inpatient encounter, creates the
   * admission, assigns the bed and marks it occupied — atomically.
   */
  async admit(
    dto: {
      patientId: string;
      bedId: string;
      admittingDoctorId: string;
      departmentId?: string;
      encounterId?: string;
      attendingDoctorId?: string;
      admissionType?: AdmissionType;
      reason: string;
      provisionalDiagnosis?: string;
      expectedDischargeAt?: string;
    },
    organizationId: string,
    createdById?: string | null,
  ) {
    const [patient, bed, doctor] = await Promise.all([
      this.prisma.patient.findFirst({
        where: { id: dto.patientId, organizationId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.bed.findFirst({
        where: { id: dto.bedId, department: { organizationId } },
        select: { id: true, isOccupied: true, departmentId: true, bedNumber: true, ward: true },
      }),
      this.prisma.staff.findFirst({
        where: { id: dto.admittingDoctorId, organizationId },
        select: { id: true },
      }),
    ]);

    if (!patient) throw new NotFoundException("Patient not found");
    if (!bed) throw new NotFoundException("Bed not found");
    if (bed.isOccupied) throw new BadRequestException("That bed is already occupied");
    if (!doctor) throw new NotFoundException("Admitting doctor not found");

    const active = await this.prisma.admission.findFirst({
      where: { patientId: dto.patientId, organizationId, status: "ACTIVE" },
      select: { admissionNumber: true },
    });
    if (active) {
      throw new BadRequestException(
        `Patient already has an active admission (${active.admissionNumber})`,
      );
    }

    const departmentId = dto.departmentId ?? bed.departmentId;

    const result = await this.prisma.$transaction(async (tx) => {
      let encounterId = dto.encounterId ?? null;
      let encounterCreated = false;

      if (encounterId) {
        const existing = await tx.encounter.findFirst({
          where: { id: encounterId, organizationId, deletedAt: null },
        });
        if (!existing) throw new NotFoundException("Encounter not found");
        await tx.encounter.update({
          where: { id: encounterId },
          data: { type: "INPATIENT", status: "ADMITTED" },
        });
      } else {
        const created = await tx.encounter.create({
          data: {
            encounterNumber: `ENC-${genNo()}`,
            patientId: dto.patientId,
            type: "INPATIENT",
            status: "ADMITTED",
            departmentId,
            attendingDoctorId: dto.attendingDoctorId ?? dto.admittingDoctorId,
            chiefComplaint: dto.reason,
            organizationId,
            createdById: createdById ?? null,
          },
        });
        encounterId = created.id;
        encounterCreated = true;
      }

      const admission = await tx.admission.create({
        data: {
          admissionNumber: `ADM-${genNo()}`,
          encounterId,
          patientId: dto.patientId,
          admissionType: dto.admissionType ?? "EMERGENCY",
          admittingDoctorId: dto.admittingDoctorId,
          attendingDoctorId: dto.attendingDoctorId ?? null,
          reason: dto.reason,
          provisionalDiagnosis: dto.provisionalDiagnosis ?? null,
          expectedDischargeAt: dto.expectedDischargeAt ? new Date(dto.expectedDischargeAt) : null,
          organizationId,
        },
      });

      await tx.bedAssignment.create({
        data: {
          admissionId: admission.id,
          bedId: dto.bedId,
          assignedById: createdById ?? null,
          organizationId,
        },
      });

      await tx.bed.update({
        where: { id: dto.bedId },
        data: { isOccupied: true, patientId: dto.patientId, admittedAt: new Date() },
      });

      return { admission, encounterId, encounterCreated, departmentId };
    });

    if (result.encounterCreated) {
      this.events.emit("encounter.started", {
        encounterId: result.encounterId,
        organizationId,
        departmentId: result.departmentId,
        createdById: createdById ?? null,
      });
    }
    this.events.emit("admission.created", {
      admissionId: result.admission.id,
      encounterId: result.encounterId,
      patientId: dto.patientId,
      bedId: dto.bedId,
      organizationId,
    });

    return this.findOne(result.admission.id, organizationId);
  }

  /** Moves a patient to another bed, keeping a full occupancy trail for billing. */
  async transferBed(
    id: string,
    dto: { targetBedId: string; reason?: string },
    organizationId: string,
    staffId?: string | null,
  ) {
    const admission = await this.prisma.admission.findFirst({
      where: { id, organizationId },
      include: { bedAssignments: { where: { releasedAt: null }, take: 1 } },
    });
    if (!admission) throw new NotFoundException("Admission not found");
    if (admission.status !== "ACTIVE") throw new BadRequestException("Admission is not active");

    const target = await this.prisma.bed.findFirst({
      where: { id: dto.targetBedId, department: { organizationId } },
      select: { id: true, isOccupied: true },
    });
    if (!target) throw new NotFoundException("Target bed not found");
    if (target.isOccupied) throw new BadRequestException("Target bed is already occupied");

    const current = admission.bedAssignments[0];

    await this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.bedAssignment.update({
          where: { id: current.id },
          data: { releasedAt: new Date() },
        });
        await tx.bed.update({
          where: { id: current.bedId },
          data: { isOccupied: false, patientId: null, admittedAt: null },
        });
      }

      await tx.bedAssignment.create({
        data: {
          admissionId: admission.id,
          bedId: dto.targetBedId,
          assignedById: staffId ?? null,
          reason: dto.reason ?? null,
          organizationId,
        },
      });

      await tx.bed.update({
        where: { id: dto.targetBedId },
        data: { isOccupied: true, patientId: admission.patientId, admittedAt: new Date() },
      });
    });

    this.events.emit("admission.transferred", {
      admissionId: admission.id,
      fromBedId: current?.bedId ?? null,
      toBedId: dto.targetBedId,
      organizationId,
    });

    return this.findOne(id, organizationId);
  }

  /**
   * Discharges the patient: frees the bed, closes the episode, writes the
   * discharge record and sweeps outstanding charges into a final invoice.
   */
  async discharge(
    id: string,
    dto: {
      dischargeType?: DischargeType;
      dischargeNotes?: string;
      followUpDate?: string;
      followUpInstructions?: string;
      medicationsOnDischarge?: string;
      status?: AdmissionStatus;
      autoInvoice?: boolean;
    },
    organizationId: string,
    staffId: string,
  ) {
    const admission = await this.prisma.admission.findFirst({
      where: { id, organizationId },
      include: { bedAssignments: { where: { releasedAt: null }, take: 1 } },
    });
    if (!admission) throw new NotFoundException("Admission not found");
    if (admission.status !== "ACTIVE") throw new BadRequestException("Admission is not active");

    const dischargedAt = new Date();
    const current = admission.bedAssignments[0];

    await this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.bedAssignment.update({
          where: { id: current.id },
          data: { releasedAt: dischargedAt },
        });
        await tx.bed.update({
          where: { id: current.bedId },
          data: { isOccupied: false, patientId: null, admittedAt: null },
        });
      }

      await tx.admission.update({
        where: { id },
        data: {
          status: dto.status ?? "DISCHARGED",
          dischargedAt,
          lengthOfStayDays: nightsBetween(admission.admittedAt, dischargedAt),
        },
      });

      await tx.dischargeRecord.create({
        data: {
          dischargeNumber: `DIS-${genNo()}`,
          patientId: admission.patientId,
          encounterId: admission.encounterId,
          admissionId: admission.id,
          bedId: current?.bedId ?? null,
          admittedAt: admission.admittedAt,
          dischargedAt,
          dischargeType: dto.dischargeType ?? "REGULAR",
          status: "COMPLETED",
          dischargingDoctorId: staffId,
          dischargeNotes: dto.dischargeNotes ?? null,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
          followUpInstructions: dto.followUpInstructions ?? null,
          medicationsOnDischarge: dto.medicationsOnDischarge ?? null,
          organizationId,
        },
      });

      await tx.encounter.update({
        where: { id: admission.encounterId },
        data: {
          status: "DISCHARGED",
          endedAt: dischargedAt,
          disposition: dto.dischargeType ?? "REGULAR",
        },
      });
    });

    let invoice = null;
    if (dto.autoInvoice !== false) {
      const pending = await this.prisma.charge.count({
        where: { encounterId: admission.encounterId, isBilled: false, isVoided: false },
      });
      if (pending > 0) {
        invoice = await this.charges.rollIntoInvoice(admission.encounterId, organizationId, staffId);
      }
    }

    this.events.emit("admission.discharged", {
      admissionId: admission.id,
      encounterId: admission.encounterId,
      patientId: admission.patientId,
      organizationId,
    });

    return { admission: await this.findOne(id, organizationId), invoice };
  }

  async findAll(
    organizationId: string,
    filters: { status?: AdmissionStatus; patientId?: string; page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 20);

    const where: Prisma.AdmissionWhereInput = {
      organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.patientId && { patientId: filters.patientId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.admission.findMany({
        where,
        include: this.summaryInclude,
        orderBy: { admittedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.admission.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const admission = await this.prisma.admission.findFirst({
      where: { id, organizationId },
      include: {
        ...this.summaryInclude,
        encounter: {
          select: { id: true, encounterNumber: true, status: true, type: true, startedAt: true },
        },
        bedAssignments: {
          orderBy: { assignedAt: "desc" },
          include: {
            bed: { select: { id: true, bedNumber: true, ward: true, wardClass: true } },
          },
        },
        dischargeRecords: true,
      },
    });
    if (!admission) throw new NotFoundException("Admission not found");
    return admission;
  }

  /** Live inpatient census — who is in, where, and for how long. */
  async census(organizationId: string) {
    const active = await this.prisma.admission.findMany({
      where: { organizationId, status: "ACTIVE" },
      include: {
        patient: { select: { id: true, mrn: true, firstName: true, lastName: true } },
        attendingDoctor: { select: { id: true, firstName: true, lastName: true } },
        bedAssignments: {
          where: { releasedAt: null },
          take: 1,
          include: { bed: { select: { bedNumber: true, ward: true, wardClass: true } } },
        },
      },
      orderBy: { admittedAt: "asc" },
    });

    const now = new Date();
    const byWard = new Map<string, number>();
    for (const a of active) {
      const ward = a.bedAssignments[0]?.bed.ward ?? "Unassigned";
      byWard.set(ward, (byWard.get(ward) ?? 0) + 1);
    }

    return {
      totalAdmitted: active.length,
      byWard: [...byWard.entries()].map(([ward, count]) => ({ ward, count })),
      patients: active.map((a) => ({
        admissionId: a.id,
        admissionNumber: a.admissionNumber,
        patient: a.patient,
        attendingDoctor: a.attendingDoctor,
        bed: a.bedAssignments[0]?.bed ?? null,
        admittedAt: a.admittedAt,
        daysAdmitted: nightsBetween(a.admittedAt, now),
        expectedDischargeAt: a.expectedDischargeAt,
      })),
    };
  }

  private readonly summaryInclude = {
    patient: { select: { id: true, mrn: true, firstName: true, lastName: true, phone: true } },
    admittingDoctor: { select: { id: true, firstName: true, lastName: true } },
    attendingDoctor: { select: { id: true, firstName: true, lastName: true } },
  } satisfies Prisma.AdmissionInclude;
}
