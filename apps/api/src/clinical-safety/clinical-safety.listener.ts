import { Injectable, Logger } from "@nestjs/common";
import { OnEvent, EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { ClinicalSafetyService } from "./clinical-safety.service";

/**
 * Escalates results that a clinician must not miss.
 *
 * A critical value sitting unread in a results queue is one of the classic ways
 * hospitals harm people, so this raises a persistent patient alert and pages the
 * requesting doctor rather than relying on someone refreshing a screen.
 */
@Injectable()
export class ClinicalSafetyListener {
  private readonly logger = new Logger(ClinicalSafetyListener.name);

  constructor(
    private prisma: PrismaService,
    private safety: ClinicalSafetyService,
    private events: EventEmitter2,
  ) {}

  @OnEvent("lab.criticalResult")
  async onCriticalResult(e: {
    labOrderId: string;
    organizationId: string;
    patientId: string;
    requestedById: string;
    results: { testName: string; result: string; unit: string | null }[];
  }) {
    try {
      const summary = e.results
        .map((r) => `${r.testName}: ${r.result}${r.unit ? ` ${r.unit}` : ""}`)
        .join("; ");

      await this.safety.raiseAlert({
        patientId: e.patientId,
        organizationId: e.organizationId,
        type: "OTHER",
        severity: "CRITICAL",
        title: "Critical lab result",
        description: summary,
        createdById: e.requestedById,
      });

      const [patient, doctor] = await Promise.all([
        this.prisma.patient.findUnique({
          where: { id: e.patientId },
          select: { firstName: true, lastName: true, mrn: true },
        }),
        this.prisma.staff.findUnique({
          where: { id: e.requestedById },
          select: { firstName: true, lastName: true, phone: true, user: { select: { email: true } } },
        }),
      ]);

      if (doctor && patient) {
        this.events.emit("notification.send", {
          channel: "both",
          to: { email: doctor.user?.email, phone: doctor.phone },
          subject: "CRITICAL lab result",
          body:
            `CRITICAL result for ${patient.firstName} ${patient.lastName} (${patient.mrn}): ` +
            `${summary}. Please review immediately.`,
        });
      }

      this.logger.warn(`Critical lab result escalated for patient ${e.patientId}: ${summary}`);
    } catch (err) {
      this.logger.error("Failed to escalate critical lab result", err instanceof Error ? err.stack : err);
    }
  }

  /** Records the allergy on the patient's alert banner the first time it's detected. */
  @OnEvent("safety.allergyDetected")
  async onAllergyDetected(e: {
    patientId: string;
    organizationId: string;
    drugName: string;
    allergen: string;
    staffId: string;
  }) {
    try {
      await this.safety.raiseAlert({
        patientId: e.patientId,
        organizationId: e.organizationId,
        type: "ALLERGY",
        severity: "HIGH",
        title: `Allergy risk: ${e.allergen}`,
        description: `Prescribing of ${e.drugName} was flagged against recorded allergy "${e.allergen}".`,
        createdById: e.staffId,
      });
    } catch (err) {
      this.logger.error("Failed to raise allergy alert", err instanceof Error ? err.stack : err);
    }
  }
}
