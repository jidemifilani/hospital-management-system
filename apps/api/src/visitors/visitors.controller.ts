import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { VisitorsService } from "./visitors.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("visitors")
export class VisitorsController {
  constructor(private readonly service: VisitorsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.VISITORS_MANAGE)
  checkIn(@Body() body: any, @Request() req: any) {
    return this.service.checkIn(body, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.VISITORS_READ)
  findAll(@Query() q: any, @Request() req: any) {
    return this.service.findAll(req.user.organizationId, { status: q.status, patientId: q.patientId, date: q.date });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.VISITORS_READ)
  getSummary(@Request() req: any) {
    return this.service.getSummary(req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.VISITORS_READ)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.organizationId);
  }

  @Patch(":id/checkout")
  @RequirePermissions(PERMISSIONS.VISITORS_MANAGE)
  checkOut(@Param("id") id: string, @Request() req: any) {
    return this.service.checkOut(id, req.user.organizationId);
  }

  @Post("flag-overstay")
  @RequirePermissions(PERMISSIONS.VISITORS_MANAGE)
  flagOverstay(@Request() req: any) {
    return this.service.flagOverstay(req.user.organizationId);
  }
}
