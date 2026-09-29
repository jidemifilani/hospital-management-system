import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AccountingService } from "../accounting/accounting.service";
import { ACCOUNTS } from "../accounting/chart-of-accounts";

/**
 * Stock movements are also money movements: receiving goods capitalises them,
 * consuming them turns them into expense. Without this the balance sheet would
 * show cash leaving and nothing arriving.
 */
@Injectable()
export class InventoryListener {
  private readonly logger = new Logger(InventoryListener.name);

  constructor(private accounting: AccountingService) {}

  @OnEvent("inventory.received")
  async onReceived(e: {
    moveId: string;
    value: string;
    supplierName?: string | null;
    sourceType?: string | null;
    organizationId: string;
  }) {
    if (Number(e.value) <= 0) return;

    // Output from a production run is not a purchase. Its value came from the
    // materials, which were deliberately left in inventory when they were
    // drawn — booking it again here would inflate stock and invent a payable
    // to a supplier who never sent anything.
    if (e.sourceType === "PRODUCTION_RUN") return;
    try {
      await this.accounting.postEntry({
        description: "Stock received into store",
        source: "INVENTORY",
        sourceId: e.moveId,
        organizationId: e.organizationId,
        lines: [
          { accountCode: ACCOUNTS.INVENTORY_CONSUMABLES, debit: Number(e.value) },
          {
            accountCode: ACCOUNTS.AP_SUPPLIERS,
            credit: Number(e.value),
            partnerType: "SUPPLIER",
            // Without a supplier the whole payable ages as one anonymous
            // balance, which cannot tell anyone who is owed what.
            partnerId: e.supplierName ?? "UNSPECIFIED",
          },
        ],
      });
    } catch (err) {
      this.logger.error(`Failed to post stock receipt ${e.moveId}`, err instanceof Error ? err.stack : err);
    }
  }

  /**
   * A count finding less (or more) than the books say is a real loss or gain,
   * and has to reach the ledger or inventory value drifts away from the shelf.
   */
  @OnEvent("inventory.adjusted")
  async onAdjusted(e: { moveId: string; delta: number; value: string; organizationId: string }) {
    const amount = Number(e.value);
    if (amount <= 0) return;

    try {
      const shrinkage = e.delta < 0;
      await this.accounting.postEntry({
        description: shrinkage
          ? "Stock count shortfall written off"
          : "Stock count surplus brought in",
        source: "INVENTORY",
        sourceId: e.moveId,
        organizationId: e.organizationId,
        lines: shrinkage
          ? [
              { accountCode: ACCOUNTS.EXP_OTHER, debit: amount },
              { accountCode: ACCOUNTS.INVENTORY_CONSUMABLES, credit: amount },
            ]
          : [
              { accountCode: ACCOUNTS.INVENTORY_CONSUMABLES, debit: amount },
              { accountCode: ACCOUNTS.EXP_OTHER, credit: amount },
            ],
      });
    } catch (err) {
      this.logger.error(
        `Failed to post stock adjustment ${e.moveId}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  @OnEvent("inventory.issued")
  async onIssued(e: { moveId: string; value: string; type: string; organizationId: string }) {
    if (Number(e.value) <= 0) return;

    // Material drawn into a production run has not left inventory — it has
    // become part of something else that is still on a shelf. Expensing it
    // here would write the value off and then the finished item would carry
    // it again, counting the same money out twice and understating stock.
    if (e.type === "PRODUCTION") return;

    try {
      // A write-off is a loss; ordinary consumption is cost of supplies.
      const expense =
        e.type === "WRITE_OFF" ? ACCOUNTS.EXP_OTHER : ACCOUNTS.EXP_SUPPLIES;

      await this.accounting.postEntry({
        description: e.type === "WRITE_OFF" ? "Stock written off" : "Stock consumed",
        source: "INVENTORY",
        sourceId: e.moveId,
        organizationId: e.organizationId,
        lines: [
          { accountCode: expense, debit: Number(e.value) },
          { accountCode: ACCOUNTS.INVENTORY_CONSUMABLES, credit: Number(e.value) },
        ],
      });
    } catch (err) {
      this.logger.error(`Failed to post stock issue ${e.moveId}`, err instanceof Error ? err.stack : err);
    }
  }
}
