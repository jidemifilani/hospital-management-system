import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReferralDto } from "./dto/create-referral.dto";

const genRef = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const REF_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  referredBy: { select: { firstName: true, lastName: true, specialization: true } },
  toStaff: { select: { firstName: true, lastName: true, specialization: true } },
  toDepartment: { select: { id: true, name: true } },
};

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReferralDto, referredById: string, organizationId: string) {
    if (dto.type === "INTERNAL" && !dto.toStaffId && !dto.toDepartmentId) {
      throw new BadRequestException("Internal referrals require a target doctor or department");
    }
    if (dto.type === "EXTERNAL" && !dto.toFacility) {
      throw new BadRequestException("External referrals require a facility name");
    }

    return this.prisma.referral.create({
      data: {
        referralNumber: `REF-${genRef()}`,
        patientId: dto.patientId,
        referredById,
        toStaffId: dto.toStaffId,
        toDepartmentId: dto.toDepartmentId,
        toFacility: dto.toFacility,
        type: dto.type as any,
        urgency: (dto.urgency ?? "ROUTINE") as any,
        reason: dto.reason,
        notes: dto.notes,
        appointmentId: dto.appointmentId,
        organizationId,
      },
      include: REF_INCLUDE,
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters: { status?: string; patientId?: string; type?: string; referredById?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      ...(filters.status && { status: filters.status as any }),
      ...(filters.patientId && { patientId: filters.patientId }),
      ...(filters.type && { type: filters.type as any }),
      ...(filters.referredById && { referredById: filters.referredById }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.referral.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: REF_INCLUDE,
      }),
      this.prisma.referral.count({ where }),
    ]);

    return { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string) {
    const ref = await this.prisma.referral.findFirst({
      where: { id, organizationId },
      include: REF_INCLUDE,
    });
    if (!ref) throw new NotFoundException("Referral not found");
    return ref;
  }

  async updateStatus(id: string, status: string, organizationId: string) {
    const ref = await this.prisma.referral.findFirst({ where: { id, organizationId } });
    if (!ref) throw new NotFoundException("Referral not found");
    if (ref.status === "CANCELLED" || ref.status === "COMPLETED") {
      throw new BadRequestException("Cannot update a completed or cancelled referral");
    }
    return this.prisma.referral.update({
      where: { id },
      data: { status: status as any },
      include: REF_INCLUDE,
    });
  }

  async getSummary(organizationId: string) {
    const [byStatus, byType, urgent] = await this.prisma.$transaction([
      this.prisma.referral.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { id: true },
        orderBy: { status: "asc" },
      }),
      this.prisma.referral.groupBy({
        by: ["type"],
        where: { organizationId },
        _count: { id: true },
        orderBy: { type: "asc" },
      }),
      this.prisma.referral.count({
        where: { organizationId, status: "PENDING", urgency: { in: ["URGENT", "EMERGENCY"] } },
      }),
    ]);
    return { byStatus, byType, urgentPending: urgent };
  }
}
