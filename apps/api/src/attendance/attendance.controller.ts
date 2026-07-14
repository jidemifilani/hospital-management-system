import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { RecordAttendanceDto } from "./dto/record-attendance.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("attendance")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post("clock-in")
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  clockIn(@Body("time") time: string, @CurrentUser() user: any) {
    return this.service.clockIn(user.staffId ?? user.sub, user.organizationId, time);
  }

  @Post("clock-out")
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  clockOut(@Body("time") time: string, @CurrentUser() user: any) {
    return this.service.clockOut(user.staffId ?? user.sub, user.organizationId, time);
  }

  @Post("record")
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  record(@Body() dto: RecordAttendanceDto, @CurrentUser() user: any) {
    return this.service.record(dto, user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  findAll(
    @CurrentUser() user: any,
    @Query("date") date?: string,
    @Query("departmentId") departmentId?: string,
    @Query("staffId") staffId?: string,
  ) {
    return this.service.findAll(user.organizationId, date, departmentId, staffId);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  getSummary(@CurrentUser() user: any, @Query("date") date?: string) {
    return this.service.getSummary(user.organizationId, date);
  }

  @Get("staff/:staffId")
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  getStaffRecord(
    @Param("staffId") staffId: string,
    @CurrentUser() user: any,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.service.getStaffRecord(staffId, user.organizationId, from, to);
  }
}
