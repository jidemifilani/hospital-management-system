import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { PosService } from "./pos.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import {
  OpenSessionDto,
  CloseSessionDto,
  CreateSaleDto,
  RefundSaleDto,
} from "./dto/pos.dto";

@Controller("pos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PosController {
  constructor(private readonly pos: PosService) {}

  // ── Till sessions ──────────────────────────────────────────────────────────

  @Get("session/current")
  @RequirePermissions(PERMISSIONS.POS_SELL)
  current(@CurrentUser() user: JwtPayload) {
    return this.pos.currentSession(user.organizationId!, user.staffId!);
  }

  @Post("session/open")
  @RequirePermissions(PERMISSIONS.POS_SELL)
  open(@Body() body: OpenSessionDto, @CurrentUser() user: JwtPayload) {
    return this.pos.openSession(body, user.organizationId!, user.staffId!);
  }

  @Post("session/:id/close")
  @RequirePermissions(PERMISSIONS.POS_SELL)
  close(
    @Param("id") id: string,
    @Body() body: CloseSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pos.closeSession(id, body, user.organizationId!);
  }

  @Get("session/:id/summary")
  @RequirePermissions(PERMISSIONS.POS_READ)
  summary(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.pos.sessionSummary(id, user.organizationId!);
  }

  // ── Selling ────────────────────────────────────────────────────────────────

  @Post("sales")
  @RequirePermissions(PERMISSIONS.POS_SELL)
  sell(@Body() body: CreateSaleDto, @CurrentUser() user: JwtPayload) {
    return this.pos.sell(body, user.organizationId!, user.staffId);
  }

  @Post("sales/:id/refund")
  @RequirePermissions(PERMISSIONS.POS_REFUND)
  refund(
    @Param("id") id: string,
    @Body() body: RefundSaleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pos.refund(id, body.reason, user.organizationId!, user.staffId);
  }

  @Get("sales")
  @RequirePermissions(PERMISSIONS.POS_READ)
  sales(
    @CurrentUser() user: JwtPayload,
    @Query("sessionId") sessionId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.pos.sales(user.organizationId!, {
      sessionId,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
