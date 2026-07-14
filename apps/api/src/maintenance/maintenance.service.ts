import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, staffId: string, organizationId: string) {
    return this.prisma.maintenanceRequest.create({
      data: {
        requestNumber: `REQ-${genId()}`,
        organizationId,
        type: data.type,
        priority: data.priority ?? "MEDIUM",
        location: data.location,
        description: data.description,
        requestedById: staffId,
      },
      include: {
        requestedBy: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findAll(q: any, organizationId: string) {
    const where: any = { organizationId };
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;
    if (q.priority) where.priority = q.priority;

    return this.prisma.maintenanceRequest.findMany({
      where,
      include: {
        requestedBy: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const req = await this.prisma.maintenanceRequest.findFirst({
      where: { id, organizationId },
      include: {
        requestedBy: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });
    if (!req) throw new NotFoundException("Maintenance request not found");
    return req;
  }

  async assign(id: string, staffId: string, organizationId: string) {
    const req = await this.prisma.maintenanceRequest.findFirst({ where: { id, organizationId } });
    if (!req) throw new NotFoundException("Maintenance request not found");

    return this.prisma.maintenanceRequest.update({
      where: { id },
      data: { assignedToId: staffId, status: "ASSIGNED" },
      include: {
        requestedBy: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async updateStatus(id: string, data: any, organizationId: string) {
    const req = await this.prisma.maintenanceRequest.findFirst({ where: { id, organizationId } });
    if (!req) throw new NotFoundException("Maintenance request not found");

    const updateData: any = { status: data.status };
    if (data.status === "COMPLETED") {
      updateData.resolvedAt = new Date();
      updateData.resolutionNotes = data.resolutionNotes ?? null;
    }

    return this.prisma.maintenanceRequest.update({
      where: { id },
      data: updateData,
      include: {
        requestedBy: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async getSummary(organizationId: string) {
    const [open, assigned, inProgress, completed, cancelled, urgent] = await Promise.all([
      this.prisma.maintenanceRequest.count({ where: { organizationId, status: "OPEN" } }),
      this.prisma.maintenanceRequest.count({ where: { organizationId, status: "ASSIGNED" } }),
      this.prisma.maintenanceRequest.count({ where: { organizationId, status: "IN_PROGRESS" } }),
      this.prisma.maintenanceRequest.count({ where: { organizationId, status: "COMPLETED" } }),
      this.prisma.maintenanceRequest.count({ where: { organizationId, status: "CANCELLED" } }),
      this.prisma.maintenanceRequest.count({ where: { organizationId, status: { not: "COMPLETED" }, priority: "URGENT" } }),
    ]);
    return { open, assigned, inProgress, completed, cancelled, urgent, total: open + assigned + inProgress };
  }
}
