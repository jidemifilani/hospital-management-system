import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { BedsService } from "./beds.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import { CreateBedDto, AdmitToBedDto, TransferBedDto } from "./dto/bed.dto";

/**
 * Beds were previously behind authentication alone, so any signed-in account —
 * a lab technologist, a cashier — could discharge a patient or delete a ward
 * bed. Occupancy follows admissions, so these reuse the admissions permissions;
 * changing the ward's physical layout is an administrative act instead.
 */
@Controller("beds")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BedsController {
  constructor(private readonly bedsService: BedsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ADMISSIONS_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("ward") ward?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.bedsService.findAll(user.organizationId!, ward, departmentId);
  }

  @Get("occupancy")
  @RequirePermissions(PERMISSIONS.ADMISSIONS_READ)
  getOccupancy(@CurrentUser() user: JwtPayload) {
    return this.bedsService.getOccupancySummary(user.organizationId!);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  create(@Body() body: CreateBedDto, @CurrentUser() user: JwtPayload) {
    return this.bedsService.create(body, user.organizationId!);
  }

  @Patch(":id/admit")
  @RequirePermissions(PERMISSIONS.ADMISSIONS_MANAGE)
  admit(@Param("id") id: string, @Body() body: AdmitToBedDto, @CurrentUser() user: JwtPayload) {
    return this.bedsService.admit(id, body.patientId, user.organizationId!);
  }

  @Patch(":id/discharge")
  @RequirePermissions(PERMISSIONS.ADMISSIONS_MANAGE)
  discharge(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.bedsService.discharge(id, user.organizationId!);
  }

  @Patch(":id/transfer")
  @RequirePermissions(PERMISSIONS.ADMISSIONS_MANAGE)
  transfer(@Param("id") id: string, @Body() body: TransferBedDto, @CurrentUser() user: JwtPayload) {
    return this.bedsService.transfer(id, body.targetBedId, user.organizationId!);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  remove(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.bedsService.remove(id, user.organizationId!);
  }
}
