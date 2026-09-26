import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma, ChargeSource, ServiceCategory } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";

const genInvoiceNo = customAlphabet("0123456789", 8);

export interface PostChargeInput {
  encounterId: string;
  organizationId: string;
  source: ChargeSource;
  /** Natural key of the originating record. Makes posting idempotent. */
  sourceRef?: string | null;
  serviceItemId?: string | null;
  serviceItemCode?: string | null;
  description?: string;
  category?: ServiceCategory;
  quantity?: number;
  /** Overrides catalogue pricing — used for drugs, which carry their own price. */
  unitPrice?: number | Decimal;
  createdById?: string | null;
  incurredAt?: Date;
}

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Posts a billable event onto an encounter.
   *
   * Safe to call repeatedly: the (source, sourceRef) unique index means a repeated
   * call for the same originating record returns the existing charge rather than
   * duplicating it. Returns null when the encounter is flagged non-billable.
   */
  async post(input: PostChargeInput) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: input.encounterId, organizationId: input.organizationId, deletedAt: null },
      select: {
        id: true,
        isBillable: true,
        patientId: true,
        patient: { select: { nhisNumber: true, hmoProvider: true } },
      },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    if (!encounter.isBillable) return null;

    const item = await this.resolveServiceItem(input);

    const unitPrice =
      input.unitPrice !== undefined
        ? new Decimal(input.unitPrice)
        : item
          ? this.priceFor(item, encounter.patient)
          : null;

    if (unitPrice === null) {
      throw new BadRequestException(
        "Cannot price this charge — supply a serviceItem or an explicit unitPrice",
      );
    }

    const description = input.description ?? item?.name;
    const category = input.category ?? item?.category;
    if (!description || !category) {
      throw new BadRequestException("Charge needs a description and category");
    }

    const quantity = input.quantity ?? 1;

    try {
      return await this.prisma.charge.create({
        data: {
          encounterId: encounter.id,
          patientId: encounter.patientId,
          serviceItemId: item?.id ?? null,
          description,
          category,
          source: input.source,
          sourceRef: input.sourceRef ?? null,
          quantity,
          unitPrice,
          total: unitPrice.mul(quantity),
          incurredAt: input.incurredAt ?? new Date(),
          createdById: input.createdById ?? null,
          organizationId: input.organizationId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        this.logger.debug(`Charge already posted for ${input.source}:${input.sourceRef} — skipping`);
        return this.prisma.charge.findFirst({
          where: { source: input.source, sourceRef: input.sourceRef ?? null },
        });
      }
      throw err;
    }
  }

  private async resolveServiceItem(input: PostChargeInput) {
    if (input.serviceItemId) {
      return this.prisma.serviceItem.findFirst({
        where: { id: input.serviceItemId, organizationId: input.organizationId },
      });
    }
    if (input.serviceItemCode) {
      return this.prisma.serviceItem.findUnique({
        where: {
          code_organizationId: {
            code: input.serviceItemCode,
            organizationId: input.organizationId,
          },
        },
      });
    }
    return null;
  }

  /** NHIS and HMO patients are billed at their scheme's tariff where one exists. */
  private priceFor(
    item: { unitPrice: Decimal; nhisPrice: Decimal | null; hmoPrice: Decimal | null },
    patient: { nhisNumber: string | null; hmoProvider: string | null },
  ): Decimal {
    if (patient.nhisNumber && item.nhisPrice !== null) return item.nhisPrice;
    if (patient.hmoProvider && item.hmoPrice !== null) return item.hmoPrice;
    return item.unitPrice;
  }

  async listForEncounter(encounterId: string, organizationId: string) {
    return this.prisma.charge.findMany({
      where: { encounterId, organizationId },
      orderBy: { incurredAt: "asc" },
      include: { serviceItem: { select: { code: true, name: true, unit: true } } },
    });
  }

  /** Running bill for an encounter, grouped by category. */
  async statement(encounterId: string, organizationId: string) {
    const charges = await this.listForEncounter(encounterId, organizationId);
    const live = charges.filter((c) => !c.isVoided);

    const byCategory = new Map<string, { category: string; count: number; total: Decimal }>();
    for (const c of live) {
      const row = byCategory.get(c.category) ?? {
        category: c.category,
        count: 0,
        total: new Decimal(0),
      };
      row.count += 1;
      row.total = row.total.add(c.total);
      byCategory.set(c.category, row);
    }

    const sum = (list: typeof live) =>
      list.reduce((acc, c) => acc.add(c.total), new Decimal(0));

    return {
      encounterId,
      charges,
      byCategory: [...byCategory.values()],
      totals: {
        gross: sum(live),
        billed: sum(live.filter((c) => c.isBilled)),
        unbilled: sum(live.filter((c) => !c.isBilled)),
        voided: sum(charges.filter((c) => c.isVoided)),
      },
    };
  }

  async void(id: string, reason: string, organizationId: string) {
    const charge = await this.prisma.charge.findFirst({ where: { id, organizationId } });
    if (!charge) throw new NotFoundException("Charge not found");
    if (charge.isBilled) throw new BadRequestException("Cannot void a charge already on an invoice");
    if (charge.isVoided) return charge;

    return this.prisma.charge.update({
      where: { id },
      data: { isVoided: true, voidReason: reason },
    });
  }

  /**
   * Sweeps every unbilled charge on an encounter into a single draft invoice.
   * This is what turns the running ledger into something a cashier can collect on.
   */
  async rollIntoInvoice(encounterId: string, organizationId: string, createdById: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, organizationId, deletedAt: null },
      select: { id: true, patientId: true, appointmentId: true, encounterNumber: true },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");

    const pending = await this.prisma.charge.findMany({
      where: { encounterId, organizationId, isBilled: false, isVoided: false },
      orderBy: { incurredAt: "asc" },
    });
    if (pending.length === 0) {
      throw new BadRequestException("No unbilled charges on this encounter");
    }

    const subtotal = pending.reduce((acc, c) => acc.add(c.total), new Decimal(0));

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${genInvoiceNo()}`,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          appointmentId: encounter.appointmentId,
          subtotal,
          total: subtotal,
          status: "DRAFT",
          notes: `Auto-generated from encounter ${encounter.encounterNumber}`,
          createdById,
          organizationId,
          items: {
            create: pending.map((c) => ({
              description: c.description,
              category: c.category,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              total: c.total,
            })),
          },
        },
        include: { items: true },
      });

      await tx.charge.updateMany({
        where: { id: { in: pending.map((c) => c.id) } },
        data: { isBilled: true, invoiceId: invoice.id },
      });

      return invoice;
    });
  }
}
