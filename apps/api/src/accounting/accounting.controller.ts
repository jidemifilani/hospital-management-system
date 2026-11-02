import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { AccountingService } from "./accounting.service";
import {
  CreateAccountDto, PostJournalEntryDto,
  CreateBankAccountDto, ImportStatementDto, MatchLineDto,
  CreateCurrencyDto, UpdateCurrencyDto, SetExchangeRateDto, UpdateBaseCurrencyDto,
} from "./dto/accounting.dto";
import { ChartSeeder } from "./chart.seeder";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import type { AccountType } from "@prisma/client";

const parseDate = (value: string | undefined, fallback: Date) =>
  value ? new Date(value) : fallback;

@Controller("accounting")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountingController {
  constructor(
    private readonly accounting: AccountingService,
    private readonly seeder: ChartSeeder,
  ) {}

  // ── Chart of accounts ──────────────────────────────────────────────────────

  @Get("accounts")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  accounts(@CurrentUser() user: JwtPayload, @Query("type") type?: AccountType) {
    return this.accounting.listAccounts(user.organizationId!, type);
  }

  @Post("accounts")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  createAccount(@Body() body: CreateAccountDto, @CurrentUser() user: JwtPayload) {
    return this.accounting.createAccount(body, user.organizationId!);
  }

  /** Installs the default hospital chart; safe to call more than once. */
  @Post("accounts/seed-default")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  seedDefault(@CurrentUser() user: JwtPayload) {
    return this.seeder.seed(user.organizationId!);
  }

  // ── Journal ────────────────────────────────────────────────────────────────

  @Post("entries")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  postEntry(@Body() body: PostJournalEntryDto, @CurrentUser() user: JwtPayload) {
    return this.accounting.postEntry({
      description: body.description,
      lines: body.lines,
      reference: body.reference,
      entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
      organizationId: user.organizationId!,
      postedById: user.staffId,
    });
  }

  @Post("entries/:id/reverse")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  reverse(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.accounting.reverseEntry(id, user.organizationId!, user.staffId);
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  @Get("trial-balance")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  trialBalance(@CurrentUser() user: JwtPayload, @Query("asOf") asOf?: string) {
    return this.accounting.trialBalance(user.organizationId!, asOf ? new Date(asOf) : undefined);
  }

  @Get("ledger/:accountId")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  ledger(
    @Param("accountId") accountId: string,
    @CurrentUser() user: JwtPayload,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.accounting.ledger(
      accountId,
      user.organizationId!,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get("profit-and-loss")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  profitAndLoss(
    @CurrentUser() user: JwtPayload,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const now = new Date();
    return this.accounting.profitAndLoss(
      user.organizationId!,
      parseDate(from, new Date(now.getFullYear(), now.getMonth(), 1)),
      parseDate(to, now),
    );
  }

  @Get("balance-sheet")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  balanceSheet(@CurrentUser() user: JwtPayload, @Query("asOf") asOf?: string) {
    return this.accounting.balanceSheet(user.organizationId!, parseDate(asOf, new Date()));
  }

  /** AR is owed by patients, HMO by insurers, AP owed to suppliers. */
  @Get("aging/:kind")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  aging(
    @Param("kind") kind: string,
    @CurrentUser() user: JwtPayload,
    @Query("asOf") asOf?: string,
  ) {
    const normalised = kind.toUpperCase();
    const which = normalised === "AP" ? "AP" : normalised === "HMO" ? "HMO" : "AR";

    return this.accounting.aging(user.organizationId!, which, parseDate(asOf, new Date()));
  }

  // ── Bank Reconciliation ────────────────────────────────────────────────────

  @Get("bank-accounts")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  listBankAccounts(@CurrentUser() user: JwtPayload) {
    return this.accounting.listBankAccounts(user.organizationId!);
  }

  @Post("bank-accounts")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  createBankAccount(@Body() body: CreateBankAccountDto, @CurrentUser() user: JwtPayload) {
    return this.accounting.createBankAccount(body, user.organizationId!);
  }

  @Post("bank-accounts/:id/statement-lines")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  importStatementLines(
    @Param("id") id: string,
    @Body() body: ImportStatementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accounting.importStatementLines(id, user.organizationId!, body.lines);
  }

  @Get("bank-accounts/:id/statement-lines")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  getStatementLines(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Query("reconciled") reconciled?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.accounting.getStatementLines(id, user.organizationId!, {
      reconciled: reconciled === undefined ? undefined : reconciled === "true",
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post("bank-accounts/:id/auto-match")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  autoMatch(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.accounting.autoMatch(id, user.organizationId!);
  }

  @Patch("statement-lines/:id/match")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  matchLine(
    @Param("id") id: string,
    @Body() body: MatchLineDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accounting.matchLine(id, user.organizationId!, user.staffId ?? undefined, body);
  }

  @Patch("statement-lines/:id/unmatch")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  unmatchLine(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.accounting.unmatchLine(id, user.organizationId!);
  }

  @Get("bank-accounts/:id/reconciliation-report")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  reconciliationReport(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Query("asOf") asOf?: string,
  ) {
    return this.accounting.reconciliationReport(id, user.organizationId!, parseDate(asOf, new Date()));
  }

  // ── Currencies ──────────────────────────────────────────────────────────────

  @Get("currencies")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  listCurrencies() {
    return this.accounting.listCurrencies();
  }

  @Post("currencies")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  createCurrency(@Body() dto: CreateCurrencyDto) {
    return this.accounting.createCurrency(dto);
  }

  @Patch("currencies/:code")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  updateCurrency(@Param("code") code: string, @Body() dto: UpdateCurrencyDto) {
    return this.accounting.updateCurrency(code, dto);
  }

  // ── Exchange rates ──────────────────────────────────────────────────────────

  @Get("exchange-rates")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  listRates(@CurrentUser() user: JwtPayload, @Query("currency") currency?: string) {
    return this.accounting.listExchangeRates(user.organizationId!, currency);
  }

  @Get("exchange-rates/latest")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  latestRates(@CurrentUser() user: JwtPayload) {
    return this.accounting.latestRates(user.organizationId!);
  }

  @Post("exchange-rates")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  setRate(@Body() dto: SetExchangeRateDto, @CurrentUser() user: JwtPayload) {
    return this.accounting.setExchangeRate(user.organizationId!, dto);
  }

  @Delete("exchange-rates/:id")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRate(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.accounting.deleteExchangeRate(id, user.organizationId!);
  }

  @Patch("base-currency")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  setBaseCurrency(@Body() dto: UpdateBaseCurrencyDto, @CurrentUser() user: JwtPayload) {
    return this.accounting.updateBaseCurrency(user.organizationId!, dto.baseCurrencyCode);
  }
}
