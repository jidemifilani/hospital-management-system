import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRadiologyOrderDto } from "./dto/create-radiology-order.dto";
import { AddRadiologyResultDto } from "./dto/add-radiology-result.dto";

const genOrderNo = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const ORDER_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  requestedBy: { select: { firstName: true, lastName: true, specialization: true } },
  performedBy: { select: { firstName: true, lastName: true } },
  result: {
    include: {
      reportedBy: { select: { firstName: true, lastName: true } },
      verifiedBy: { select: { firstName: true, lastName: true } },
    },
  },
};

@Injectable()
export class RadiologyService {
  constructor(private prisma: PrismaService) {}

  async createOrder(dto: CreateRadiologyOrderDto, requestedById: string, organizationId: string) {
    return this.prisma.radiologyOrder.create({
      data: {
        orderNumber: `RAD-${genOrderNo()}`,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        modality: dto.modality as any,
        bodyPart: dto.bodyPart,
        priority: (dto.priority ?? "ROUTINE") as any,
        clinicalInfo: dto.clinicalInfo,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        requestedById,
        organizationId,
      },
      include: ORDER_INCLUDE,
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters: { status?: string; patientId?: string; modality?: string; priority?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      deletedAt: null as null,
      ...(filters.status && { status: filters.status as any }),
      ...(filters.patientId && { patientId: filters.patientId }),
      ...(filters.modality && { modality: filters.modality as any }),
      ...(filters.priority && { priority: filters.priority as any }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.radiologyOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          requestedBy: { select: { firstName: true, lastName: true } },
          result: { select: { id: true } },
        },
      }),
      this.prisma.radiologyOrder.count({ where }),
    ]);

    return { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string) {
    const order = await this.prisma.radiologyOrder.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException("Radiology order not found");
    return order;
  }

  async scheduleOrder(id: string, scheduledAt: string, organizationId: string) {
    const order = await this.assertOrder(id, organizationId);
    if (order.status === "CANCELLED") throw new BadRequestException("Order is cancelled");
    return this.prisma.radiologyOrder.update({
      where: { id },
      data: { status: "SCHEDULED", scheduledAt: new Date(scheduledAt) },
      include: ORDER_INCLUDE,
    });
  }

  async startScan(id: string, performedById: string, organizationId: string) {
    const order = await this.assertOrder(id, organizationId);
    if (!["PENDING", "SCHEDULED"].includes(order.status)) {
      throw new BadRequestException("Order cannot be started in its current status");
    }
    return this.prisma.radiologyOrder.update({
      where: { id },
      data: { status: "IN_PROGRESS", performedById },
      include: ORDER_INCLUDE,
    });
  }

  async addResult(id: string, dto: AddRadiologyResultDto, reportedById: string, organizationId: string) {
    const order = await this.assertOrder(id, organizationId);
    if (order.status === "CANCELLED") throw new BadRequestException("Order is cancelled");

    await this.prisma.$transaction([
      this.prisma.radiologyResult.upsert({
        where: { orderId: id },
        create: { orderId: id, reportedById, ...dto },
        update: { ...dto, reportedById },
      }),
      this.prisma.radiologyOrder.update({
        where: { id },
        data: { status: "COMPLETED", performedAt: new Date() },
      }),
    ]);

    return this.findOne(id, organizationId);
  }

  async verifyResult(id: string, verifiedById: string, organizationId: string) {
    const order = await this.assertOrder(id, organizationId);
    if (order.status !== "COMPLETED") throw new BadRequestException("Order has no result to verify");

    const result = await this.prisma.radiologyResult.findUnique({ where: { orderId: id } });
    if (!result) throw new NotFoundException("No result found for this order");
    if (result.reportedById === verifiedById) throw new ForbiddenException("Cannot verify your own report");

    await this.prisma.radiologyResult.update({
      where: { orderId: id },
      data: { verifiedById },
    });

    return this.findOne(id, organizationId);
  }

  async cancelOrder(id: string, organizationId: string) {
    const order = await this.assertOrder(id, organizationId);
    if (order.status === "COMPLETED") throw new BadRequestException("Completed orders cannot be cancelled");
    return this.prisma.radiologyOrder.update({
      where: { id },
      data: { status: "CANCELLED", deletedAt: new Date() },
      include: ORDER_INCLUDE,
    });
  }

  async getSummary(organizationId: string) {
    const [byStatus, byModality, completedToday] = await this.prisma.$transaction([
      this.prisma.radiologyOrder.groupBy({
        by: ["status"],
        where: { organizationId, deletedAt: null },
        _count: { id: true },
        orderBy: { status: "asc" },
      }),
      this.prisma.radiologyOrder.groupBy({
        by: ["modality"],
        where: { organizationId, deletedAt: null },
        _count: { id: true },
        orderBy: { modality: "asc" },
      }),
      this.prisma.radiologyOrder.count({
        where: {
          organizationId,
          status: "COMPLETED",
          performedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return { byStatus, byModality, completedToday };
  }

  private async assertOrder(id: string, organizationId: string) {
    const order = await this.prisma.radiologyOrder.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!order) throw new NotFoundException("Radiology order not found");
    return order;
  }
}
