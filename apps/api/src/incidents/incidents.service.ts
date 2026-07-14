import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateIncidentDto, UpdateIncidentDto } from "./dto/create-incident.dto";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

const INCLUDE = {
  reportedBy: { select: { id: true, firstName: true, lastName: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  department: { select: { id: true, name: true } },
} as const;

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateIncidentDto, reportedById: string, organizationId: string) {
    const incidentNumber = `INC-${genId()}`;
    return this.prisma.incidentReport.create({
      data: {
        incidentNumber,
        title: dto.title,
        description: dto.description,
        severity: dto.severity as any,
        incidentDate: new Date(dto.incidentDate),
        patientId: dto.patientId,
        departmentId: dto.departmentId,
        assignedToId: dto.assignedToId,
        reportedById,
        organizationId,
      },
      include: INCLUDE,
    });
  }

  async findAll(
    organizationId: string,
    status?: string,
    severity?: string,
    departmentId?: string,
  ) {
    return this.prisma.incidentReport.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as any } : {}),
        ...(severity ? { severity: severity as any } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: INCLUDE,
      orderBy: { incidentDate: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const item = await this.prisma.incidentReport.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!item) throw new NotFoundException("Incident not found");
    return item;
  }

  async update(id: string, dto: UpdateIncidentDto, organizationId: string) {
    const item = await this.prisma.incidentReport.findFirst({ where: { id, organizationId } });
    if (!item) throw new NotFoundException("Incident not found");

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;
    if (dto.rootCause !== undefined) data.rootCause = dto.rootCause;
    if (dto.correctiveAction !== undefined) data.correctiveAction = dto.correctiveAction;
    if (dto.status === "RESOLVED" || dto.status === "CLOSED") data.resolvedAt = new Date();

    return this.prisma.incidentReport.update({ where: { id }, data, include: INCLUDE });
  }

  async getSummary(organizationId: string) {
    const [open, underReview, resolved, critical, high] = await Promise.all([
      this.prisma.incidentReport.count({ where: { organizationId, status: "OPEN" } }),
      this.prisma.incidentReport.count({ where: { organizationId, status: "UNDER_REVIEW" } }),
      this.prisma.incidentReport.count({ where: { organizationId, status: "RESOLVED" } }),
      this.prisma.incidentReport.count({ where: { organizationId, severity: "CRITICAL" } }),
      this.prisma.incidentReport.count({ where: { organizationId, severity: "HIGH" } }),
    ]);

    return { open, underReview, resolved, critical, high };
  }
}
