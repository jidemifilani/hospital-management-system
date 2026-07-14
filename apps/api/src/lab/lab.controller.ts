import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { LabService } from "./lab.service";
import { CreateLabOrderDto } from "./dto/create-lab-order.dto";
import { AddLabResultsDto } from "./dto/add-lab-results.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@ApiTags("lab")
@ApiBearerAuth()
@Controller("lab")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabController {
  constructor(private readonly lab: LabService) {}

  @Post("orders")
  @RequirePermissions(PERMISSIONS.LAB_CREATE)
  createOrder(@Body() dto: CreateLabOrderDto, @CurrentUser() user: JwtPayload) {
    return this.lab.createOrder(dto, user.staffId!, user.organizationId!);
  }

  @Get("orders")
  @RequirePermissions(PERMISSIONS.LAB_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: string,
    @Query("patientId") patientId?: string,
    @Query("priority") priority?: string,
  ) {
    return this.lab.findAll(user.organizationId!, page, Math.min(limit, 100), {
      status, patientId, priority,
    });
  }

  @Get("orders/:id")
  @RequirePermissions(PERMISSIONS.LAB_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.lab.findOne(id, user.organizationId!);
  }

  @Patch("orders/:id/collect")
  @RequirePermissions(PERMISSIONS.LAB_UPDATE)
  collectSample(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.lab.collectSample(id, user.staffId!, user.organizationId!);
  }

  @Post("orders/:id/results")
  @RequirePermissions(PERMISSIONS.LAB_UPDATE)
  addResults(
    @Param("id") id: string,
    @Body() dto: AddLabResultsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lab.addResults(id, dto, user.staffId!, user.organizationId!);
  }

  @Patch("orders/:id/verify")
  @RequirePermissions(PERMISSIONS.LAB_UPDATE)
  verifyResults(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.lab.verifyResults(id, user.staffId!, user.organizationId!);
  }
}
