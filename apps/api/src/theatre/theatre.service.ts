import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genNum = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  surgeon: { select: { id: true, firstName: true, lastName: true, specialization: true } },
  anaesthesiologist: { select: { id: true, firstName: true, lastName: true } },
  assistantSurgeon: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class TheatreService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    patientId: string; surgeonId: string; anaesthesiologistId?: string; assistantSurgeonId?: string;
    procedureName: string; icdCode?: string; scheduledDate: string; scheduledDuration?: number;
    operatingRoom?: string; urgency?: string; preOpNotes?: string; anaesthesiaType?: string;
  }, createdById: string | undefined, organizationId: string) {
    return this.prisma.theatreBooking.create({
      data: {
        bookingNumber: `OT-${genNum()}`,
        patientId: data.patientId,
        surgeonId: data.surgeonId,
        anaesthesiologistId: data.anaesthesiologistId,
        assistantSurgeonId: data.assistantSurgeonId,
        procedureName: data.procedureName,
        icdCode: data.icdCode,
        scheduledDate: new Date(data.scheduledDate),
        scheduledDuration: data.scheduledDuration ?? 60,
        operatingRoom: data.operatingRoom,
        urgency: (data.urgency as any) ?? "ELECTIVE",
        preOpNotes: data.preOpNotes,
        anaesthesiaType: data.anaesthesiaType,
        createdById,
        organizationId,
      },
      include: INCLUDE,
    });
  }

  async findAll(organizationId: string, status?: string, from?: string, to?: string) {
    const where: any = { organizationId };
    if (status) where.status = status;
    if (from || to) {
      where.scheduledDate = {};
      if (from) where.scheduledDate.gte = new Date(from);
      if (to) where.scheduledDate.lte = new Date(to);
    }
    return this.prisma.theatreBooking.findMany({
      where,
      include: INCLUDE,
      orderBy: { scheduledDate: "asc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const booking = await this.prisma.theatreBooking.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!booking) throw new NotFoundException("Booking not found");
    return booking;
  }

  async updateStatus(id: string, data: {
    status: string; actualStartTime?: string; actualEndTime?: string;
    postOpNotes?: string; complications?: string;
  }, organizationId: string) {
    const booking = await this.prisma.theatreBooking.findFirst({ where: { id, organizationId } });
    if (!booking) throw new NotFoundException("Booking not found");

    const update: any = { status: data.status };
    if (data.actualStartTime) update.actualStartTime = new Date(data.actualStartTime);
    if (data.actualEndTime) update.actualEndTime = new Date(data.actualEndTime);
    if (data.postOpNotes !== undefined) update.postOpNotes = data.postOpNotes;
    if (data.complications !== undefined) update.complications = data.complications;

    return this.prisma.theatreBooking.update({ where: { id }, data: update, include: INCLUDE });
  }

  async getSummary(organizationId: string) {
    const [scheduled, inProgress, completed, cancelled, today] = await Promise.all([
      this.prisma.theatreBooking.count({ where: { organizationId, status: "SCHEDULED" } }),
      this.prisma.theatreBooking.count({ where: { organizationId, status: "IN_PROGRESS" } }),
      this.prisma.theatreBooking.count({ where: { organizationId, status: "COMPLETED" } }),
      this.prisma.theatreBooking.count({ where: { organizationId, status: "CANCELLED" } }),
      this.prisma.theatreBooking.count({
        where: {
          organizationId,
          scheduledDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);
    return { scheduled, inProgress, completed, cancelled, today };
  }
}
