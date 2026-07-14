import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { RehabService } from "./rehab.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("rehab")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RehabController {
  constructor(private readonly rehabService: RehabService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.REHAB_MANAGE)
  create(@Body() body: any, @Req() req: any) {
    return this.rehabService.create(body, req.user.organizationId);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.REHAB_READ)
  getSummary(@Req() req: any) {
    return this.rehabService.getSummary(req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.REHAB_READ)
  findAll(@Query() q: any, @Req() req: any) {
    return this.rehabService.findAll(q, req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.REHAB_READ)
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.rehabService.findOne(id, req.user.organizationId);
  }

  @Patch(":id/start")
  @RequirePermissions(PERMISSIONS.REHAB_MANAGE)
  start(@Param("id") id: string, @Req() req: any) {
    return this.rehabService.start(id, req.user.organizationId);
  }

  @Patch(":id/complete")
  @RequirePermissions(PERMISSIONS.REHAB_MANAGE)
  complete(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.rehabService.complete(id, body, req.user.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.REHAB_MANAGE)
  updateStatus(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.rehabService.updateStatus(id, body.status, req.user.organizationId);
  }
}
