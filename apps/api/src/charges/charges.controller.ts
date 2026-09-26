import { Controller, Get, Post, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { ChargesService } from "./charges.service";
import { BedChargeScheduler } from "./bed-charge.scheduler";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("charges")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChargesController {
  constructor(
    private readonly charges: ChargesService,
    private readonly bedCharges: BedChargeScheduler,
  ) {}

  /** Manual catch-up for the nightly bed sweep, e.g. after server downtime. */
  @Post("run-bed-charges")
  @RequirePermissions(PERMISSIONS.CHARGES_MANAGE)
  async runBedCharges() {
    await this.bedCharges.postNightlyBedCharges();
    return { status: "completed" };
  }

  @Get("encounter/:encounterId")
  @RequirePermissions(PERMISSIONS.CHARGES_READ)
  listForEncounter(@Param("encounterId") encounterId: string, @CurrentUser() user: JwtPayload) {
    return this.charges.listForEncounter(encounterId, user.organizationId!);
  }

  @Get("encounter/:encounterId/statement")
  @RequirePermissions(PERMISSIONS.CHARGES_READ)
  statement(@Param("encounterId") encounterId: string, @CurrentUser() user: JwtPayload) {
    return this.charges.statement(encounterId, user.organizationId!);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CHARGES_MANAGE)
  postManual(
    @Body()
    body: {
      encounterId: string;
      serviceItemId?: string;
      serviceItemCode?: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.charges.post({
      ...body,
      source: "MANUAL",
      organizationId: user.organizationId!,
      createdById: user.staffId ?? null,
    });
  }

  @Post("encounter/:encounterId/invoice")
  @RequirePermissions(PERMISSIONS.CHARGES_MANAGE)
  rollIntoInvoice(@Param("encounterId") encounterId: string, @CurrentUser() user: JwtPayload) {
    return this.charges.rollIntoInvoice(encounterId, user.organizationId!, user.staffId!);
  }

  @Patch(":id/void")
  @RequirePermissions(PERMISSIONS.CHARGES_MANAGE)
  void(
    @Param("id") id: string,
    @Body("reason") reason: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.charges.void(id, reason, user.organizationId!);
  }
}
