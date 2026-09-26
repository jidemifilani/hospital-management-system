import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { TriageService } from "./triage.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import { CreateTriageDto } from "./dto/create-triage.dto";

@Controller("triage")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TriageController {
  constructor(private readonly service: TriageService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.TRIAGE_MANAGE)
  create(@Body() dto: CreateTriageDto, @CurrentUser() u: any) {
    return this.service.create(dto, u.staffId, u.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.TRIAGE_READ)
  findAll(
    @CurrentUser() u: any,
    @Query("status") status?: string,
    @Query("triageLevel") triageLevel?: string,
    @Query("date") date?: string,
  ) {
    return this.service.findAll(u.organizationId, status, triageLevel, date);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.TRIAGE_READ)
  getSummary(@CurrentUser() u: any) {
    return this.service.getSummary(u.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.TRIAGE_READ)
  findOne(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.TRIAGE_MANAGE)
  updateStatus(@Param("id") id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateStatus(id, dto, u.organizationId);
  }
}
