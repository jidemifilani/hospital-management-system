import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, staffId: string, organizationId: string) {
    return this.prisma.patientAlert.create({
      data: {
        alertNumber: `ALT-${genId()}`,
        organizationId,
        patientId: data.patientId,
        type: data.type,
        severity: data.severity ?? "MODERATE",
        title: data.title,
        description: data.description ?? null,
        createdById: staffId,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findAll(q: any, organizationId: string) {
    const where: any = { organizationId };
    if (q.patientId) where.patientId = q.patientId;
    if (q.type) where.type = q.type;
    if (q.severity) where.severity = q.severity;
    if (q.active !== undefined) where.isActive = q.active === "true";
    else where.isActive = true;

    return this.prisma.patientAlert.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const alert = await this.prisma.patientAlert.findFirst({
      where: { id, organizationId },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!alert) throw new NotFoundException("Alert not found");
    return alert;
  }

  async resolve(id: string, staffId: string, data: any, organizationId: string) {
    const alert = await this.prisma.patientAlert.findFirst({ where: { id, organizationId } });
    if (!alert) throw new NotFoundException("Alert not found");

    return this.prisma.patientAlert.update({
      where: { id },
      data: {
        isActive: false,
        resolvedById: staffId,
        resolvedAt: new Date(),
        resolvedReason: data.reason ?? null,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async getSummary(organizationId: string) {
    const [total, active, critical, high, allergy, fallRisk, dnr, infection] = await Promise.all([
      this.prisma.patientAlert.count({ where: { organizationId } }),
      this.prisma.patientAlert.count({ where: { organizationId, isActive: true } }),
      this.prisma.patientAlert.count({ where: { organizationId, isActive: true, severity: "CRITICAL" } }),
      this.prisma.patientAlert.count({ where: { organizationId, isActive: true, severity: "HIGH" } }),
      this.prisma.patientAlert.count({ where: { organizationId, isActive: true, type: "ALLERGY" } }),
      this.prisma.patientAlert.count({ where: { organizationId, isActive: true, type: "FALL_RISK" } }),
      this.prisma.patientAlert.count({ where: { organizationId, isActive: true, type: "DNR" } }),
      this.prisma.patientAlert.count({ where: { organizationId, isActive: true, type: "INFECTION_CONTROL" } }),
    ]);
    return { total, active, critical, high, allergy, fallRisk, dnr, infection };
  }
}
