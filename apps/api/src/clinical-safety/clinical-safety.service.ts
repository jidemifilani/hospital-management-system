import { Injectable, Logger } from "@nestjs/common";
import { AlertSeverity, AlertType } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";

const genAlertNo = customAlphabet("0123456789", 8);

/** Hours within which re-ordering the same test is treated as a probable duplicate. */
const DUPLICATE_WINDOW_HOURS = 24;

export interface SafetyWarning {
  type: "ALLERGY" | "DUPLICATE_THERAPY" | "DUPLICATE_ORDER";
  severity: "WARNING" | "CRITICAL";
  message: string;
  /** What the warning is about — a drug or test name. */
  subject: string;
  /** For allergy warnings, the matched allergen term from the patient's record. */
  allergen?: string;
}

/** Splits a free-text allergy field into comparable terms. */
const parseAllergies = (raw: string | null): string[] =>
  (raw ?? "")
    .split(/[,;\n/]+/)
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 2 && !["nil", "none", "nkda", "n/a"].includes(a));

@Injectable()
export class ClinicalSafetyService {
  private readonly logger = new Logger(ClinicalSafetyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Screens a prospective prescription against the patient's recorded allergies
   * and their currently active medication, before anything is written.
   */
  async checkPrescription(
    patientId: string,
    drugItemIds: string[],
    organizationId: string,
  ): Promise<SafetyWarning[]> {
    const [patient, drugs] = await Promise.all([
      this.prisma.patient.findFirst({
        where: { id: patientId, organizationId },
        select: { allergies: true },
      }),
      this.prisma.inventoryItem.findMany({
        where: { id: { in: drugItemIds }, organizationId },
        select: { id: true, name: true, genericName: true },
      }),
    ]);
    if (!patient) return [];

    const warnings: SafetyWarning[] = [];
    const allergies = parseAllergies(patient.allergies);

    for (const drug of drugs) {
      const haystack = `${drug.name} ${drug.genericName ?? ""}`.toLowerCase();
      const hit = allergies.find((a) => haystack.includes(a) || a.includes(drug.name.toLowerCase()));
      if (hit) {
        warnings.push({
          type: "ALLERGY",
          severity: "CRITICAL",
          subject: drug.name,
          allergen: hit,
          message: `Patient has a recorded allergy to "${hit}" — ${drug.name} may be contraindicated.`,
        });
      }
    }

    // Same drug already on an active, undispensed prescription.
    const active = await this.prisma.prescriptionItem.findMany({
      where: {
        drugItemId: { in: drugItemIds },
        prescription: {
          patientId,
          organizationId,
          status: { in: ["PENDING", "PARTIALLY_DISPENSED"] },
          deletedAt: null,
        },
      },
      select: { drugItem: { select: { name: true } } },
    });

    for (const dup of active) {
      warnings.push({
        type: "DUPLICATE_THERAPY",
        severity: "WARNING",
        subject: dup.drugItem.name,
        message: `${dup.drugItem.name} is already on an active prescription for this patient.`,
      });
    }

    return warnings;
  }

  /** Flags lab tests already ordered for this patient in the last day. */
  async checkDuplicateLabOrders(
    patientId: string,
    testNames: string[],
    organizationId: string,
  ): Promise<SafetyWarning[]> {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 3_600_000);

    const recent = await this.prisma.labOrderItem.findMany({
      where: {
        testName: { in: testNames },
        labOrder: {
          patientId,
          organizationId,
          deletedAt: null,
          createdAt: { gte: since },
          status: { notIn: ["CANCELLED"] },
        },
      },
      select: { testName: true },
    });

    return [...new Set(recent.map((r) => r.testName))].map((testName) => ({
      type: "DUPLICATE_ORDER" as const,
      severity: "WARNING" as const,
      subject: testName,
      message: `${testName} was already ordered for this patient within the last ${DUPLICATE_WINDOW_HOURS} hours.`,
    }));
  }

  /** Raises a patient alert, skipping if an identical active one already exists. */
  async raiseAlert(input: {
    patientId: string;
    organizationId: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    description?: string;
    createdById: string;
  }) {
    const existing = await this.prisma.patientAlert.findFirst({
      where: {
        patientId: input.patientId,
        organizationId: input.organizationId,
        type: input.type,
        title: input.title,
        isActive: true,
      },
      select: { id: true },
    });
    if (existing) return existing;

    return this.prisma.patientAlert.create({
      data: {
        alertNumber: `ALT-${genAlertNo()}`,
        patientId: input.patientId,
        organizationId: input.organizationId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        description: input.description ?? null,
        createdById: input.createdById,
      },
    });
  }
}
