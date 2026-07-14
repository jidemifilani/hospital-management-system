import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { MarService } from "./mar.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("mar")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MarController {
  constructor(private readonly marService: MarService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.MAR_MANAGE)
  create(@Body() body: any, @Req() req: any) {
    return this.marService.create(body, req.user.organizationId);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.MAR_READ)
  getSummary(@Query() q: any, @Req() req: any) {
    return this.marService.getSummary(q.patientId, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.MAR_READ)
  findAll(@Query() q: any, @Req() req: any) {
    return this.marService.findAll(q, req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.MAR_READ)
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.marService.findOne(id, req.user.organizationId);
  }

  @Patch(":id/administer")
  @RequirePermissions(PERMISSIONS.MAR_MANAGE)
  administer(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.marService.administer(id, req.user.staffId, body, req.user.organizationId);
  }

  @Patch(":id/skip")
  @RequirePermissions(PERMISSIONS.MAR_MANAGE)
  skip(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.marService.skip(id, body, req.user.organizationId);
  }
}
