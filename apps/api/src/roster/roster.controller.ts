import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { RosterService, CreateRosterDto } from "./roster.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@ApiTags("roster")
@ApiBearerAuth()
@Controller("roster")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RosterController {
  constructor(private readonly roster: RosterService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ROSTER_MANAGE)
  assignShift(@Body() dto: CreateRosterDto, @CurrentUser() user: JwtPayload) {
    return this.roster.assignShift(dto, user.sub, user.organizationId!);
  }

  @Get("weekly")
  @RequirePermissions(PERMISSIONS.ROSTER_READ)
  weekly(
    @CurrentUser() user: JwtPayload,
    @Query("departmentId") departmentId?: string,
    @Query("from") from?: string,
  ) {
    return this.roster.getWeeklyRoster(user.organizationId!, departmentId, from);
  }

  @Get("staff/:staffId")
  @RequirePermissions(PERMISSIONS.ROSTER_READ)
  staffSchedule(
    @Param("staffId") staffId: string,
    @CurrentUser() user: JwtPayload,
    @Query("from") from?: string,
  ) {
    return this.roster.getStaffSchedule(staffId, user.organizationId!, from);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.ROSTER_MANAGE)
  deleteShift(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.roster.deleteShift(id, user.organizationId!);
  }
}
