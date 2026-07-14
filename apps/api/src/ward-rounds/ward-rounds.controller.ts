import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { WardRoundsService } from "./ward-rounds.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("ward-rounds")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WardRoundsController {
  constructor(private readonly svc: WardRoundsService) {}

  @Get("summary")
  @RequirePermissions(PERMISSIONS.WARD_ROUND_READ)
  summary(@Request() req: any) {
    return this.svc.getSummary(req.user.organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.WARD_ROUND_MANAGE)
  create(@Body() body: any, @Request() req: any) {
    return this.svc.create(body, req.user.staffId, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.WARD_ROUND_READ)
  findAll(@Query() q: any, @Request() req: any) {
    return this.svc.findAll(q, req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.WARD_ROUND_READ)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.svc.findOne(id, req.user.organizationId);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.WARD_ROUND_MANAGE)
  update(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    return this.svc.update(id, body, req.user.organizationId);
  }

  @Patch(":id/complete")
  @RequirePermissions(PERMISSIONS.WARD_ROUND_MANAGE)
  complete(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    return this.svc.complete(id, body, req.user.organizationId);
  }
}
