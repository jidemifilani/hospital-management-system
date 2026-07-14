import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { IncidentsService } from "./incidents.service";
import { CreateIncidentDto, UpdateIncidentDto } from "./dto/create-incident.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("incidents")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.INCIDENTS_CREATE)
  create(@Body() dto: CreateIncidentDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.staffId ?? user.sub, user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.INCIDENTS_READ)
  findAll(
    @CurrentUser() user: any,
    @Query("status") status?: string,
    @Query("severity") severity?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.service.findAll(user.organizationId, status, severity, departmentId);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.INCIDENTS_READ)
  getSummary(@CurrentUser() user: any) {
    return this.service.getSummary(user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.INCIDENTS_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.organizationId);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.INCIDENTS_MANAGE)
  update(@Param("id") id: string, @Body() dto: UpdateIncidentDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.organizationId);
  }
}
