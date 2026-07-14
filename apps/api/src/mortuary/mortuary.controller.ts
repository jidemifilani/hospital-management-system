import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { MortuaryService } from "./mortuary.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("mortuary")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MortuaryController {
  constructor(private readonly service: MortuaryService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.MORTUARY_MANAGE)
  admit(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.admit(dto, u.staffId, u.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.MORTUARY_READ)
  findAll(@CurrentUser() u: any, @Query("status") status?: string) {
    return this.service.findAll(u.organizationId, status);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.MORTUARY_READ)
  getSummary(@CurrentUser() u: any) {
    return this.service.getSummary(u.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.MORTUARY_READ)
  findOne(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.organizationId);
  }

  @Patch(":id/release")
  @RequirePermissions(PERMISSIONS.MORTUARY_MANAGE)
  release(@Param("id") id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.release(id, dto, u.organizationId);
  }

  @Patch(":id/storage")
  @RequirePermissions(PERMISSIONS.MORTUARY_MANAGE)
  updateStorage(@Param("id") id: string, @Body("storageUnit") storageUnit: string, @CurrentUser() u: any) {
    return this.service.updateStorageUnit(id, storageUnit, u.organizationId);
  }
}
