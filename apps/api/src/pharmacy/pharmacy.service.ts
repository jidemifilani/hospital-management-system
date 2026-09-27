import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { EncountersService } from "../encounters/encounters.service";
import { ClinicalSafetyService } from "../clinical-safety/clinical-safety.service";
import { CreatePrescriptionDto } from "./dto/create-prescription.dto";
import { CreateDrugItemDto } from "./dto/create-drug-item.dto";
import { RestockDrugDto } from "./dto/restock-drug.dto";

const genRxNo = customAlphabet("0123456789", 8);

const RX_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  prescribedBy: { select: { firstName: true, lastName: true, specialization: true } },
  dispensedBy: { select: { firstName: true, lastName: true } },
  items: {
    include: { drugItem: { select: { id: true, name: true, unit: true } } },
  },
};

@Injectable()
export class PharmacyService {
  constructor(
    private prisma: PrismaService,
    private encounters: EncountersService,
    private safety: ClinicalSafetyService,
    private events: EventEmitter2,
  ) {}

  // ── Prescriptions ──────────────────────────────────────────────────────────

  async createPrescription(
    dto: CreatePrescriptionDto & { acknowledgeWarnings?: boolean },
    staffId: string,
    organizationId: string,
  ) {
    const warnings = await this.safety.checkPrescription(
      dto.patientId,
      dto.items.map((i) => i.drugItemId),
      organizationId,
    );

    const blocking = warnings.filter((w) => w.severity === "CRITICAL");
    if (blocking.length > 0 && !dto.acknowledgeWarnings) {
      throw new BadRequestException({
        message: "Prescription blocked by a clinical safety check",
        warnings,
        hint: "Resend with acknowledgeWarnings: true to override and record the decision.",
      });
    }

    for (const w of blocking) {
      this.events.emit("safety.allergyDetected", {
        patientId: dto.patientId,
        organizationId,
        drugName: w.subject,
        allergen: w.allergen ?? w.subject,
        staffId,
      });
    }

    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, organizationId },
      select: { departmentId: true },
    });

    const encounterId = staff
      ? (
          await this.encounters.openForPatient(dto.patientId, organizationId, {
            departmentId: staff.departmentId,
            createdById: staffId,
          })
        ).id
      : null;

    return this.prisma.prescription.create({
      data: {
        prescriptionNo: `RX-${genRxNo()}`,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        encounterId,
        prescribedById: staffId,
        notes: dto.notes,
        organizationId,
        items: {
          create: dto.items.map((i) => ({
            drugItemId: i.drugItemId,
            dosage: i.dosage,
            frequency: i.frequency,
            duration: i.duration,
            quantity: i.quantity,
            instructions: i.instructions,
          })),
        },
      },
      include: RX_INCLUDE,
    });
  }

  async findPrescriptions(
    organizationId: string,
    page = 1,
    limit = 20,
    filters: { status?: string; patientId?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      deletedAt: null as null,
      ...(filters.status && { status: filters.status as any }),
      ...(filters.patientId && { patientId: filters.patientId }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.prescription.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          prescribedBy: { select: { firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);
    return { data: items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOnePrescription(id: string, organizationId: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: RX_INCLUDE,
    });
    if (!rx) throw new NotFoundException("Prescription not found");
    return rx;
  }

  async dispensePrescription(id: string, staffId: string, organizationId: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { items: { include: { drugItem: true } } },
    });
    if (!rx) throw new NotFoundException("Prescription not found");
    if (rx.status === "DISPENSED" || rx.status === "CANCELLED") {
      throw new BadRequestException(`Prescription is already ${rx.status.toLowerCase()}`);
    }

    // Deduct stock first-expiry-first-out, so short-dated batches move first.
    await this.prisma.$transaction(async (tx) => {
      for (const item of rx.items) {
        const batches = await tx.drugStock.findMany({
          where: {
            drugItemId: item.drugItemId,
            quantity: { gt: 0 },
            expiresAt: { gt: new Date() },
          },
          orderBy: { expiresAt: "asc" },
        });

        const available = batches.reduce((sum, b) => sum + b.quantity, 0);
        if (available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${item.drugItem.name}: need ${item.quantity}, have ${available}`,
          );
        }

        let remaining = item.quantity;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(batch.quantity, remaining);
          await tx.drugStock.update({
            where: { id: batch.id },
            data: { quantity: { decrement: take } },
          });
          remaining -= take;
        }

        await tx.prescriptionItem.update({
          where: { id: item.id },
          data: { dispensedQty: item.quantity },
        });
      }

      await tx.prescription.update({
        where: { id },
        data: { status: "DISPENSED", dispensedById: staffId, dispensedAt: new Date() },
      });
    });

    this.events.emit("pharmacy.dispensed", {
      prescriptionId: id,
      encounterId: rx.encounterId,
      organizationId,
      dispensedById: staffId,
      items: rx.items.map((i) => ({
        id: i.id,
        name: i.drugItem.name,
        quantity: i.quantity,
        unitPrice: i.drugItem.sellingPrice.toString(),
      })),
    });

    return this.findOnePrescription(id, organizationId);
  }

  // ── Drug Inventory ─────────────────────────────────────────────────────────

  async getDrugItems(organizationId: string, search?: string) {
    return this.prisma.drugItem.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { genericName: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        stock: {
          where: { quantity: { gt: 0 }, expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async createDrugItem(dto: CreateDrugItemDto, organizationId: string) {
    const existing = await this.prisma.drugItem.findFirst({
      where: { code: dto.code, organizationId },
    });
    if (existing) throw new ConflictException(`Drug with code "${dto.code}" already exists`);

    return this.prisma.drugItem.create({
      data: { ...dto, organizationId, sellingPrice: dto.sellingPrice },
    });
  }

  async restockDrug(drugItemId: string, dto: RestockDrugDto, organizationId: string) {
    const drug = await this.prisma.drugItem.findFirst({ where: { id: drugItemId, organizationId } });
    if (!drug) throw new NotFoundException("Drug not found");

    return this.prisma.drugStock.create({
      data: {
        drugItemId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        expiresAt: new Date(dto.expiresAt),
        supplierName: dto.supplierName,
        costPerUnit: dto.costPerUnit,
        organizationId,
      },
    });
  }

  async getDrugCatalogue(organizationId: string, search?: string) {
    return this.prisma.drugItem.findMany({
      where: {
        organizationId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { genericName: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        stock: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "asc" },
        },
        _count: { select: { prescItems: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async getLowStockAlert(organizationId: string) {
    const drugs = await this.prisma.drugItem.findMany({
      where: { organizationId, isActive: true },
      include: {
        stock: {
          where: { expiresAt: { gt: new Date() } },
          select: { quantity: true },
        },
      },
    });

    return drugs
      .map((d) => ({
        ...d,
        totalStock: d.stock.reduce((s, b) => s + b.quantity, 0),
      }))
      .filter((d) => d.totalStock <= d.reorderLevel)
      .map(({ stock: _s, ...rest }) => rest)
      .sort((a, b) => a.totalStock - b.totalStock);
  }
}
