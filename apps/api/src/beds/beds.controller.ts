import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { BedsService } from "./beds.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtPayload } from "@hms/types";

@Controller("beds")
@UseGuards(JwtAuthGuard)
export class BedsController {
  constructor(private readonly bedsService: BedsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("ward") ward?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.bedsService.findAll(user.organizationId!, ward, departmentId);
  }

  @Get("occupancy")
  getOccupancy(@CurrentUser() user: JwtPayload) {
    return this.bedsService.getOccupancySummary(user.organizationId!);
  }

  @Post()
  create(@Body() body: { bedNumber: string; ward: string; departmentId: string; notes?: string }, @CurrentUser() user: JwtPayload) {
    return this.bedsService.create(body, user.organizationId!);
  }

  @Patch(":id/admit")
  admit(@Param("id") id: string, @Body("patientId") patientId: string, @CurrentUser() user: JwtPayload) {
    return this.bedsService.admit(id, patientId, user.organizationId!);
  }

  @Patch(":id/discharge")
  discharge(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.bedsService.discharge(id, user.organizationId!);
  }

  @Patch(":id/transfer")
  transfer(@Param("id") id: string, @Body("targetBedId") targetBedId: string, @CurrentUser() user: JwtPayload) {
    return this.bedsService.transfer(id, targetBedId, user.organizationId!);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.bedsService.remove(id, user.organizationId!);
  }
}
