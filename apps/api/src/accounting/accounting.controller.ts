import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { AccountingService, PostLine } from "./accounting.service";
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
  createAccount(
    @Body()
    body: {
      code: string;
      name: string;
      type: AccountType;
      parentId?: string;
      description?: string;
      isPostable?: boolean;
    },
    @CurrentUser() user: JwtPayload,
  ) {
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
  postEntry(
    @Body()
    body: { description: string; lines: PostLine[]; entryDate?: string; reference?: string },
    @CurrentUser() user: JwtPayload,
  ) {
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

  @Get("aging/:kind")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  aging(
    @Param("kind") kind: "AR" | "AP",
    @CurrentUser() user: JwtPayload,
    @Query("asOf") asOf?: string,
  ) {
    return this.accounting.aging(
      user.organizationId!,
      kind.toUpperCase() === "AP" ? "AP" : "AR",
      parseDate(asOf, new Date()),
    );
  }
}
