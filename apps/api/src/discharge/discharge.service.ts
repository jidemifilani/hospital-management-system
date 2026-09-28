import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RecallService } from "../recall/recall.service";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

const include = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  dischargingDoctor: {
    select: {
      id: true, firstName: true, lastName: true,
      user: { select: { role: true } },
    },
  },
} as const;

@Injectable()
export class DischargeService {
  constructor(
    private prisma: PrismaService,
    private recall: RecallService,
  ) {}

  async create(data: any, staffId: string, organizationId: string) {
    const record = await this.prisma.dischargeRecord.create({
      data: {
        dischargeNumber: `DIS-${nanoid()}`,
        organizationId,
        patientId: data.patientId,
        bedId: data.bedId,
        admittedAt: data.admittedAt ? new Date(data.admittedAt) : undefined,
        dischargeType: data.dischargeType ?? "REGULAR",
        dischargingDoctorId: staffId,
        dischargeNotes: data.dischargeNotes,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        followUpInstructions: data.followUpInstructions,
        medicationsOnDischarge: data.medicationsOnDischarge,
      },
      include,
    });

    // A follow-up date used to be written here and read by nothing at all,
    // so the patient was never actually recalled.
    await this.raiseRecallFor(record, organizationId);

    return record;
  }

  /** Puts a recorded follow-up date onto the recall worklist. */
  private async raiseRecallFor(
    record: { id: string; patientId: string; followUpDate: Date | null; followUpInstructions: string | null },
    organizationId: string,
  ) {
    if (!record.followUpDate) return;

    await this.recall.raiseQuietly(
      {
        patientId: record.patientId,
        reason: "Follow-up after discharge",
        instructions: record.followUpInstructions ?? undefined,
        dueOn: record.followUpDate,
        source: "DISCHARGE",
        sourceRef: record.id,
      },
      organizationId,
    );
  }

  async findAll(q: any, organizationId: string) {
    const where: any = { organizationId };
    if (q.status) where.status = q.status;
    if (q.dischargeType) where.dischargeType = q.dischargeType;
    if (q.patientId) where.patientId = q.patientId;
    if (q.date) {
      const d = new Date(q.date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }
    return this.prisma.dischargeRecord.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.dischargeRecord.findFirst({ where: { id, organizationId }, include });
    if (!record) throw new NotFoundException("Discharge record not found");
    return record;
  }

  async complete(id: string, data: any, organizationId: string) {
    const record = await this.findOne(id, organizationId);
    if (record.status === "COMPLETED") throw new BadRequestException("Already completed");

    const completed = await this.prisma.dischargeRecord.update({
      where: { id },
      data: {
        status: "COMPLETED",
        dischargedAt: new Date(),
        dischargeNotes: data.dischargeNotes ?? record.dischargeNotes,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : record.followUpDate,
        followUpInstructions: data.followUpInstructions ?? record.followUpInstructions,
        medicationsOnDischarge: data.medicationsOnDischarge ?? record.medicationsOnDischarge,
      },
      include,
    });

    // Completing is where the follow-up date is usually settled, so the
    // recall is raised here too; raising it twice for the same record is
    // refused by the (source, sourceRef) pair rather than by luck.
    await this.raiseRecallFor(completed, organizationId);

    return completed;
  }

  async cancel(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.dischargeRecord.update({ where: { id }, data: { status: "CANCELLED" }, include });
  }

  async getSummary(organizationId: string) {
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const [pending, completedToday, ama, total] = await Promise.all([
      this.prisma.dischargeRecord.count({ where: { organizationId, status: "PENDING" } }),
      this.prisma.dischargeRecord.count({ where: { organizationId, status: "COMPLETED", dischargedAt: { gte: start, lte: end } } }),
      this.prisma.dischargeRecord.count({ where: { organizationId, dischargeType: "AMA" } }),
      this.prisma.dischargeRecord.count({ where: { organizationId } }),
    ]);
    return { pending, completedToday, ama, total };
  }
}
