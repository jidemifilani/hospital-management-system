import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const include = {
  fromStaff: { select: { firstName: true, lastName: true } },
  toStaff: { select: { firstName: true, lastName: true } },
  department: { select: { name: true } },
};

@Injectable()
export class HandoverService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, fromStaffId: string, organizationId: string) {
    return this.prisma.shiftHandover.create({
      data: {
        handoverNumber: `HO-${genId()}`,
        organizationId,
        fromStaffId,
        toStaffId: data.toStaffId,
        shiftType: data.shiftType,
        departmentId: data.departmentId,
        handoverDate: new Date(data.handoverDate),
        generalNotes: data.generalNotes ?? null,
        pendingTasks: data.pendingTasks ?? null,
        patients: data.patients ?? [],
        status: "SUBMITTED",
      },
      include,
    });
  }

  async findAll(q: any, organizationId: string) {
    const where: any = { organizationId };
    if (q.departmentId) where.departmentId = q.departmentId;
    if (q.status) where.status = q.status;
    if (q.date) {
      const d = new Date(q.date);
      where.handoverDate = { gte: new Date(d.setHours(0, 0, 0, 0)), lte: new Date(d.setHours(23, 59, 59, 999)) };
    }

    return this.prisma.shiftHandover.findMany({
      where,
      include,
      orderBy: { handoverDate: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const h = await this.prisma.shiftHandover.findFirst({ where: { id, organizationId }, include });
    if (!h) throw new NotFoundException("Handover not found");
    return h;
  }

  async acknowledge(id: string, staffId: string, organizationId: string) {
    const h = await this.prisma.shiftHandover.findFirst({ where: { id, organizationId } });
    if (!h) throw new NotFoundException("Handover not found");
    if (h.toStaffId !== staffId) throw new BadRequestException("Only the receiving staff can acknowledge");
    if (h.status === "ACKNOWLEDGED") throw new BadRequestException("Already acknowledged");

    return this.prisma.shiftHandover.update({
      where: { id },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
      include,
    });
  }

  async getSummary(organizationId: string) {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    const [todayTotal, pending, acknowledged, total] = await Promise.all([
      this.prisma.shiftHandover.count({ where: { organizationId, handoverDate: { gte: start, lte: end } } }),
      this.prisma.shiftHandover.count({ where: { organizationId, status: "SUBMITTED" } }),
      this.prisma.shiftHandover.count({ where: { organizationId, status: "ACKNOWLEDGED" } }),
      this.prisma.shiftHandover.count({ where: { organizationId } }),
    ]);
    return { todayTotal, pending, acknowledged, total };
  }
}
