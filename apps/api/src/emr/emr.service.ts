import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVitalSignsDto } from "./dto/create-vital-signs.dto";
import { CreateClinicalNoteDto } from "./dto/create-clinical-note.dto";
import { CreateDiagnosisDto } from "./dto/create-diagnosis.dto";

@Injectable()
export class EmrService {
  constructor(private prisma: PrismaService) {}

  // ── Vital Signs ────────────────────────────────────────────────────────────

  async recordVitals(dto: CreateVitalSignsDto, staffId: string, organizationId: string) {
    const bmi =
      dto.weight && dto.height
        ? parseFloat((dto.weight / (dto.height / 100) ** 2).toFixed(1))
        : undefined;

    return this.prisma.vitalSigns.create({
      data: { ...dto, bmi, recordedById: staffId, organizationId },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async getVitalsHistory(patientId: string, organizationId: string, limit = 10) {
    await this.assertPatient(patientId, organizationId);
    return this.prisma.vitalSigns.findMany({
      where: { patientId },
      orderBy: { recordedAt: "desc" },
      take: limit,
      include: { recordedBy: { select: { firstName: true, lastName: true, specialization: true } } },
    });
  }

  // ── Clinical Notes ─────────────────────────────────────────────────────────

  async createNote(dto: CreateClinicalNoteDto, authorId: string, organizationId: string) {
    return this.prisma.clinicalNote.create({
      data: { ...dto, authorId, organizationId },
      include: {
        author: { select: { firstName: true, lastName: true, specialization: true } },
      },
    });
  }

  async getNotes(patientId: string, organizationId: string, appointmentId?: string) {
    await this.assertPatient(patientId, organizationId);
    return this.prisma.clinicalNote.findMany({
      where: { patientId, deletedAt: null, ...(appointmentId ? { appointmentId } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { firstName: true, lastName: true, specialization: true } },
      },
    });
  }

  async updateNote(
    id: string,
    data: Partial<CreateClinicalNoteDto>,
    authorId: string,
    organizationId: string,
  ) {
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id, authorId, organizationId, deletedAt: null },
    });
    if (!note) throw new NotFoundException("Clinical note not found or not yours to edit");
    return this.prisma.clinicalNote.update({ where: { id }, data });
  }

  // ── Diagnoses ──────────────────────────────────────────────────────────────

  async createDiagnosis(dto: CreateDiagnosisDto, staffId: string, organizationId: string) {
    return this.prisma.diagnosis.create({
      data: { ...dto, diagnosedById: staffId, organizationId },
      include: {
        diagnosedBy: { select: { firstName: true, lastName: true, specialization: true } },
      },
    });
  }

  async getDiagnoses(patientId: string, organizationId: string) {
    await this.assertPatient(patientId, organizationId);
    return this.prisma.diagnosis.findMany({
      where: { patientId },
      orderBy: { diagnosedAt: "desc" },
      include: {
        diagnosedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async updateDiagnosis(id: string, data: { status?: string; resolvedAt?: Date; notes?: string }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma.diagnosis.update({ where: { id }, data: data as any });
  }

  // ── Patient Summary (full EMR snapshot) ───────────────────────────────────

  async getPatientSummary(patientId: string, organizationId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId, deletedAt: null },
      include: {
        appointments: {
          where: { deletedAt: null },
          orderBy: { scheduledAt: "desc" },
          take: 10,
          include: {
            doctor: { select: { firstName: true, lastName: true, specialization: true } },
            department: { select: { name: true } },
          },
        },
      },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const [latestVitals, activeDiagnoses, recentNotes] = await Promise.all([
      this.prisma.vitalSigns.findFirst({
        where: { patientId },
        orderBy: { recordedAt: "desc" },
      }),
      this.prisma.diagnosis.findMany({
        where: { patientId, status: "ACTIVE" },
        orderBy: { diagnosedAt: "desc" },
      }),
      this.prisma.clinicalNote.findMany({
        where: { patientId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    return { patient, latestVitals, activeDiagnoses, recentNotes };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async assertPatient(id: string, organizationId: string) {
    const p = await this.prisma.patient.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!p) throw new NotFoundException("Patient not found");
    return p;
  }
}
