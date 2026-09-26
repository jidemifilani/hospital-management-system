import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { CatalogueService } from "./catalogue.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import type { ServiceCategory } from "@prisma/client";

@Controller("catalogue")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CATALOGUE_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("category") category?: ServiceCategory,
    @Query("search") search?: string,
    @Query("activeOnly") activeOnly?: string,
  ) {
    return this.catalogue.findAll(user.organizationId!, {
      category,
      search,
      activeOnly: activeOnly !== "false",
    });
  }

  @Get("categories")
  @RequirePermissions(PERMISSIONS.CATALOGUE_READ)
  categories(@CurrentUser() user: JwtPayload) {
    return this.catalogue.categories(user.organizationId!);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.CATALOGUE_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.catalogue.findOne(id, user.organizationId!);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CATALOGUE_MANAGE)
  create(
    @Body()
    body: {
      code: string;
      name: string;
      category: ServiceCategory;
      unitPrice: number;
      nhisPrice?: number;
      hmoPrice?: number;
      unit?: string;
      description?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogue.create(body, user.organizationId!);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.CATALOGUE_MANAGE)
  update(
    @Param("id") id: string,
    @Body()
    body: Partial<{
      name: string;
      category: ServiceCategory;
      unitPrice: number;
      nhisPrice: number | null;
      hmoPrice: number | null;
      unit: string;
      description: string;
      isActive: boolean;
    }>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.catalogue.update(id, body, user.organizationId!);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.CATALOGUE_MANAGE)
  deactivate(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.catalogue.deactivate(id, user.organizationId!);
  }
}
