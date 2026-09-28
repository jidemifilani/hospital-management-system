import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { EncountersService } from "./encounters.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import {
  CreateEncounterDto,
  UpdateEncounterDto,
  UpdateEncounterStatusDto,
  CloseEncounterDto,
} from "./dto/encounter.dto";
import type { EncounterStatus, EncounterType } from "@prisma/client";

@Controller("encounters")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ENCOUNTERS_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("status") status?: EncounterStatus,
    @Query("type") type?: EncounterType,
    @Query("patientId") patientId?: string,
    @Query("openOnly") openOnly?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.encounters.findAll(user.organizationId!, {
      status,
      type,
      patientId,
      openOnly: openOnly === "true",
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.ENCOUNTERS_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.encounters.findOne(id, user.organizationId!);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ENCOUNTERS_MANAGE)
  create(@Body() body: CreateEncounterDto, @CurrentUser() user: JwtPayload) {
    return this.encounters.create(body, user.organizationId!, user.staffId);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.ENCOUNTERS_MANAGE)
  update(
    @Param("id") id: string,
    @Body() body: UpdateEncounterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.encounters.update(id, body, user.organizationId!);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.ENCOUNTERS_MANAGE)
  updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateEncounterStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.encounters.updateStatus(id, body.status, user.organizationId!);
  }

  @Post(":id/close")
  @RequirePermissions(PERMISSIONS.ENCOUNTERS_MANAGE)
  close(
    @Param("id") id: string,
    @Body() body: CloseEncounterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.encounters.close(id, body, user.organizationId!, user.staffId!);
  }
}
