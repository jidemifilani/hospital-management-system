import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { RfqService } from "./rfq.service";
import {
  CreateRfqDto, UpdateRfqDto, InviteVendorDto, SubmitQuoteDto, AwardRfqDto,
} from "./dto/rfq.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("rfq")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RfqController {
  constructor(private readonly service: RfqService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PROCUREMENT_READ)
  list(@CurrentUser() u: JwtPayload, @Query("status") status?: string) {
    return this.service.listRfqs(u.organizationId!, status);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_READ)
  get(@Param("id") id: string, @CurrentUser() u: JwtPayload) {
    return this.service.getRfq(id, u.organizationId!);
  }

  @Get(":id/comparison")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_READ)
  comparison(@Param("id") id: string, @CurrentUser() u: JwtPayload) {
    return this.service.comparison(id, u.organizationId!);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  create(@Body() dto: CreateRfqDto, @CurrentUser() u: JwtPayload) {
    return this.service.createRfq(dto, u.staffId ?? undefined, u.organizationId!);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  update(@Param("id") id: string, @Body() dto: UpdateRfqDto, @CurrentUser() u: JwtPayload) {
    return this.service.updateRfq(id, dto, u.organizationId!);
  }

  @Post(":id/send")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  send(@Param("id") id: string, @CurrentUser() u: JwtPayload) {
    return this.service.sendRfq(id, u.organizationId!);
  }

  @Post(":id/close")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  close(@Param("id") id: string, @CurrentUser() u: JwtPayload) {
    return this.service.closeRfq(id, u.organizationId!);
  }

  @Post(":id/cancel")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  cancel(@Param("id") id: string, @CurrentUser() u: JwtPayload) {
    return this.service.cancelRfq(id, u.organizationId!);
  }

  @Post(":id/award")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  award(@Param("id") id: string, @Body() dto: AwardRfqDto, @CurrentUser() u: JwtPayload) {
    return this.service.award(id, dto.quoteId, u.staffId ?? undefined, u.organizationId!);
  }

  // ── Vendors and quotes ──────────────────────────────────────────────────────

  @Post(":id/vendors")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  invite(@Param("id") id: string, @Body() dto: InviteVendorDto, @CurrentUser() u: JwtPayload) {
    return this.service.inviteVendor(id, dto, u.organizationId!);
  }

  @Delete("vendors/:quoteId")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVendor(@Param("quoteId") quoteId: string, @CurrentUser() u: JwtPayload) {
    return this.service.removeVendor(quoteId, u.organizationId!);
  }

  @Post("quotes/:quoteId")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  submitQuote(@Param("quoteId") quoteId: string, @Body() dto: SubmitQuoteDto, @CurrentUser() u: JwtPayload) {
    return this.service.submitQuote(quoteId, dto, u.organizationId!);
  }

  @Post("quotes/:quoteId/decline")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  decline(@Param("quoteId") quoteId: string, @CurrentUser() u: JwtPayload) {
    return this.service.declineQuote(quoteId, u.organizationId!);
  }
}
