import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { DischargeService } from "./discharge.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";
import {
  CompleteDischargeRecordDto,
  CreateDischargeRecordDto,
} from "./dto/discharge.dto";

@Controller("discharge")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DischargeController {
  constructor(private readonly svc: DischargeService) {}

  @Get("summary")
  @RequirePermissions(PERMISSIONS.DISCHARGE_READ)
  summary(@Request() req: any) {
    return this.svc.getSummary(req.user.organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DISCHARGE_MANAGE)
  create(@Body() body: CreateDischargeRecordDto, @Request() req: any) {
    return this.svc.create(body, req.user.staffId, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.DISCHARGE_READ)
  findAll(@Query() q: any, @Request() req: any) {
    return this.svc.findAll(q, req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.DISCHARGE_READ)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.svc.findOne(id, req.user.organizationId);
  }

  @Patch(":id/complete")
  @RequirePermissions(PERMISSIONS.DISCHARGE_MANAGE)
  complete(@Param("id") id: string, @Body() body: CompleteDischargeRecordDto, @Request() req: any) {
    return this.svc.complete(id, body, req.user.organizationId);
  }

  @Patch(":id/cancel")
  @RequirePermissions(PERMISSIONS.DISCHARGE_MANAGE)
  cancel(@Param("id") id: string, @Request() req: any) {
    return this.svc.cancel(id, req.user.organizationId);
  }
}
