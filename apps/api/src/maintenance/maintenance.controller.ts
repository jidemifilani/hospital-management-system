import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { MaintenanceService } from "./maintenance.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("maintenance")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.MAINTENANCE_READ)
  create(@Body() body: any, @Req() req: any) {
    return this.maintenanceService.create(body, req.user.staffId, req.user.organizationId);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.MAINTENANCE_READ)
  getSummary(@Req() req: any) {
    return this.maintenanceService.getSummary(req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.MAINTENANCE_READ)
  findAll(@Query() q: any, @Req() req: any) {
    return this.maintenanceService.findAll(q, req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.MAINTENANCE_READ)
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.maintenanceService.findOne(id, req.user.organizationId);
  }

  @Patch(":id/assign")
  @RequirePermissions(PERMISSIONS.MAINTENANCE_MANAGE)
  assign(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.maintenanceService.assign(id, body.staffId ?? req.user.staffId, req.user.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.MAINTENANCE_MANAGE)
  updateStatus(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.maintenanceService.updateStatus(id, body, req.user.organizationId);
  }
}
