import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { CarePlansService } from "./care-plans.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import {
  AddCarePlanTaskDto,
  CreateCarePlanDto,
  UpdateCarePlanTaskDto,
} from "./dto/care-plan.dto";

@Controller("care-plans")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CarePlansController {
  constructor(private readonly service: CarePlansService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CARE_PLAN_MANAGE)
  create(@Body() dto: CreateCarePlanDto, @CurrentUser() u: any) {
    return this.service.create(dto, u.staffId, u.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CARE_PLAN_READ)
  findAll(
    @CurrentUser() u: any,
    @Query("patientId") patientId?: string,
    @Query("status") status?: string,
  ) {
    return this.service.findAll(u.organizationId, patientId, status);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.CARE_PLAN_READ)
  getSummary(@CurrentUser() u: any) {
    return this.service.getSummary(u.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.CARE_PLAN_READ)
  findOne(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.CARE_PLAN_MANAGE)
  updateStatus(@Param("id") id: string, @Body("status") status: string, @CurrentUser() u: any) {
    return this.service.updateStatus(id, status, u.organizationId);
  }

  @Post(":id/tasks")
  @RequirePermissions(PERMISSIONS.CARE_PLAN_MANAGE)
  addTask(@Param("id") id: string, @Body() dto: AddCarePlanTaskDto, @CurrentUser() u: any) {
    return this.service.addTask(id, dto, u.organizationId);
  }

  @Patch("tasks/:taskId")
  @RequirePermissions(PERMISSIONS.CARE_PLAN_MANAGE)
  updateTask(@Param("taskId") taskId: string, @Body() dto: UpdateCarePlanTaskDto, @CurrentUser() u: any) {
    return this.service.updateTask(taskId, dto, u.organizationId);
  }
}
