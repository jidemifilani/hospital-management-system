import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { UpdateNotificationsDto } from "./dto/update-notifications.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("settings")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  get(@CurrentUser() user: any) {
    return this.service.get(user.organizationId);
  }

  @Patch("organization")
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  updateOrganization(@CurrentUser() user: any, @Body() dto: UpdateOrganizationDto) {
    return this.service.updateOrganization(user.organizationId, dto);
  }

  @Patch("notifications")
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  updateNotifications(@CurrentUser() user: any, @Body() dto: UpdateNotificationsDto) {
    return this.service.updateNotifications(user.organizationId, dto);
  }
}
