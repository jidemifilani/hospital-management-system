import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { TaxService } from "./tax.service";
import { CreateTaxCodeDto, UpdateTaxCodeDto, ApplyTaxDto, CreateTaxReturnDto, UpdateTaxReturnDto } from "./dto/tax.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("tax")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaxController {
  constructor(private readonly service: TaxService) {}

  // ── Tax codes ───────────────────────────────────────────────────────────────

  @Get("codes")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  listCodes(@CurrentUser() u: JwtPayload) {
    return this.service.listCodes(u.organizationId!);
  }

  @Post("codes/seed-defaults")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  @HttpCode(HttpStatus.OK)
  seedDefaults(@CurrentUser() u: JwtPayload) {
    return this.service.seedDefaults(u.organizationId!);
  }

  @Post("codes")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  createCode(@Body() dto: CreateTaxCodeDto, @CurrentUser() u: JwtPayload) {
    return this.service.createCode(dto, u.organizationId!);
  }

  @Patch("codes/:id")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  updateCode(@Param("id") id: string, @Body() dto: UpdateTaxCodeDto, @CurrentUser() u: JwtPayload) {
    return this.service.updateCode(id, dto, u.organizationId!);
  }

  @Delete("codes/:id")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCode(@Param("id") id: string, @CurrentUser() u: JwtPayload) {
    return this.service.deleteCode(id, u.organizationId!);
  }

  // ── Tax applications ────────────────────────────────────────────────────────

  @Get("applications")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  listApplications(
    @CurrentUser() u: JwtPayload,
    @Query("referenceType") referenceType?: string,
    @Query("referenceId") referenceId?: string,
  ) {
    return this.service.listApplications(u.organizationId!, referenceType, referenceId);
  }

  @Post("applications")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  applyTax(@Body() dto: ApplyTaxDto, @CurrentUser() u: JwtPayload) {
    return this.service.applyTax(dto, u.organizationId!);
  }

  @Delete("applications/:id")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteApplication(@Param("id") id: string, @CurrentUser() u: JwtPayload) {
    return this.service.deleteApplication(id, u.organizationId!);
  }

  // ── Period summary + tax returns ────────────────────────────────────────────

  @Get("period-summary")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  periodSummary(
    @CurrentUser() u: JwtPayload,
    @Query("year") year: string,
    @Query("month") month: string,
  ) {
    return this.service.periodSummary(u.organizationId!, parseInt(year), parseInt(month));
  }

  @Get("returns")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  listReturns(@CurrentUser() u: JwtPayload) {
    return this.service.listReturns(u.organizationId!);
  }

  @Post("returns")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  createReturn(@Body() dto: CreateTaxReturnDto, @CurrentUser() u: JwtPayload) {
    return this.service.createReturn(dto, u.organizationId!);
  }

  @Patch("returns/:id")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  updateReturn(@Param("id") id: string, @Body() dto: UpdateTaxReturnDto, @CurrentUser() u: JwtPayload) {
    return this.service.updateReturn(id, dto, u.organizationId!);
  }
}
