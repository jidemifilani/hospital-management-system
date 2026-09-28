import { Controller, Get, Post, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./dto/department.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("departments")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: JwtPayload) {
    return this.departmentsService.create(dto, user.organizationId!);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.departmentsService.findAll(user.organizationId!);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.departmentsService.findOne(id, user.organizationId!);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.departmentsService.update(id, dto, user.organizationId!);
  }
}
