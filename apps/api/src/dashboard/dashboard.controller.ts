import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  getStats(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getStats(user.organizationId!);
  }

  @Get("recent-patients")
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  recentPatients(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getRecentPatients(user.organizationId!);
  }

  @Get("today-appointments")
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  todayAppointments(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getTodayAppointments(user.organizationId!);
  }

  @Get("bed-occupancy")
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  bedOccupancy(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getBedOccupancy(user.organizationId!);
  }

  @Get("reports")
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  reports(@CurrentUser() user: JwtPayload, @Query("months") months?: string) {
    return this.dashboardService.getReports(user.organizationId!, months ? parseInt(months) : 6);
  }
}
