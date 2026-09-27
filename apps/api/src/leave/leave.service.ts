import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLeaveDto } from "./dto/create-leave.dto";
import { ReviewLeaveDto } from "./dto/review-leave.dto";
import { LeaveStatus } from "@prisma/client";

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  private businessDays(start: Date, end: Date): number {
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  async apply(staffId: string, organizationId: string, dto: CreateLeaveDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException("End date must be after start date");

    const days = this.businessDays(start, end);
    if (days === 0) throw new BadRequestException("No working days in selected range");

    // Check for overlapping leave requests
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        staffId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });
    if (overlap) throw new BadRequestException("You already have a leave request overlapping this period");

    return this.prisma.leaveRequest.create({
      data: {
        staffId,
        organizationId,
        type: dto.type,
        startDate: start,
        endDate: end,
        days,
        reason: dto.reason,
        status: "PENDING",
      },
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true } },
      },
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters: { staffId?: string; status?: string; type?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      ...(filters.staffId && { staffId: filters.staffId }),
      ...(filters.status && filters.status !== "ALL" && { status: filters.status as LeaveStatus }),
      ...(filters.type && filters.type !== "ALL" && { type: filters.type as any }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          staff: {
            select: {
              id: true, firstName: true, lastName: true, employeeId: true,
              department: { select: { name: true } },
            },
          },
          approvedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return { data: items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findMine(staffId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { staffId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          approvedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return { data: items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async review(id: string, approverStaffId: string, organizationId: string, dto: ReviewLeaveDto) {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: { id, organizationId },
    });
    if (!leave) throw new NotFoundException("Leave request not found");
    if (leave.status !== "PENDING") {
      throw new BadRequestException(`Leave request is already ${leave.status.toLowerCase()}`);
    }
    if (leave.staffId === approverStaffId) {
      throw new ForbiddenException("You cannot approve your own leave request");
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: dto.decision,
        approvedById: approverStaffId,
        approvedAt: new Date(),
        rejectionNote: dto.decision === "REJECTED" ? (dto.rejectionNote ?? null) : null,
      },
      include: {
        staff: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async cancel(id: string, staffId: string) {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: { id, staffId },
    });
    if (!leave) throw new NotFoundException("Leave request not found");
    if (leave.status !== "PENDING") {
      throw new BadRequestException("Only pending requests can be cancelled");
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  }

  async getSummary(organizationId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [byStatus, onLeaveToday, thisMonthTotal] = await Promise.all([
      this.prisma.leaveRequest.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { status: true },
      }),
      this.prisma.leaveRequest.count({
        where: {
          organizationId,
          status: "APPROVED",
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
      this.prisma.leaveRequest.aggregate({
        where: {
          organizationId,
          status: "APPROVED",
          startDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { days: true },
      }),
    ]);

    return {
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count.status])),
      onLeaveToday,
      daysApprovedThisMonth: thisMonthTotal._sum.days ?? 0,
    };
  }
}
