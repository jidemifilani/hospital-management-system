import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { HmoService } from "./hmo.service";
import { StatementsService } from "./statements.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import {
  CreateProviderDto,
  CreatePlanDto,
  CreateContractDto,
  EnrolPatientDto,
  BuildClaimDto,
  AdjudicateClaimDto,
  RecordRemittanceDto,
  BuildStatementDto,
  StatementPaymentDto,
  VoidStatementDto,
} from "./dto/hmo.dto";

@Controller("hmo")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HmoController {
  constructor(
    private readonly hmo: HmoService,
    private readonly statements: StatementsService,
  ) {}

  // ── Registry ───────────────────────────────────────────────────────────────

  @Get("providers")
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  listProviders(
    @CurrentUser() user: JwtPayload,
    @Query("includeInactive") all?: string,
    @Query("type") type?: "HMO" | "CORPORATE" | "NHIS",
  ) {
    return this.hmo.listProviders(user.organizationId!, all === "true", type);
  }

  @Post("providers")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  createProvider(@Body() body: CreateProviderDto, @CurrentUser() user: JwtPayload) {
    return this.hmo.createProvider(body, user.organizationId!);
  }

  @Post("plans")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  createPlan(@Body() body: CreatePlanDto, @CurrentUser() user: JwtPayload) {
    return this.hmo.createPlan(body, user.organizationId!);
  }

  @Get("contracts")
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  listContracts(@CurrentUser() user: JwtPayload) {
    return this.hmo.listContracts(user.organizationId!);
  }

  @Post("contracts")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  createContract(@Body() body: CreateContractDto, @CurrentUser() user: JwtPayload) {
    return this.hmo.createContract(body, user.organizationId!);
  }

  // ── Enrolment and eligibility ──────────────────────────────────────────────

  @Get("enrolments")
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  listEnrolments(@CurrentUser() user: JwtPayload, @Query("patientId") patientId?: string) {
    return this.hmo.listEnrolments(user.organizationId!, patientId);
  }

  @Post("enrolments")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  enrol(@Body() body: EnrolPatientDto, @CurrentUser() user: JwtPayload) {
    return this.hmo.enrol(body, user.organizationId!);
  }

  /** What the front desk checks before a patient is seen. */
  @Get("eligibility/:patientId")
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  eligibility(@Param("patientId") patientId: string, @CurrentUser() user: JwtPayload) {
    return this.hmo.eligibility(patientId, user.organizationId!);
  }

  // ── Claims ─────────────────────────────────────────────────────────────────

  @Get("claims")
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  listClaims(
    @CurrentUser() user: JwtPayload,
    @Query("status") status?: string,
    @Query("providerId") providerId?: string,
    @Query("patientId") patientId?: string,
  ) {
    return this.hmo.listClaims(user.organizationId!, { status, providerId, patientId });
  }

  @Post("claims/build")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  buildClaim(@Body() body: BuildClaimDto, @CurrentUser() user: JwtPayload) {
    return this.hmo.buildClaim(body.encounterId, user.organizationId!, body.preAuthCode);
  }

  @Post("claims/:id/submit")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  submit(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.hmo.submit(id, user.organizationId!);
  }

  @Post("claims/:id/adjudicate")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  adjudicate(
    @Param("id") id: string,
    @Body() body: AdjudicateClaimDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hmo.adjudicate(id, body, user.organizationId!);
  }

  @Post("claims/:id/remittance")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  remittance(
    @Param("id") id: string,
    @Body() body: RecordRemittanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hmo.recordPayment(id, body, user.organizationId!);
  }

  /** What each insurer owes, and how much of what was claimed they honour. */
  @Get("statement")
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  statement(@CurrentUser() user: JwtPayload) {
    return this.hmo.providerStatement(user.organizationId!);
  }

  // ── Consolidated statements ────────────────────────────────────────────────

  @Get("statements")
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  listStatements(@CurrentUser() user: JwtPayload, @Query("payerId") payerId?: string) {
    return this.statements.list(user.organizationId!, payerId);
  }

  @Get("statements/:id")
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  statementDetail(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.statements.findOne(id, user.organizationId!);
  }

  @Post("statements")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  buildStatement(@Body() body: BuildStatementDto, @CurrentUser() user: JwtPayload) {
    return this.statements.build(body, user.organizationId!);
  }

  @Post("statements/:id/issue")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  issueStatement(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.statements.issue(id, user.organizationId!);
  }

  @Post("statements/:id/payment")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  payStatement(
    @Param("id") id: string,
    @Body() body: StatementPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.statements.recordPayment(id, body, user.organizationId!);
  }

  @Post("statements/:id/void")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  voidStatement(
    @Param("id") id: string,
    @Body() body: VoidStatementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.statements.void(id, body.reason, user.organizationId!);
  }
}
