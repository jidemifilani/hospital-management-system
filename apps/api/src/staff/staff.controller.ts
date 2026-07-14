import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from "@nestjs/common";
import { StaffService } from "./staff.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("staff")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STAFF_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("departmentId") departmentId?: string,
    @Query("search") search?: string,
  ) {
    return this.staffService.findAll(user.organizationId!, page, Math.min(limit, 100), {
      departmentId,
      search,
    });
  }

  @Get("doctors")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  getDoctors(@CurrentUser() user: JwtPayload, @Query("departmentId") departmentId?: string) {
    return this.staffService.getDoctors(user.organizationId!, departmentId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.STAFF_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.staffService.findOne(id, user.organizationId!);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.STAFF_UPDATE)
  updateStatus(
    @Param("id") id: string,
    @Body("isActive") isActive: boolean,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.staffService.updateStatus(id, isActive, user.organizationId!);
  }
}
