import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateDepartmentDto } from "./dto/department.dto";


@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto, organizationId: string) {
    const existing = await this.prisma.department.findUnique({
      where: { code_organizationId: { code: dto.code.toUpperCase(), organizationId } },
    });
    if (existing) throw new ConflictException(`Department code ${dto.code} already exists`);

    return this.prisma.department.create({
      data: { ...dto, code: dto.code.toUpperCase(), organizationId },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        // Whether a department bills a consultation decides whether opening an
        // encounter there raises a charge at all. Leaving it out meant no
        // screen could show which departments are actually configured to bill.
        consultationServiceItemId: true,
        _count: { select: { staff: true, appointments: true, beds: true } },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId },
      include: {
        staff: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
            user: { select: { role: true } },
          },
        },
        beds: { orderBy: { bedNumber: "asc" } },
      },
    });
    if (!dept) throw new NotFoundException("Department not found");
    return dept;
  }

  async update(id: string, data: Partial<CreateDepartmentDto>, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.department.update({
      where: { id },
      data: { ...data, code: data.code?.toUpperCase() },
    });
  }
}
