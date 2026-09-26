import { Controller, Post, Param, BadRequestException, UseGuards } from "@nestjs/common";
import { OperationsScheduler } from "./operations.scheduler";
import { ReminderScheduler } from "./reminder.scheduler";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";

/**
 * Lets an admin run a scheduled job on demand — to catch up after downtime,
 * and so these jobs can be exercised without waiting for their cron time.
 */
@Controller("operations/jobs")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OperationsController {
  constructor(
    private operations: OperationsScheduler,
    private reminders: ReminderScheduler,
  ) {}

  private get jobs(): Record<string, () => Promise<unknown>> {
    return {
      "drug-expiry": () => this.operations.drugExpiryDigest(),
      "low-stock": () => this.operations.lowStockDigest(),
      "aging-claims": () => this.operations.agingClaimsDigest(),
      "maintenance-due": () => this.operations.maintenanceDueDigest(),
      "appointment-reminders": () => this.reminders.sendAppointmentReminders(),
      "overdue-invoices": () => this.reminders.markOverdueInvoices(),
    };
  }

  @Post(":name")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  async run(@Param("name") name: string) {
    const job = this.jobs[name];
    if (!job) {
      throw new BadRequestException(
        `Unknown job "${name}". Available: ${Object.keys(this.jobs).join(", ")}`,
      );
    }

    const startedAt = Date.now();
    await job();
    return { job: name, status: "completed", durationMs: Date.now() - startedAt };
  }
}
