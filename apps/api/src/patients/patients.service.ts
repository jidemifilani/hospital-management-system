import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";

const genMrn = customAlphabet("0123456789", 8);

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePatientDto, organizationId: string, createdById: string) {
    // Duplicate detection by phone
    const dupe = await this.prisma.patient.findFirst({
      where: { phone: dto.phone, organizationId, deletedAt: null },
    });
    if (dupe) {
      throw new ConflictException(
        `A patient with this phone number already exists (MRN: ${dupe.mrn})`,
      );
    }

    const mrn = `MRN${genMrn()}`;
    return this.prisma.patient.create({
      data: {
        ...dto,
        dateOfBirth: new Date(dto.dateOfBirth),
        mrn,
        organizationId,
        createdById,
      },
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      deletedAt: null as null,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { mrn: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          phone: true,
          email: true,
          bloodGroup: true,
          isActive: true,
          createdAt: true,
          _count: { select: { appointments: true } },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        appointments: {
          where: { deletedAt: null },
          orderBy: { scheduledAt: "desc" },
          take: 10,
          include: {
            doctor: { select: { firstName: true, lastName: true } },
            department: { select: { name: true } },
          },
        },
        consents: { orderBy: { grantedAt: "desc" }, take: 5 },
      },
    });
    if (!patient) throw new NotFoundException("Patient not found");
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, organizationId: string, updatedById: string) {
    await this.findOne(id, organizationId);
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        updatedById,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, mrn: true },
    });
  }

  async findByMrn(mrn: string, organizationId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { mrn, organizationId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException(`No patient with MRN ${mrn}`);
    return patient;
  }
}
