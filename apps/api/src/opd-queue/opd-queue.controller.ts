import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { OpdQueueService } from "./opd-queue.service";
import { CreateQueueDto } from "./dto/create-queue.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("opd-queue")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OpdQueueController {
  constructor(private readonly service: OpdQueueService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.OPD_MANAGE)
  enqueue(@Body() dto: CreateQueueDto, @CurrentUser() user: any) {
    return this.service.enqueue(dto, user.organizationId, user.staffId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.OPD_READ)
  findAll(
    @CurrentUser() user: any,
    @Query("departmentId") departmentId?: string,
    @Query("status") status?: string,
  ) {
    return this.service.findAll(user.organizationId, departmentId, status);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.OPD_READ)
  getSummary(@CurrentUser() user: any) {
    return this.service.getSummary(user.organizationId);
  }

  @Patch(":id/call")
  @RequirePermissions(PERMISSIONS.OPD_MANAGE)
  callNext(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.callNext(id, user.organizationId);
  }

  @Patch(":id/start")
  @RequirePermissions(PERMISSIONS.OPD_MANAGE)
  startConsultation(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.startConsultation(id, user.organizationId);
  }

  @Patch(":id/complete")
  @RequirePermissions(PERMISSIONS.OPD_MANAGE)
  complete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.complete(id, user.organizationId);
  }

  @Patch(":id/no-show")
  @RequirePermissions(PERMISSIONS.OPD_MANAGE)
  markNoShow(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.markNoShow(id, user.organizationId);
  }
}
