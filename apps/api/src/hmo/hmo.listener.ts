import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AccountingService } from "../accounting/accounting.service";
import { ACCOUNTS } from "../accounting/chart-of-accounts";

/**
 * Keeps the ledger honest about who owes what once an insurer is involved.
 *
 * Invoicing books the whole bill against the patient. That is right until a
 * claim is made: from then on the covered share is owed by the insurer, and
 * only the co-payment is the patient's. Without these entries the ageing
 * report shows large balances against patients who owe nothing, and no way to
 * total what any one HMO owes the hospital.
 */
@Injectable()
export class HmoListener {
  private readonly logger = new Logger(HmoListener.name);

  constructor(private accounting: AccountingService) {}

  @OnEvent("hmo.claim.submitted")
  async onSubmitted(e: {
    claimId: string;
    claimNumber: string;
    providerId: string | null;
    patientId: string;
    coveredAmount: string;
    organizationId: string;
  }) {
    const covered = Number(e.coveredAmount);
    if (covered <= 0 || !e.providerId) return;

    try {
      // Move the covered share off the patient and onto the insurer. No
      // revenue is touched — the sale already happened, only the debtor changes.
      await this.accounting.postEntry({
        description: `Claim ${e.claimNumber} submitted to insurer`,
        reference: e.claimNumber,
        source: "HMO_CLAIM",
        sourceId: e.claimId,
        organizationId: e.organizationId,
        lines: [
          {
            accountCode: ACCOUNTS.AR_HMO,
            debit: covered,
            description: `Claim ${e.claimNumber}`,
            partnerType: "HMO",
            partnerId: e.providerId,
          },
          {
            accountCode: ACCOUNTS.AR_PATIENTS,
            credit: covered,
            description: `Covered by insurer under ${e.claimNumber}`,
            partnerType: "PATIENT",
            partnerId: e.patientId,
          },
        ],
      });
    } catch (err) {
      this.logger.error(
        `Failed to post claim ${e.claimNumber} to the ledger`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  /**
   * An insurer approving less than was claimed does not make the shortfall
   * disappear — it goes back to the patient, who has to be told.
   */
  @OnEvent("hmo.claim.adjudicated")
  async onAdjudicated(e: {
    claimId: string;
    claimNumber: string;
    providerId: string | null;
    patientId: string;
    shortfall: string;
    organizationId: string;
  }) {
    const shortfall = Number(e.shortfall);
    if (shortfall <= 0 || !e.providerId) return;

    try {
      await this.accounting.postEntry({
        description: `Claim ${e.claimNumber} part-declined, returned to patient`,
        reference: e.claimNumber,
        source: "HMO_SHORTFALL",
        sourceId: e.claimId,
        organizationId: e.organizationId,
        lines: [
          {
            accountCode: ACCOUNTS.AR_PATIENTS,
            debit: shortfall,
            description: `Not covered under ${e.claimNumber}`,
            partnerType: "PATIENT",
            partnerId: e.patientId,
          },
          {
            accountCode: ACCOUNTS.AR_HMO,
            credit: shortfall,
            description: `Declined by insurer under ${e.claimNumber}`,
            partnerType: "HMO",
            partnerId: e.providerId,
          },
        ],
      });
    } catch (err) {
      this.logger.error(
        `Failed to post shortfall for claim ${e.claimNumber}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  @OnEvent("hmo.claim.paid")
  async onPaid(e: {
    claimId: string;
    claimNumber: string;
    providerId: string | null;
    amount: string;
    /** Cumulative total after this payment — a stable idempotency key. */
    paidToDate: string;
    reference?: string;
    organizationId: string;
  }) {
    const amount = Number(e.amount);
    if (amount <= 0 || !e.providerId) return;

    try {
      await this.accounting.postEntry({
        description: `Remittance for claim ${e.claimNumber}`,
        reference: e.reference ?? e.claimNumber,
        source: "HMO_REMITTANCE",
        // Keyed on the running total, so a repeated event cannot double-post
        // while genuine part-payments each get their own entry.
        sourceId: `${e.claimId}:${e.paidToDate}`,
        organizationId: e.organizationId,
        lines: [
          {
            accountCode: ACCOUNTS.BANK,
            debit: amount,
            description: `Insurer remittance ${e.claimNumber}`,
          },
          {
            accountCode: ACCOUNTS.AR_HMO,
            credit: amount,
            description: `Settles ${e.claimNumber}`,
            partnerType: "HMO",
            partnerId: e.providerId,
          },
        ],
      });
    } catch (err) {
      this.logger.error(
        `Failed to post remittance for claim ${e.claimNumber}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
