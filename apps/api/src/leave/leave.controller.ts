import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { LeaveService } from "./leave.service";
import { CreateLeaveDto } from "./dto/create-leave.dto";
import { ReviewLeaveDto } from "./dto/review-leave.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("leave")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.LEAVE_APPLY)
  apply(@CurrentUser() user: JwtPayload, @Body() dto: CreateLeaveDto) {
    return this.leaveService.apply(user.staffId!, user.organizationId!, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("staffId") staffId?: string,
    @Query("status") status?: string,
    @Query("type") type?: string,
  ) {
    return this.leaveService.findAll(user.organizationId!, page, limit, { staffId, status, type });
  }

  @Get("mine")
  @RequirePermissions(PERMISSIONS.LEAVE_APPLY)
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.leaveService.findMine(user.staffId!, page, limit);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.leaveService.getSummary(user.organizationId!);
  }

  @Patch(":id/review")
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  review(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.leaveService.review(id, user.staffId!, user.organizationId!, dto);
  }

  @Patch(":id/cancel")
  @RequirePermissions(PERMISSIONS.LEAVE_APPLY)
  cancel(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.leaveService.cancel(id, user.staffId!);
  }
}
