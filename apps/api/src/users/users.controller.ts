import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ADMIN_USERS)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    dto.organizationId = dto.organizationId || user.organizationId!;
    return this.usersService.create(dto, user.sub);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STAFF_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("search") search?: string,
  ) {
    return this.usersService.findAll(user.organizationId!, page, Math.min(limit, 100), search);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.STAFF_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(id, user.organizationId!);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.ADMIN_USERS)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, dto, user.organizationId!);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.ADMIN_USERS)
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: "ACTIVE" | "INACTIVE" | "SUSPENDED",
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateStatus(id, status, user.organizationId!);
  }

  @Post(":id/reset-password")
  @RequirePermissions(PERMISSIONS.ADMIN_USERS)
  async resetPassword(
    @Param("id") id: string,
    @Body("newPassword") newPassword: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.usersService.resetPassword(id, newPassword, user.organizationId!, user.sub);
    return { message: "Password reset successfully" };
  }
}
