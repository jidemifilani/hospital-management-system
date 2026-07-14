import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { SiteSettingsService } from "./site-settings.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("site-settings")
export class SiteSettingsController {
  constructor(private readonly service: SiteSettingsService) {}

  /** Public — no auth required (read-only for the public website) */
  @Get()
  get() {
    return this.service.get();
  }

  @Patch("content")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  updateContent(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateContent(user.organizationId!, body);
  }

  @Patch("theme")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  updateTheme(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateTheme(user.organizationId!, body);
  }
}
