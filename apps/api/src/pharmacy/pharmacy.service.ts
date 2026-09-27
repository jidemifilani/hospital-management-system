import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { EncountersService } from "../encounters/encounters.service";
import { InventoryService } from "../inventory/inventory.service";
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
    private inventory: InventoryService,
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

    // Stock now lives in inventory, which owns FEFO and expiry. Pharmacy keeps
    // the clinical decision; inventory keeps the shelf.
    const pharmacy = await this.pharmacyLocation(organizationId);

    for (const item of rx.items) {
      await this.inventory.issue(
        {
          itemId: item.drugItemId,
          locationId: pharmacy.id,
          quantity: item.quantity,
          type: "CONSUMPTION",
          reason: `Dispensed on ${rx.prescriptionNo}`,
          sourceType: "PRESCRIPTION",
          sourceId: rx.id,
        },
        organizationId,
        staffId,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of rx.items) {
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
        unitPrice: (i.drugItem.sellingPrice?.toString() ?? "0"),
      })),
    });

    return this.findOnePrescription(id, organizationId);
  }

  // ── Drug Inventory ─────────────────────────────────────────────────────────

  async getDrugItems(organizationId: string, search?: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        organizationId,
        isActive: true,
        category: "DRUG",
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { genericName: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        batches: {
          where: { quantity: { gt: 0 }, expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async createDrugItem(dto: CreateDrugItemDto, organizationId: string) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { code: dto.code, organizationId },
    });
    if (existing) throw new ConflictException(`Drug with code "${dto.code}" already exists`);

    // Drugs are batch-tracked inventory: the category is fixed and expiry is
    // mandatory, which is what keeps FEFO honest.
    const { category: _freeText, ...rest } = dto;
    return this.prisma.inventoryItem.create({
      data: {
        ...rest,
        category: "DRUG",
        requiresBatch: true,
        sellingPrice: dto.sellingPrice,
        organizationId,
      },
    });
  }

  async restockDrug(drugItemId: string, dto: RestockDrugDto, organizationId: string, staffId?: string | null) {
    const drug = await this.prisma.inventoryItem.findFirst({
      where: { id: drugItemId, organizationId },
    });
    if (!drug) throw new NotFoundException("Drug not found");

    const pharmacy = await this.pharmacyLocation(organizationId);

    // Goes through inventory so the receipt is recorded as a stock move and
    // reaches the ledger, rather than quietly appearing on a shelf.
    return this.inventory.receive(
      {
        itemId: drugItemId,
        locationId: pharmacy.id,
        quantity: dto.quantity,
        unitCost: dto.costPerUnit,
        batchNumber: dto.batchNumber,
        expiresAt: dto.expiresAt,
        supplierName: dto.supplierName,
      },
      organizationId,
      staffId,
    );
  }

  /** Drugs live in the pharmacy store; created on first use. */
  private async pharmacyLocation(organizationId: string) {
    const existing = await this.prisma.stockLocation.findUnique({
      where: { code_organizationId: { code: "PHARMACY", organizationId } },
    });
    if (existing) return existing;

    return this.prisma.stockLocation.create({
      data: {
        code: "PHARMACY",
        name: "Pharmacy Store",
        type: "PHARMACY",
        organizationId,
      },
    });
  }

  async getDrugCatalogue(organizationId: string, search?: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        organizationId,
        category: "DRUG",
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { genericName: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
                      ],
        }),
      },
      include: {
        batches: {
          where: { quantity: { gt: 0 }, expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "asc" },
        },
        _count: { select: { prescItems: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async getLowStockAlert(organizationId: string) {
    const drugs = await this.prisma.inventoryItem.findMany({
      where: { organizationId, isActive: true, category: "DRUG" },
      include: {
        batches: {
          where: { quantity: { gt: 0 }, expiresAt: { gt: new Date() } },
          select: { quantity: true },
        },
      },
    });

    return drugs
      .map((d) => ({
        ...d,
        totalStock: d.batches.reduce((s, b) => s + b.quantity, 0),
      }))
      .filter((d) => d.totalStock <= d.reorderLevel)
      .map(({ batches: _b, ...rest }) => rest)
      .sort((a, b) => a.totalStock - b.totalStock);
  }
}
