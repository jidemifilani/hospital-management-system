import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { RecallService } from "./recall.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import type { RecallStatus } from "@prisma/client";
import {
  RaiseRecallDto,
  LogAttemptDto,
  BookRecallDto,
  CancelRecallDto,
} from "./dto/recall.dto";

@Controller("recalls")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecallController {
  constructor(private readonly recall: RecallService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  list(
    @CurrentUser() user: JwtPayload,
    @Query("status") status?: RecallStatus,
    @Query("due") due?: "overdue" | "today" | "upcoming",
  ) {
    return this.recall.list(user.organizationId!, { status, due });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  summary(@CurrentUser() user: JwtPayload) {
    return this.recall.summary(user.organizationId!);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_CREATE)
  raise(@Body() body: RaiseRecallDto, @CurrentUser() user: JwtPayload) {
    return this.recall.raise(body, user.organizationId!);
  }

  @Post(":id/attempts")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_CREATE)
  logAttempt(
    @Param("id") id: string,
    @Body() body: LogAttemptDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recall.logAttempt(id, body, user.organizationId!, user.staffId);
  }

  @Patch(":id/book")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_CREATE)
  book(
    @Param("id") id: string,
    @Body() body: BookRecallDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recall.book(id, body.appointmentId, user.organizationId!);
  }

  @Patch(":id/attended")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_UPDATE)
  attended(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.recall.markAttended(id, user.organizationId!);
  }

  @Patch(":id/cancel")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_UPDATE)
  cancel(
    @Param("id") id: string,
    @Body() body: CancelRecallDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recall.cancel(id, body.reason, user.organizationId!);
  }
}
