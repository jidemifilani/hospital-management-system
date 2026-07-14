import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { TheatreService } from "./theatre.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("theatre")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TheatreController {
  constructor(private readonly service: TheatreService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.THEATRE_MANAGE)
  create(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(dto, u.staffId, u.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.THEATRE_READ)
  findAll(
    @CurrentUser() u: any,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.service.findAll(u.organizationId, status, from, to);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.THEATRE_READ)
  getSummary(@CurrentUser() u: any) {
    return this.service.getSummary(u.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.THEATRE_READ)
  findOne(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.THEATRE_MANAGE)
  updateStatus(@Param("id") id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateStatus(id, dto, u.organizationId);
  }
}
