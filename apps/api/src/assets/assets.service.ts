import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genNum = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const ASSET_INCLUDE = {
  department: { select: { id: true, name: true } },
  maintenances: { orderBy: { scheduledDate: "desc" as const }, take: 5 },
} as const;

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string; category?: string; brand?: string; model?: string; serialNumber?: string;
    purchaseDate?: string; purchasePrice?: number; warrantyExpiry?: string;
    location?: string; departmentId?: string; notes?: string;
  }, organizationId: string) {
    return this.prisma.asset.create({
      data: {
        assetNumber: `AST-${genNum()}`,
        name: data.name,
        category: (data.category as any) ?? "OTHER",
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        purchasePrice: data.purchasePrice,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        location: data.location,
        departmentId: data.departmentId,
        notes: data.notes,
        organizationId,
      },
      include: ASSET_INCLUDE,
    });
  }

  async findAll(organizationId: string, category?: string, status?: string, departmentId?: string) {
    return this.prisma.asset.findMany({
      where: {
        organizationId,
        ...(category ? { category: category as any } : {}),
        ...(status ? { status: status as any } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: ASSET_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, organizationId },
      include: { ...ASSET_INCLUDE, maintenances: { orderBy: { scheduledDate: "desc" } } },
    });
    if (!asset) throw new NotFoundException("Asset not found");
    return asset;
  }

  async update(id: string, data: any, organizationId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, organizationId } });
    if (!asset) throw new NotFoundException("Asset not found");
    const { purchaseDate, warrantyExpiry, purchasePrice, ...rest } = data;
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...rest,
        ...(purchaseDate ? { purchaseDate: new Date(purchaseDate) } : {}),
        ...(warrantyExpiry ? { warrantyExpiry: new Date(warrantyExpiry) } : {}),
        ...(purchasePrice !== undefined ? { purchasePrice } : {}),
      },
      include: ASSET_INCLUDE,
    });
  }

  async scheduleMaintenance(assetId: string, data: {
    type?: string; scheduledDate: string; notes?: string; performedBy?: string;
  }, organizationId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, organizationId } });
    if (!asset) throw new NotFoundException("Asset not found");
    return this.prisma.assetMaintenance.create({
      data: {
        assetId,
        type: (data.type as any) ?? "PREVENTIVE",
        scheduledDate: new Date(data.scheduledDate),
        notes: data.notes,
        performedBy: data.performedBy,
      },
    });
  }

  async completeMaintenance(maintenanceId: string, data: {
    cost?: number; notes?: string; performedBy?: string;
  }, organizationId: string) {
    const maint = await this.prisma.assetMaintenance.findFirst({
      where: { id: maintenanceId },
      include: { asset: true },
    });
    if (!maint || maint.asset.organizationId !== organizationId) throw new NotFoundException("Maintenance record not found");
    return this.prisma.assetMaintenance.update({
      where: { id: maintenanceId },
      data: {
        status: "COMPLETED",
        completedDate: new Date(),
        cost: data.cost,
        notes: data.notes ?? maint.notes,
        performedBy: data.performedBy ?? maint.performedBy,
      },
    });
  }

  async getSummary(organizationId: string) {
    const [active, underMaintenance, decommissioned, scheduledMaint] = await Promise.all([
      this.prisma.asset.count({ where: { organizationId, status: "ACTIVE" } }),
      this.prisma.asset.count({ where: { organizationId, status: "UNDER_MAINTENANCE" } }),
      this.prisma.asset.count({ where: { organizationId, status: "DECOMMISSIONED" } }),
      this.prisma.assetMaintenance.count({
        where: { asset: { organizationId }, status: "SCHEDULED" },
      }),
    ]);
    const totalValue = await this.prisma.asset.aggregate({
      where: { organizationId, status: "ACTIVE" },
      _sum: { purchasePrice: true },
    });
    return { active, underMaintenance, decommissioned, scheduledMaint, totalValue: totalValue._sum.purchasePrice ?? 0 };
  }
}
