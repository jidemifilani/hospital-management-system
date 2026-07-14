import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { InsuranceService } from "./insurance.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("insurance")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InsuranceController {
  constructor(private readonly service: InsuranceService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  create(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(dto, u.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  findAll(@CurrentUser() u: any, @Query("status") status?: string, @Query("provider") provider?: string) {
    return this.service.findAll(u.organizationId, status, provider);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  getSummary(@CurrentUser() u: any) {
    return this.service.getSummary(u.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  findOne(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  updateStatus(@Param("id") id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateStatus(id, dto.status, dto, u.organizationId);
  }
}
