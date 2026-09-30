import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  async checkIn(data: any, organizationId: string) {
    // Checked here so an id that does not exist is a plain 404 rather than a
    // foreign-key violation surfacing as an opaque 500.
    const patient = await this.prisma.patient.findFirst({
      where: { id: data.patientId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException("No such patient to visit");

    return this.prisma.visitor.create({
      data: {
        visitorNumber: `VIS-${genId()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
        idType: data.idType ?? null,
        idNumber: data.idNumber ?? null,
        patientId: data.patientId,
        relationship: data.relationship ?? null,
        visitPurpose: data.visitPurpose ?? null,
        notes: data.notes ?? null,
        organizationId,
        status: "CHECKED_IN",
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
      },
    });
  }

  async findAll(organizationId: string, filters: { status?: string; patientId?: string; date?: string }) {
    const where: any = { organizationId };
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.date) {
      const d = new Date(filters.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.checkInTime = { gte: d, lt: next };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.checkInTime = { gte: today, lt: tomorrow };
    }

    return this.prisma.visitor.findMany({
      where,
      include: { patient: { select: { firstName: true, lastName: true, mrn: true } } },
      orderBy: { checkInTime: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.visitor.findFirst({
      where: { id, organizationId },
      include: { patient: { select: { firstName: true, lastName: true, mrn: true } } },
    });
    if (!record) throw new NotFoundException("Visitor record not found");
    return record;
  }

  async checkOut(id: string, organizationId: string) {
    const record = await this.findOne(id, organizationId);
    if (record.status !== "CHECKED_IN" && record.status !== "OVERSTAY") {
      throw new BadRequestException("Visitor is not currently checked in");
    }
    return this.prisma.visitor.update({
      where: { id },
      data: { status: "CHECKED_OUT", checkOutTime: new Date() },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
  }

  async flagOverstay(organizationId: string) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return this.prisma.visitor.updateMany({
      where: { organizationId, status: "CHECKED_IN", checkInTime: { lt: twoHoursAgo } },
      data: { status: "OVERSTAY" },
    });
  }

  async getSummary(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [currentlyIn, overstay, todayTotal] = await Promise.all([
      this.prisma.visitor.count({ where: { organizationId, status: "CHECKED_IN" } }),
      this.prisma.visitor.count({ where: { organizationId, status: "OVERSTAY" } }),
      this.prisma.visitor.count({ where: { organizationId, checkInTime: { gte: today, lt: tomorrow } } }),
    ]);

    return { currentlyIn, overstay, todayTotal };
  }
}
