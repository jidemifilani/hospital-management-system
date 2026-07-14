import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BedsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, ward?: string, departmentId?: string) {
    const where = {
      department: { organizationId },
      ...(ward && { ward }),
      ...(departmentId && { departmentId }),
    };

    return this.prisma.bed.findMany({
      where,
      orderBy: [{ ward: "asc" }, { bedNumber: "asc" }],
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  }

  async getOccupancySummary(organizationId: string) {
    const [total, occupied, byWard] = await Promise.all([
      this.prisma.bed.count({ where: { department: { organizationId } } }),
      this.prisma.bed.count({ where: { department: { organizationId }, isOccupied: true } }),
      this.prisma.bed.groupBy({
        by: ["ward"],
        where: { department: { organizationId } },
        _count: { _all: true },
      }),
    ]);

    const occupiedByWard = await this.prisma.bed.groupBy({
      by: ["ward"],
      where: { department: { organizationId }, isOccupied: true },
      _count: { _all: true },
    });

    const occupiedMap = Object.fromEntries(occupiedByWard.map((b) => [b.ward, b._count._all]));

    return {
      total,
      occupied,
      available: total - occupied,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      byWard: byWard.map((w) => ({
        ward: w.ward,
        total: w._count._all,
        occupied: occupiedMap[w.ward] ?? 0,
        available: w._count._all - (occupiedMap[w.ward] ?? 0),
      })),
    };
  }

  async create(data: { bedNumber: string; ward: string; departmentId: string; notes?: string }, organizationId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id: data.departmentId, organizationId },
    });
    if (!dept) throw new NotFoundException("Department not found");

    return this.prisma.bed.create({
      data: { ...data },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async admit(id: string, patientId: string, organizationId: string) {
    const bed = await this.prisma.bed.findFirst({
      where: { id, department: { organizationId } },
    });
    if (!bed) throw new NotFoundException("Bed not found");
    if (bed.isOccupied) throw new BadRequestException("Bed is already occupied");

    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId } });
    if (!patient) throw new NotFoundException("Patient not found");

    return this.prisma.bed.update({
      where: { id },
      data: { isOccupied: true, patientId, admittedAt: new Date() },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async discharge(id: string, organizationId: string) {
    const bed = await this.prisma.bed.findFirst({
      where: { id, department: { organizationId } },
    });
    if (!bed) throw new NotFoundException("Bed not found");
    if (!bed.isOccupied) throw new BadRequestException("Bed is already vacant");

    return this.prisma.bed.update({
      where: { id },
      data: { isOccupied: false, patientId: null, admittedAt: null },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async transfer(fromBedId: string, targetBedId: string, organizationId: string) {
    const [from, target] = await Promise.all([
      this.prisma.bed.findFirst({ where: { id: fromBedId, department: { organizationId } } }),
      this.prisma.bed.findFirst({ where: { id: targetBedId, department: { organizationId } } }),
    ]);
    if (!from) throw new NotFoundException("Source bed not found");
    if (!target) throw new NotFoundException("Target bed not found");
    if (!from.isOccupied || !from.patientId) throw new BadRequestException("Source bed is not occupied");
    if (target.isOccupied) throw new BadRequestException("Target bed is already occupied");

    const { patientId, admittedAt } = from;
    await this.prisma.$transaction([
      this.prisma.bed.update({ where: { id: fromBedId }, data: { isOccupied: false, patientId: null, admittedAt: null } }),
      this.prisma.bed.update({ where: { id: targetBedId }, data: { isOccupied: true, patientId, admittedAt } }),
    ]);

    return this.prisma.bed.findUnique({
      where: { id: targetBedId },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, organizationId: string) {
    const bed = await this.prisma.bed.findFirst({
      where: { id, department: { organizationId } },
    });
    if (!bed) throw new NotFoundException("Bed not found");
    if (bed.isOccupied) throw new BadRequestException("Cannot delete an occupied bed");
    return this.prisma.bed.delete({ where: { id } });
  }
}
