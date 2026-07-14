import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { AlertsService } from "./alerts.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("alerts")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ALERTS_MANAGE)
  create(@Body() body: any, @Req() req: any) {
    return this.alertsService.create(body, req.user.staffId, req.user.organizationId);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.ALERTS_READ)
  getSummary(@Req() req: any) {
    return this.alertsService.getSummary(req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ALERTS_READ)
  findAll(@Query() q: any, @Req() req: any) {
    return this.alertsService.findAll(q, req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.ALERTS_READ)
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.alertsService.findOne(id, req.user.organizationId);
  }

  @Patch(":id/resolve")
  @RequirePermissions(PERMISSIONS.ALERTS_MANAGE)
  resolve(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.alertsService.resolve(id, req.user.staffId, body, req.user.organizationId);
  }
}
