import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { AssetsService } from "./assets.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import {
  CompleteMaintenanceDto,
  CreateAssetDto,
  ScheduleMaintenanceDto,
  UpdateAssetDto,
} from "./dto/asset.dto";

@Controller("assets")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ASSETS_MANAGE)
  create(@Body() dto: CreateAssetDto, @CurrentUser() u: any) {
    return this.service.create(dto, u.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ASSETS_READ)
  findAll(
    @CurrentUser() u: any,
    @Query("category") category?: string,
    @Query("status") status?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.service.findAll(u.organizationId, category, status, departmentId);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.ASSETS_READ)
  getSummary(@CurrentUser() u: any) {
    return this.service.getSummary(u.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.ASSETS_READ)
  findOne(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.organizationId);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.ASSETS_MANAGE)
  update(@Param("id") id: string, @Body() dto: UpdateAssetDto, @CurrentUser() u: any) {
    return this.service.update(id, dto, u.organizationId);
  }

  @Post(":id/maintenance")
  @RequirePermissions(PERMISSIONS.ASSETS_MANAGE)
  scheduleMaintenance(@Param("id") id: string, @Body() dto: ScheduleMaintenanceDto, @CurrentUser() u: any) {
    return this.service.scheduleMaintenance(id, dto, u.organizationId);
  }

  @Patch("maintenance/:maintenanceId/complete")
  @RequirePermissions(PERMISSIONS.ASSETS_MANAGE)
  completeMaintenance(@Param("maintenanceId") id: string, @Body() dto: CompleteMaintenanceDto, @CurrentUser() u: any) {
    return this.service.completeMaintenance(id, dto, u.organizationId);
  }
}
