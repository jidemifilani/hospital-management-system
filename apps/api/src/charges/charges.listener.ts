import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { ChargesService } from "./charges.service";

/**
 * Turns clinical activity into money owed, without anyone having to remember.
 *
 * Every handler swallows its own errors: a pricing problem must never roll back
 * the clinical action that triggered it. Failures are logged for the billing team.
 */
@Injectable()
export class ChargesListener {
  private readonly logger = new Logger(ChargesListener.name);

  constructor(
    private charges: ChargesService,
    private prisma: PrismaService,
  ) {}

  private async safely(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (err) {
      this.logger.error(`Auto-charge failed (${label})`, err instanceof Error ? err.stack : err);
    }
  }

  @OnEvent("encounter.started")
  async onEncounterStarted(e: {
    encounterId: string;
    organizationId: string;
    departmentId: string;
    createdById?: string | null;
  }) {
    await this.safely("encounter.started", async () => {
      const dept = await this.prisma.department.findUnique({
        where: { id: e.departmentId },
        select: { consultationServiceItemId: true },
      });
      if (!dept?.consultationServiceItemId) return;

      await this.charges.post({
        encounterId: e.encounterId,
        organizationId: e.organizationId,
        source: "CONSULTATION",
        sourceRef: e.encounterId,
        serviceItemId: dept.consultationServiceItemId,
        createdById: e.createdById ?? null,
      });
    });
  }

  @OnEvent("lab.ordered")
  async onLabOrdered(e: {
    labOrderId: string;
    encounterId?: string | null;
    organizationId: string;
    requestedById?: string | null;
    items: { id: string; serviceItemId?: string | null; testName: string }[];
  }) {
    if (!e.encounterId) return;
    await this.safely("lab.ordered", async () => {
      for (const item of e.items) {
        if (!item.serviceItemId) continue;
        await this.charges.post({
          encounterId: e.encounterId!,
          organizationId: e.organizationId,
          source: "LAB_ORDER",
          sourceRef: `${e.labOrderId}:${item.id}`,
          serviceItemId: item.serviceItemId,
          description: item.testName,
          createdById: e.requestedById ?? null,
        });
      }
    });
  }

  @OnEvent("radiology.ordered")
  async onRadiologyOrdered(e: {
    radiologyOrderId: string;
    encounterId?: string | null;
    organizationId: string;
    serviceItemId?: string | null;
    description?: string;
    requestedById?: string | null;
  }) {
    if (!e.encounterId || !e.serviceItemId) return;
    await this.safely("radiology.ordered", () =>
      this.charges.post({
        encounterId: e.encounterId!,
        organizationId: e.organizationId,
        source: "RADIOLOGY_ORDER",
        sourceRef: e.radiologyOrderId,
        serviceItemId: e.serviceItemId!,
        description: e.description,
        createdById: e.requestedById ?? null,
      }),
    );
  }

  @OnEvent("pharmacy.dispensed")
  async onPharmacyDispensed(e: {
    prescriptionId: string;
    encounterId?: string | null;
    organizationId: string;
    dispensedById?: string | null;
    items: { id: string; name: string; quantity: number; unitPrice: number | string }[];
  }) {
    if (!e.encounterId) return;
    await this.safely("pharmacy.dispensed", async () => {
      for (const item of e.items) {
        await this.charges.post({
          encounterId: e.encounterId!,
          organizationId: e.organizationId,
          source: "PHARMACY_DISPENSE",
          sourceRef: `${e.prescriptionId}:${item.id}`,
          description: item.name,
          category: "PHARMACY",
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          createdById: e.dispensedById ?? null,
        });
      }
    });
  }

  @OnEvent("theatre.completed")
  async onTheatreCompleted(e: {
    bookingId: string;
    encounterId?: string | null;
    organizationId: string;
    serviceItemId?: string | null;
    procedureName?: string;
    surgeonId?: string | null;
  }) {
    if (!e.encounterId || !e.serviceItemId) return;
    await this.safely("theatre.completed", () =>
      this.charges.post({
        encounterId: e.encounterId!,
        organizationId: e.organizationId,
        source: "THEATRE",
        sourceRef: e.bookingId,
        serviceItemId: e.serviceItemId!,
        description: e.procedureName,
        createdById: e.surgeonId ?? null,
      }),
    );
  }
}
