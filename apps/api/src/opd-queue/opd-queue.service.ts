import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EncountersService } from "../encounters/encounters.service";
import { CreateQueueDto } from "./dto/create-queue.dto";


const PATIENT_SELECT = { id: true, firstName: true, lastName: true, mrn: true, phone: true };
const DEPT_SELECT = { id: true, name: true };
const DOCTOR_SELECT = { id: true, firstName: true, lastName: true, specialization: true };

@Injectable()
export class OpdQueueService {
  constructor(
    private prisma: PrismaService,
    private encounters: EncountersService,
  ) {}

  async enqueue(dto: CreateQueueDto, organizationId: string, staffId?: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.prisma.opdQueue.count({
      where: { organizationId, createdAt: { gte: today } },
    });
    const queueNumber = `Q${String(count + 1).padStart(3, "0")}`;

    // Joining the queue is the patient's arrival, so it opens the episode.
    const encounter = await this.encounters.openForPatient(dto.patientId, organizationId, {
      departmentId: dto.departmentId,
      createdById: staffId ?? null,
    });

    return this.prisma.opdQueue.create({
      data: { ...dto, queueNumber, encounterId: encounter.id, organizationId },
      include: {
        patient: { select: PATIENT_SELECT },
        department: { select: DEPT_SELECT },
        doctor: { select: DOCTOR_SELECT },
      },
    });
  }

  async findAll(organizationId: string, departmentId?: string, status?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.opdQueue.findMany({
      where: {
        organizationId,
        createdAt: { gte: today },
        ...(departmentId ? { departmentId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        patient: { select: PATIENT_SELECT },
        department: { select: DEPT_SELECT },
        doctor: { select: DOCTOR_SELECT },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async callNext(id: string, organizationId: string) {
    const entry = await this.prisma.opdQueue.findFirst({ where: { id, organizationId } });
    if (!entry) throw new NotFoundException("Queue entry not found");
    if (entry.status !== "WAITING") throw new BadRequestException("Patient is not in WAITING status");

    return this.prisma.opdQueue.update({
      where: { id },
      data: { status: "CALLED", calledAt: new Date() },
      include: {
        patient: { select: PATIENT_SELECT },
        department: { select: DEPT_SELECT },
      },
    });
  }

  async startConsultation(id: string, organizationId: string) {
    const entry = await this.prisma.opdQueue.findFirst({ where: { id, organizationId } });
    if (!entry) throw new NotFoundException("Queue entry not found");

    return this.prisma.opdQueue.update({
      where: { id },
      data: { status: "IN_CONSULTATION", consultationStartAt: new Date() },
      include: { patient: { select: PATIENT_SELECT } },
    });
  }

  async complete(id: string, organizationId: string) {
    const entry = await this.prisma.opdQueue.findFirst({ where: { id, organizationId } });
    if (!entry) throw new NotFoundException("Queue entry not found");

    return this.prisma.opdQueue.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
      include: { patient: { select: PATIENT_SELECT } },
    });
  }

  async markNoShow(id: string, organizationId: string) {
    const entry = await this.prisma.opdQueue.findFirst({ where: { id, organizationId } });
    if (!entry) throw new NotFoundException("Queue entry not found");

    return this.prisma.opdQueue.update({
      where: { id },
      data: { status: "NO_SHOW" },
      include: { patient: { select: PATIENT_SELECT } },
    });
  }

  async getSummary(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [waiting, called, inConsultation, completed, noShow] = await Promise.all([
      this.prisma.opdQueue.count({ where: { organizationId, status: "WAITING", createdAt: { gte: today } } }),
      this.prisma.opdQueue.count({ where: { organizationId, status: "CALLED", createdAt: { gte: today } } }),
      this.prisma.opdQueue.count({ where: { organizationId, status: "IN_CONSULTATION", createdAt: { gte: today } } }),
      this.prisma.opdQueue.count({ where: { organizationId, status: "COMPLETED", createdAt: { gte: today } } }),
      this.prisma.opdQueue.count({ where: { organizationId, status: "NO_SHOW", createdAt: { gte: today } } }),
    ]);

    return { waiting, called, inConsultation, completed, noShow, total: waiting + called + inConsultation + completed + noShow };
  }
}
