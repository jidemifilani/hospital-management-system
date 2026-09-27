import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters: { departmentId?: string; search?: string; isActive?: boolean } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      deletedAt: null as null,
      ...(filters.departmentId && { departmentId: filters.departmentId }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.search && {
        OR: [
          { firstName: { contains: filters.search, mode: "insensitive" as const } },
          { lastName: { contains: filters.search, mode: "insensitive" as const } },
          { employeeId: { contains: filters.search, mode: "insensitive" as const } },
          { specialization: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: "asc" },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          phone: true,
          specialization: true,
          licenseNumber: true,
          isActive: true,
          joiningDate: true,
          department: { select: { id: true, name: true, code: true } },
          user: { select: { email: true, role: true, status: true } },
        },
      }),
      this.prisma.staff.count({ where }),
    ]);

    return { data: items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        department: true,
        user: { select: { email: true, role: true, status: true, mfaEnabled: true, lastLoginAt: true } },
        appointments: {
          where: { deletedAt: null },
          orderBy: { scheduledAt: "desc" },
          take: 10,
          select: {
            id: true,
            scheduledAt: true,
            type: true,
            status: true,
            patient: { select: { mrn: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!staff) throw new NotFoundException("Staff member not found");
    return staff;
  }

  async getDoctors(organizationId: string, departmentId?: string) {
    return this.prisma.staff.findMany({
      where: {
        organizationId,
        isActive: true,
        deletedAt: null,
        ...(departmentId && { departmentId }),
        user: { role: { in: ["DOCTOR", "DEPARTMENT_HEAD"] } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { lastName: "asc" },
    });
  }

  async updateStatus(id: string, isActive: boolean, organizationId: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id, organizationId } });
    if (!staff) throw new NotFoundException("Staff member not found");
    return this.prisma.staff.update({
      where: { id },
      data: { isActive },
      select: { id: true, firstName: true, lastName: true, isActive: true },
    });
  }
}
