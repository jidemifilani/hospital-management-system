import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export class CreateDepartmentDto {
  name: string;
  code: string;
  description?: string;
}

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
