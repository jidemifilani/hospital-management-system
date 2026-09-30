import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { AdmissionsService } from "./admissions.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import { AdmitPatientDto, TransferBedDto, DischargeDto } from "./dto/admission.dto";
import type { AdmissionStatus } from "@prisma/client";

@Controller("admissions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ADMISSIONS_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("status") status?: AdmissionStatus,
    @Query("patientId") patientId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admissions.findAll(user.organizationId!, {
      status,
      patientId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("census")
  @RequirePermissions(PERMISSIONS.ADMISSIONS_READ)
  census(@CurrentUser() user: JwtPayload) {
    return this.admissions.census(user.organizationId!);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.ADMISSIONS_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.admissions.findOne(id, user.organizationId!);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ADMISSIONS_MANAGE)
  admit(@Body() body: AdmitPatientDto, @CurrentUser() user: JwtPayload) {
    return this.admissions.admit(body, user.organizationId!, user.staffId);
  }

  @Patch(":id/transfer")
  @RequirePermissions(PERMISSIONS.ADMISSIONS_MANAGE)
  transfer(
    @Param("id") id: string,
    @Body() body: TransferBedDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissions.transferBed(id, body, user.organizationId!, user.staffId);
  }

  @Post(":id/discharge")
  @RequirePermissions(PERMISSIONS.ADMISSIONS_MANAGE)
  discharge(
    @Param("id") id: string,
    @Body() body: DischargeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissions.discharge(id, body, user.organizationId!, user.staffId!);
  }
}
