import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import { CreateScheduledReportDto, UpdateScheduledReportDto } from "./dto/report.dto";

@Controller("reports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get("scheduled")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  list(@CurrentUser() u: JwtPayload) {
    return this.service.listScheduled(u.organizationId!);
  }

  @Post("scheduled")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  create(@Body() dto: CreateScheduledReportDto, @CurrentUser() u: JwtPayload) {
    return this.service.createScheduled(dto, u.organizationId!);
  }

  @Patch("scheduled/:id")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  update(@Param("id") id: string, @Body() dto: UpdateScheduledReportDto, @CurrentUser() u: JwtPayload) {
    return this.service.updateScheduled(id, dto, u.organizationId!);
  }

  @Delete("scheduled/:id")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  remove(@Param("id") id: string, @CurrentUser() u: JwtPayload) {
    return this.service.deleteScheduled(id, u.organizationId!);
  }

  @Post("scheduled/:id/run-now")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  @HttpCode(HttpStatus.OK)
  runNow(@Param("id") id: string, @CurrentUser() u: JwtPayload) {
    return this.service.runNow(id, u.organizationId!);
  }
}
