import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateRosterDto } from "./dto/roster.dto";


@Injectable()
export class RosterService {
  constructor(private prisma: PrismaService) {}

  async assignShift(dto: CreateRosterDto, createdById: string, organizationId: string) {
    const date = new Date(`${dto.date}T00:00:00Z`);
    const existing = await this.prisma.roster.findUnique({
      where: { staffId_date_shiftType: { staffId: dto.staffId, date, shiftType: dto.shiftType } },
    });
    if (existing) throw new ConflictException("Staff already has a shift of this type on this date");

    return this.prisma.roster.create({
      data: { ...dto, date, createdById, organizationId },
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true, specialization: true } },
        department: { select: { name: true, code: true } },
      },
    });
  }

  async getWeeklyRoster(organizationId: string, departmentId?: string, from?: string) {
    const weekStart = from ? new Date(`${from}T00:00:00Z`) : this.getMonday();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return this.prisma.roster.findMany({
      where: {
        organizationId,
        date: { gte: weekStart, lte: weekEnd },
        ...(departmentId && { departmentId }),
      },
      orderBy: [{ date: "asc" }, { shiftType: "asc" }],
      include: {
        staff: { select: { id: true, firstName: true, lastName: true, employeeId: true, specialization: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async getStaffSchedule(staffId: string, organizationId: string, from?: string) {
    const weekStart = from ? new Date(`${from}T00:00:00Z`) : this.getMonday();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 27); // 4-week view

    return this.prisma.roster.findMany({
      where: { staffId, organizationId, date: { gte: weekStart, lte: weekEnd } },
      orderBy: { date: "asc" },
      include: { department: { select: { name: true } } },
    });
  }

  async deleteShift(id: string, organizationId: string) {
    const shift = await this.prisma.roster.findFirst({ where: { id, organizationId } });
    if (!shift) throw new NotFoundException("Roster entry not found");
    await this.prisma.roster.delete({ where: { id } });
    return { message: "Shift removed" };
  }

  private getMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
