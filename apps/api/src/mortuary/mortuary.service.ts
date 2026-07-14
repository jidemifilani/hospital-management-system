import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genNum = customAlphabet("0123456789", 6);

const INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  admittedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class MortuaryService {
  constructor(private prisma: PrismaService) {}

  async admit(data: {
    deceasedName: string; deathDate: string; causeOfDeath?: string;
    patientId?: string; storageUnit?: string; nextOfKinName: string;
    nextOfKinPhone: string; nextOfKinRelation?: string;
  }, admittedById: string | undefined, organizationId: string) {
    return this.prisma.mortuaryRecord.create({
      data: {
        recordNumber: `MOR-${genNum()}`,
        deceasedName: data.deceasedName,
        deathDate: new Date(data.deathDate),
        causeOfDeath: data.causeOfDeath,
        patientId: data.patientId,
        storageUnit: data.storageUnit,
        nextOfKinName: data.nextOfKinName,
        nextOfKinPhone: data.nextOfKinPhone,
        nextOfKinRelation: data.nextOfKinRelation,
        admittedById,
        organizationId,
      },
      include: INCLUDE,
    });
  }

  async findAll(organizationId: string, status?: string) {
    return this.prisma.mortuaryRecord.findMany({
      where: { organizationId, ...(status ? { status: status as any } : {}) },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.mortuaryRecord.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!record) throw new NotFoundException("Record not found");
    return record;
  }

  async release(id: string, data: { releasedTo: string; releaseNotes?: string }, organizationId: string) {
    const record = await this.prisma.mortuaryRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException("Record not found");
    return this.prisma.mortuaryRecord.update({
      where: { id },
      data: { status: "RELEASED", releasedAt: new Date(), releasedTo: data.releasedTo, releaseNotes: data.releaseNotes },
      include: INCLUDE,
    });
  }

  async updateStorageUnit(id: string, storageUnit: string, organizationId: string) {
    const record = await this.prisma.mortuaryRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException("Record not found");
    return this.prisma.mortuaryRecord.update({ where: { id }, data: { storageUnit }, include: INCLUDE });
  }

  async getSummary(organizationId: string) {
    const [admitted, released, transferred] = await Promise.all([
      this.prisma.mortuaryRecord.count({ where: { organizationId, status: "ADMITTED" } }),
      this.prisma.mortuaryRecord.count({ where: { organizationId, status: "RELEASED" } }),
      this.prisma.mortuaryRecord.count({ where: { organizationId, status: "TRANSFERRED" } }),
    ]);
    return { admitted, released, transferred };
  }
}
