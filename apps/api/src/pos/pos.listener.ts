import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PaymentMethod } from "@prisma/client";
import { AccountingService } from "../accounting/accounting.service";
import { ACCOUNTS } from "../accounting/chart-of-accounts";

const TENDER_ACCOUNT: Record<PaymentMethod, string> = {
  CASH: ACCOUNTS.CASH_ON_HAND,
  POS_CARD: ACCOUNTS.BANK,
  BANK_TRANSFER: ACCOUNTS.BANK,
  MOBILE_MONEY: ACCOUNTS.BANK,
  NHIS: ACCOUNTS.AR_NHIS,
  HMO: ACCOUNTS.AR_HMO,
  INSURANCE: ACCOUNTS.AR_HMO,
};

/**
 * Counter sales take money immediately, so unlike an invoice there is no
 * receivable stage: cash goes straight in against pharmacy revenue.
 */
@Injectable()
export class PosListener {
  private readonly logger = new Logger(PosListener.name);

  constructor(private accounting: AccountingService) {}

  @OnEvent("pos.sale.completed")
  async onSale(e: { saleId: string; total: string; method: PaymentMethod; organizationId: string }) {
    await this.post(e, "Counter sale");
  }

  @OnEvent("pos.sale.refunded")
  async onRefund(e: { saleId: string; total: string; method: PaymentMethod; organizationId: string }) {
    // The refund carries a negative total, so the same posting reverses itself.
    await this.post(e, "Counter sale refunded");
  }

  private async post(
    e: { saleId: string; total: string; method: PaymentMethod; organizationId: string },
    description: string,
  ) {
    const amount = Number(e.total);
    if (amount === 0) return;

    try {
      const tender = TENDER_ACCOUNT[e.method] ?? ACCOUNTS.CASH_ON_HAND;
      await this.accounting.postEntry({
        description,
        source: "PAYMENT",
        sourceId: e.saleId,
        organizationId: e.organizationId,
        lines:
          amount > 0
            ? [
                { accountCode: tender, debit: amount },
                { accountCode: ACCOUNTS.REV_PHARMACY, credit: amount },
              ]
            : [
                { accountCode: ACCOUNTS.REV_PHARMACY, debit: Math.abs(amount) },
                { accountCode: tender, credit: Math.abs(amount) },
              ],
      });
    } catch (err) {
      this.logger.error(
        `Failed to post counter sale ${e.saleId} to the ledger`,
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
