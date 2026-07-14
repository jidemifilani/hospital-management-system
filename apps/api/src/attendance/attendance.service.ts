import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RecordAttendanceDto } from "./dto/record-attendance.dto";

const STAFF_SELECT = {
  id: true, firstName: true, lastName: true, employeeId: true,
  department: { select: { id: true, name: true } },
};

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async clockIn(staffId: string, organizationId: string, time?: string) {
    const date = time ? new Date(time) : new Date();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existing = await this.prisma.attendance.findFirst({
      where: { staffId, date: { gte: dayStart, lt: dayEnd } },
    });
    if (existing) {
      if (existing.clockIn) throw new ConflictException("Already clocked in today");
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: { clockIn: date, status: "PRESENT" },
        include: { staff: { select: STAFF_SELECT } },
      });
    }

    const shiftStart = new Date(date);
    shiftStart.setHours(8, 0, 0, 0);
    const status = date > shiftStart ? "LATE" : "PRESENT";

    return this.prisma.attendance.create({
      data: { staffId, date: dayStart, clockIn: date, status: status as any, organizationId },
      include: { staff: { select: STAFF_SELECT } },
    });
  }

  async clockOut(staffId: string, organizationId: string, time?: string) {
    const date = time ? new Date(time) : new Date();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const record = await this.prisma.attendance.findFirst({
      where: { staffId, organizationId, date: { gte: dayStart, lt: dayEnd } },
    });
    if (!record) throw new NotFoundException("No clock-in record found for today");
    if (record.clockOut) throw new ConflictException("Already clocked out today");

    return this.prisma.attendance.update({
      where: { id: record.id },
      data: { clockOut: date },
      include: { staff: { select: STAFF_SELECT } },
    });
  }

  async record(dto: RecordAttendanceDto, organizationId: string) {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    return this.prisma.attendance.upsert({
      where: { staffId_date: { staffId: dto.staffId, date } },
      create: { staffId: dto.staffId, date, status: (dto.status as any) ?? "ABSENT", notes: dto.notes, organizationId },
      update: { status: (dto.status as any) ?? "ABSENT", notes: dto.notes },
      include: { staff: { select: STAFF_SELECT } },
    });
  }

  async findAll(organizationId: string, date?: string, departmentId?: string, staffId?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const where: any = {
      organizationId,
      date: { gte: targetDate, lt: nextDay },
    };
    if (staffId) where.staffId = staffId;
    if (departmentId) {
      where.staff = { departmentId };
    }

    return this.prisma.attendance.findMany({
      where,
      include: { staff: { select: STAFF_SELECT } },
      orderBy: { staff: { lastName: "asc" } },
    });
  }

  async getSummary(organizationId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const [present, absent, late, halfDay, onLeave, totalStaff] = await Promise.all([
      this.prisma.attendance.count({ where: { organizationId, status: "PRESENT", date: { gte: targetDate, lt: nextDay } } }),
      this.prisma.attendance.count({ where: { organizationId, status: "ABSENT", date: { gte: targetDate, lt: nextDay } } }),
      this.prisma.attendance.count({ where: { organizationId, status: "LATE", date: { gte: targetDate, lt: nextDay } } }),
      this.prisma.attendance.count({ where: { organizationId, status: "HALF_DAY", date: { gte: targetDate, lt: nextDay } } }),
      this.prisma.attendance.count({ where: { organizationId, status: "ON_LEAVE", date: { gte: targetDate, lt: nextDay } } }),
      this.prisma.staff.count({ where: { organizationId, isActive: true, deletedAt: null } }),
    ]);

    return { present, absent, late, halfDay, onLeave, totalStaff, date: targetDate };
  }

  async getStaffRecord(staffId: string, organizationId: string, from: string, to: string) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    return this.prisma.attendance.findMany({
      where: { staffId, organizationId, date: { gte: fromDate, lte: toDate } },
      orderBy: { date: "asc" },
    });
  }
}
