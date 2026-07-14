import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ReferralsService } from "./referrals.service";
import { CreateReferralDto } from "./dto/create-referral.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("referrals")
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.REFERRALS_CREATE)
  create(@Body() dto: CreateReferralDto, @CurrentUser() user: any) {
    return this.referrals.create(dto, user.staffId, user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.REFERRALS_READ)
  findAll(
    @CurrentUser() user: any,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: string,
    @Query("patientId") patientId?: string,
    @Query("type") type?: string,
  ) {
    return this.referrals.findAll(user.organizationId, page, limit, { status, patientId, type });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.REFERRALS_READ)
  getSummary(@CurrentUser() user: any) {
    return this.referrals.getSummary(user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.REFERRALS_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.referrals.findOne(id, user.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.REFERRALS_MANAGE)
  updateStatus(@Param("id") id: string, @Body("status") status: string, @CurrentUser() user: any) {
    return this.referrals.updateStatus(id, status, user.organizationId);
  }
}
