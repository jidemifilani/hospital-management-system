import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { RadiologyService } from "./radiology.service";
import { CreateRadiologyOrderDto } from "./dto/create-radiology-order.dto";
import { AddRadiologyResultDto } from "./dto/add-radiology-result.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("radiology")
export class RadiologyController {
  constructor(private readonly radiologyService: RadiologyService) {}

  @Post("orders")
  @RequirePermissions(PERMISSIONS.RADIOLOGY_ORDER)
  createOrder(@Body() dto: CreateRadiologyOrderDto, @CurrentUser() user: any) {
    return this.radiologyService.createOrder(dto, user.staffId, user.organizationId);
  }

  @Get("orders")
  @RequirePermissions(PERMISSIONS.RADIOLOGY_READ)
  findAll(
    @CurrentUser() user: any,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: string,
    @Query("patientId") patientId?: string,
    @Query("modality") modality?: string,
    @Query("priority") priority?: string,
  ) {
    return this.radiologyService.findAll(user.organizationId, page, limit, {
      status, patientId, modality, priority,
    });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.RADIOLOGY_READ)
  getSummary(@CurrentUser() user: any) {
    return this.radiologyService.getSummary(user.organizationId);
  }

  @Get("orders/:id")
  @RequirePermissions(PERMISSIONS.RADIOLOGY_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.radiologyService.findOne(id, user.organizationId);
  }

  @Patch("orders/:id/schedule")
  @RequirePermissions(PERMISSIONS.RADIOLOGY_ORDER)
  scheduleOrder(
    @Param("id") id: string,
    @Body("scheduledAt") scheduledAt: string,
    @CurrentUser() user: any,
  ) {
    return this.radiologyService.scheduleOrder(id, scheduledAt, user.organizationId);
  }

  @Patch("orders/:id/start")
  @RequirePermissions(PERMISSIONS.RADIOLOGY_RESULT)
  startScan(@Param("id") id: string, @CurrentUser() user: any) {
    return this.radiologyService.startScan(id, user.staffId, user.organizationId);
  }

  @Patch("orders/:id/result")
  @RequirePermissions(PERMISSIONS.RADIOLOGY_RESULT)
  addResult(@Param("id") id: string, @Body() dto: AddRadiologyResultDto, @CurrentUser() user: any) {
    return this.radiologyService.addResult(id, dto, user.staffId, user.organizationId);
  }

  @Patch("orders/:id/verify")
  @RequirePermissions(PERMISSIONS.RADIOLOGY_RESULT)
  verifyResult(@Param("id") id: string, @CurrentUser() user: any) {
    return this.radiologyService.verifyResult(id, user.staffId, user.organizationId);
  }

  @Patch("orders/:id/cancel")
  @RequirePermissions(PERMISSIONS.RADIOLOGY_ORDER)
  cancelOrder(@Param("id") id: string, @CurrentUser() user: any) {
    return this.radiologyService.cancelOrder(id, user.organizationId);
  }
}
