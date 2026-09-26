import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { Prisma, ServiceCategory } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CatalogueService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    filters: { category?: ServiceCategory; search?: string; activeOnly?: boolean } = {},
  ) {
    const where: Prisma.ServiceItemWhereInput = {
      organizationId,
      ...(filters.category && { category: filters.category }),
      ...(filters.activeOnly && { isActive: true }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" as const } },
          { code: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }),
    };

    return this.prisma.serviceItem.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const item = await this.prisma.serviceItem.findFirst({ where: { id, organizationId } });
    if (!item) throw new NotFoundException("Service item not found");
    return item;
  }

  async create(
    dto: {
      code: string;
      name: string;
      category: ServiceCategory;
      unitPrice: number;
      nhisPrice?: number;
      hmoPrice?: number;
      unit?: string;
      description?: string;
    },
    organizationId: string,
  ) {
    const existing = await this.prisma.serviceItem.findUnique({
      where: { code_organizationId: { code: dto.code, organizationId } },
    });
    if (existing) throw new ConflictException(`Service code ${dto.code} already exists`);

    return this.prisma.serviceItem.create({ data: { ...dto, organizationId } });
  }

  async update(
    id: string,
    dto: Partial<{
      name: string;
      category: ServiceCategory;
      unitPrice: number;
      nhisPrice: number | null;
      hmoPrice: number | null;
      unit: string;
      description: string;
      isActive: boolean;
    }>,
    organizationId: string,
  ) {
    await this.findOne(id, organizationId);
    return this.prisma.serviceItem.update({ where: { id }, data: dto });
  }

  /** Never hard-deleted — historical charges reference these rows. */
  async deactivate(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.serviceItem.update({ where: { id }, data: { isActive: false } });
  }

  async categories(organizationId: string) {
    const grouped = await this.prisma.serviceItem.groupBy({
      by: ["category"],
      where: { organizationId, isActive: true },
      _count: { _all: true },
    });
    return grouped.map((g) => ({ category: g.category, count: g._count._all }));
  }
}
