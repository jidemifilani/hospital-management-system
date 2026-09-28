import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { HelpdeskService } from "./helpdesk.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import type { TicketStatus, TicketTeam, TicketPriority } from "@prisma/client";
import {
  CreateTicketDto,
  AssignTicketDto,
  TicketCommentDto,
  UpdateTicketStatusDto,
  ReopenTicketDto,
} from "./dto/helpdesk.dto";

@Controller("helpdesk")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HelpdeskController {
  constructor(private readonly helpdesk: HelpdeskService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.MAINTENANCE_READ)
  list(
    @CurrentUser() user: JwtPayload,
    @Query("status") status?: TicketStatus,
    @Query("team") team?: TicketTeam,
    @Query("priority") priority?: TicketPriority,
    @Query("assignedToId") assignedToId?: string,
    @Query("overdueOnly") overdueOnly?: string,
  ) {
    return this.helpdesk.list(user.organizationId!, {
      status,
      team,
      priority,
      assignedToId,
      overdueOnly: overdueOnly === "true",
    });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.MAINTENANCE_READ)
  summary(@CurrentUser() user: JwtPayload) {
    return this.helpdesk.summary(user.organizationId!);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.MAINTENANCE_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.helpdesk.findOne(id, user.organizationId!);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MAINTENANCE_READ)
  create(@Body() body: CreateTicketDto, @CurrentUser() user: JwtPayload) {
    // Raising a ticket is deliberately open to anyone who can see the desk:
    // the person who finds a broken socket is rarely the one who fixes it.
    return this.helpdesk.create(body, user.organizationId!, user.staffId!);
  }

  @Patch(":id/assign")
  @RequirePermissions(PERMISSIONS.MAINTENANCE_MANAGE)
  assign(
    @Param("id") id: string,
    @Body() body: AssignTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.helpdesk.assign(id, body.assignedToId, user.organizationId!);
  }

  @Post(":id/comments")
  @RequirePermissions(PERMISSIONS.MAINTENANCE_READ)
  comment(
    @Param("id") id: string,
    @Body() body: TicketCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.helpdesk.comment(id, body, user.organizationId!, user.staffId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.MAINTENANCE_MANAGE)
  updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateTicketStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.helpdesk.updateStatus(id, body, user.organizationId!);
  }

  @Post(":id/reopen")
  @RequirePermissions(PERMISSIONS.MAINTENANCE_READ)
  reopen(
    @Param("id") id: string,
    @Body() body: ReopenTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.helpdesk.reopen(id, body.reason, user.organizationId!, user.staffId);
  }
}
