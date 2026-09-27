import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PaymentMethod, ServiceCategory } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AccountingService, PostLine } from "./accounting.service";
import { ACCOUNTS } from "./chart-of-accounts";

/** Where a payment method lands in the ledger. */
const CASH_ACCOUNT: Record<PaymentMethod, string> = {
  CASH: ACCOUNTS.CASH_ON_HAND,
  POS_CARD: ACCOUNTS.BANK,
  BANK_TRANSFER: ACCOUNTS.BANK,
  MOBILE_MONEY: ACCOUNTS.BANK,
  // Scheme settlements clear the scheme receivable, not the patient's.
  NHIS: ACCOUNTS.AR_NHIS,
  HMO: ACCOUNTS.AR_HMO,
  INSURANCE: ACCOUNTS.AR_HMO,
};

/** Which revenue account each billable category credits. */
const REVENUE_ACCOUNT: Record<ServiceCategory, string> = {
  CONSULTATION: ACCOUNTS.REV_CONSULTATION,
  LABORATORY: ACCOUNTS.REV_LABORATORY,
  RADIOLOGY: ACCOUNTS.REV_RADIOLOGY,
  PROCEDURE: ACCOUNTS.REV_PROCEDURE,
  SURGERY: ACCOUNTS.REV_SURGERY,
  BED_CHARGE: ACCOUNTS.REV_ADMISSION,
  NURSING: ACCOUNTS.REV_PROCEDURE,
  PHARMACY: ACCOUNTS.REV_PHARMACY,
  CONSUMABLE: ACCOUNTS.REV_PHARMACY,
  AMBULANCE: ACCOUNTS.REV_OTHER,
  OTHER: ACCOUNTS.REV_OTHER,
};

/**
 * Turns billing events into ledger postings.
 *
 * Failures are logged rather than thrown: an accounting problem must not roll
 * back a clinical or cash transaction that already happened. The entries are
 * idempotent on (source, sourceId), so a retry re-posts nothing.
 */
@Injectable()
export class AccountingListener {
  private readonly logger = new Logger(AccountingListener.name);

  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
  ) {}

  /** Issuing an invoice recognises revenue and raises a receivable. */
  @OnEvent("invoice.issued")
  async onInvoiceIssued(e: { invoiceId: string; organizationId: string }) {
    try {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: e.invoiceId, organizationId: e.organizationId },
        include: { items: true, patient: { select: { id: true, nhisNumber: true, hmoProvider: true } } },
      });
      if (!invoice) return;

      // Revenue is split by category so the P&L shows where income came from.
      const byCategory = new Map<string, number>();
      for (const item of invoice.items) {
        const account =
          REVENUE_ACCOUNT[item.category as ServiceCategory] ?? ACCOUNTS.REV_OTHER;
        byCategory.set(account, (byCategory.get(account) ?? 0) + Number(item.total));
      }

      const receivable = invoice.patient.nhisNumber
        ? ACCOUNTS.AR_NHIS
        : invoice.patient.hmoProvider
          ? ACCOUNTS.AR_HMO
          : ACCOUNTS.AR_PATIENTS;

      const lines: PostLine[] = [
        {
          accountCode: receivable,
          debit: Number(invoice.total),
          description: `Invoice ${invoice.invoiceNumber}`,
          partnerType: "PATIENT",
          partnerId: invoice.patientId,
        },
        ...[...byCategory.entries()].map(([accountCode, amount]) => ({
          accountCode,
          credit: amount,
          description: `Invoice ${invoice.invoiceNumber}`,
        })),
      ];

      await this.accounting.postEntry({
        description: `Invoice ${invoice.invoiceNumber} issued`,
        reference: invoice.invoiceNumber,
        source: "INVOICE",
        sourceId: invoice.id,
        organizationId: e.organizationId,
        lines,
      });
    } catch (err) {
      this.logger.error(
        `Failed to post invoice ${e.invoiceId} to the ledger`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  /** Receiving money moves it from the receivable into cash or bank. */
  @OnEvent("payment.received")
  async onPaymentReceived(e: { paymentId: string; organizationId: string }) {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { id: e.paymentId, organizationId: e.organizationId },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              patientId: true,
              patient: { select: { nhisNumber: true, hmoProvider: true } },
            },
          },
        },
      });
      if (!payment) return;

      const debitAccount = CASH_ACCOUNT[payment.method] ?? ACCOUNTS.CASH_ON_HAND;
      const creditAccount = payment.invoice.patient.nhisNumber
        ? ACCOUNTS.AR_NHIS
        : payment.invoice.patient.hmoProvider
          ? ACCOUNTS.AR_HMO
          : ACCOUNTS.AR_PATIENTS;

      await this.accounting.postEntry({
        description: `Payment against ${payment.invoice.invoiceNumber}`,
        reference: payment.reference ?? payment.invoice.invoiceNumber,
        source: "PAYMENT",
        sourceId: payment.id,
        entryDate: payment.paidAt,
        organizationId: e.organizationId,
        lines: [
          {
            accountCode: debitAccount,
            debit: Number(payment.amount),
            description: `${payment.method} received`,
          },
          {
            accountCode: creditAccount,
            credit: Number(payment.amount),
            description: `Settles ${payment.invoice.invoiceNumber}`,
            partnerType: "PATIENT",
            partnerId: payment.invoice.patientId,
          },
        ],
      });
    } catch (err) {
      this.logger.error(
        `Failed to post payment ${e.paymentId} to the ledger`,
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
