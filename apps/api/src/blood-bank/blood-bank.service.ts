import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genUnit = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);
const genDonor = customAlphabet("0123456789", 6);
const genReq = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

const PATIENT_SEL = { id: true, firstName: true, lastName: true, mrn: true };
const STAFF_SEL = { id: true, firstName: true, lastName: true };
const DONOR_SEL = { id: true, donorNumber: true, firstName: true, lastName: true, bloodGroup: true, phone: true };

@Injectable()
export class BloodBankService {
  constructor(private prisma: PrismaService) {}

  // ── Inventory ──────────────────────────────────────────────────────────────

  async getInventory(organizationId: string, bloodGroup?: string, status?: string) {
    return this.prisma.bloodUnit.findMany({
      where: {
        organizationId,
        ...(bloodGroup ? { bloodGroup: bloodGroup as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: { donor: { select: DONOR_SEL } },
      orderBy: { expiresAt: "asc" },
    });
  }

  async addUnit(data: {
    bloodGroup: string; volume?: number; donorId?: string;
    collectedAt: string; expiresAt: string; notes?: string;
  }, organizationId: string) {
    return this.prisma.bloodUnit.create({
      data: {
        unitNumber: `BU-${genUnit()}`,
        bloodGroup: data.bloodGroup as any,
        volume: data.volume ?? 450,
        donorId: data.donorId,
        collectedAt: new Date(data.collectedAt),
        expiresAt: new Date(data.expiresAt),
        notes: data.notes,
        organizationId,
      },
      include: { donor: { select: DONOR_SEL } },
    });
  }

  async discardUnit(id: string, organizationId: string) {
    const unit = await this.prisma.bloodUnit.findFirst({ where: { id, organizationId } });
    if (!unit) throw new NotFoundException("Blood unit not found");
    if (unit.status === "ISSUED") throw new BadRequestException("Cannot discard an issued unit");
    return this.prisma.bloodUnit.update({ where: { id }, data: { status: "DISCARDED" } });
  }

  async getInventorySummary(organizationId: string) {
    const groups = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"];
    const counts = await Promise.all(
      groups.map((g) =>
        this.prisma.bloodUnit.count({ where: { organizationId, bloodGroup: g as any, status: "AVAILABLE" } }).then((count) => ({ group: g, count }))
      )
    );
    const expiringSoon = await this.prisma.bloodUnit.count({
      where: { organizationId, status: "AVAILABLE", expiresAt: { lte: new Date(Date.now() + 7 * 86400000) } },
    });
    return { byGroup: counts, expiringSoon, total: counts.reduce((s, c) => s + c.count, 0) };
  }

  // ── Donors ─────────────────────────────────────────────────────────────────

  async getDonors(organizationId: string, search?: string) {
    return this.prisma.bloodDonor.findMany({
      where: {
        organizationId,
        ...(search ? { OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { donorNumber: { contains: search, mode: "insensitive" } },
        ]} : {}),
      },
      include: { _count: { select: { units: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async addDonor(data: {
    firstName: string; lastName: string; bloodGroup: string;
    phone: string; email?: string; dateOfBirth?: string;
  }, organizationId: string) {
    return this.prisma.bloodDonor.create({
      data: {
        donorNumber: `D-${genDonor()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        bloodGroup: data.bloodGroup as any,
        phone: data.phone,
        email: data.email,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        organizationId,
      },
    });
  }

  // ── Requests ───────────────────────────────────────────────────────────────

  async getRequests(organizationId: string, status?: string) {
    return this.prisma.bloodRequest.findMany({
      where: { organizationId, ...(status ? { status: status as any } : {}) },
      include: {
        patient: { select: PATIENT_SEL },
        requestedBy: { select: STAFF_SEL },
        bloodUnits: { select: { id: true, unitNumber: true, bloodGroup: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createRequest(data: {
    patientId: string; bloodGroup: string; units: number;
    urgency?: string; clinicalReason?: string;
  }, requestedById: string, organizationId: string) {
    return this.prisma.bloodRequest.create({
      data: {
        requestNumber: `BR-${genReq()}`,
        patientId: data.patientId,
        bloodGroup: data.bloodGroup as any,
        units: data.units,
        urgency: (data.urgency as any) ?? "ROUTINE",
        clinicalReason: data.clinicalReason,
        requestedById,
        organizationId,
      },
      include: { patient: { select: PATIENT_SEL }, requestedBy: { select: STAFF_SEL } },
    });
  }

  async issueBlood(requestId: string, unitIds: string[], organizationId: string) {
    const request = await this.prisma.bloodRequest.findFirst({ where: { id: requestId, organizationId } });
    if (!request) throw new NotFoundException("Blood request not found");

    const units = await this.prisma.bloodUnit.findMany({ where: { id: { in: unitIds }, organizationId, status: "AVAILABLE" } });
    if (units.length !== unitIds.length) throw new BadRequestException("Some units are not available");

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.bloodUnit.updateMany({
        where: { id: { in: unitIds } },
        data: { status: "ISSUED", issuedToId: requestId, issuedAt: now },
      }),
      this.prisma.bloodRequest.update({
        where: { id: requestId },
        data: { status: "ISSUED", issuedAt: now },
      }),
    ]);

    return this.prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: { patient: { select: PATIENT_SEL }, bloodUnits: true },
    });
  }

  async updateRequestStatus(id: string, status: string, organizationId: string) {
    const request = await this.prisma.bloodRequest.findFirst({ where: { id, organizationId } });
    if (!request) throw new NotFoundException("Blood request not found");
    const data: any = { status };
    if (status === "CROSSMATCH") data.crossmatchedAt = new Date();
    if (status === "APPROVED") data.approvedAt = new Date();
    return this.prisma.bloodRequest.update({ where: { id }, data });
  }
}
