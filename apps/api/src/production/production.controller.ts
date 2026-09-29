import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ProductionService } from "./production.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import type { ProductionStatus } from "@prisma/client";
import {
  CreateBomDto,
  PlanRunDto,
  CompleteRunDto,
  CancelRunDto,
} from "./dto/production.dto";

@Controller("production")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  // ── Recipes ────────────────────────────────────────────────────────────────

  @Get("boms")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  listBoms(@CurrentUser() user: JwtPayload, @Query("includeInactive") all?: string) {
    return this.production.listBoms(user.organizationId!, all === "true");
  }

  @Post("boms")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  createBom(@Body() body: CreateBomDto, @CurrentUser() user: JwtPayload) {
    return this.production.createBom(body, user.organizationId!);
  }

  /** What a run would need, and whether the shelves can supply it. */
  @Get("boms/:id/requirements")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  requirements(
    @Param("id") id: string,
    @Query("quantity") quantity: string,
    @Query("locationId") locationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.production.requirementsFor(
      id,
      Number(quantity ?? 1),
      locationId,
      user.organizationId!,
    );
  }

  // ── Runs ───────────────────────────────────────────────────────────────────

  @Get("runs")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  listRuns(@CurrentUser() user: JwtPayload, @Query("status") status?: ProductionStatus) {
    return this.production.listRuns(user.organizationId!, status);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  summary(@CurrentUser() user: JwtPayload) {
    return this.production.summary(user.organizationId!);
  }

  @Get("runs/:id")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  findRun(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.production.findRun(id, user.organizationId!);
  }

  @Post("runs")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  plan(@Body() body: PlanRunDto, @CurrentUser() user: JwtPayload) {
    return this.production.plan(body, user.organizationId!, user.staffId);
  }

  @Post("runs/:id/complete")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  complete(
    @Param("id") id: string,
    @Body() body: CompleteRunDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.production.complete(id, body, user.organizationId!, user.staffId);
  }

  @Post("runs/:id/cancel")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  cancel(
    @Param("id") id: string,
    @Body() body: CancelRunDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.production.cancel(id, body.reason, user.organizationId!);
  }
}
