import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import type { InventoryCategory, StockLocationType } from "@prisma/client";

@Controller("inventory")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  // ── Catalogue ──────────────────────────────────────────────────────────────

  @Get("items")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  listItems(
    @CurrentUser() user: JwtPayload,
    @Query("category") category?: InventoryCategory,
    @Query("search") search?: string,
  ) {
    return this.inventory.listItems(user.organizationId!, { category, search });
  }

  @Post("items")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  createItem(
    @Body()
    body: {
      code: string;
      name: string;
      category?: InventoryCategory;
      unit: string;
      reorderLevel?: number;
      averageCost?: number;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventory.createItem(body, user.organizationId!);
  }

  @Get("locations")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  listLocations(@CurrentUser() user: JwtPayload) {
    return this.inventory.listLocations(user.organizationId!);
  }

  @Post("locations")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  createLocation(
    @Body()
    body: { code: string; name: string; type?: StockLocationType; departmentId?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventory.createLocation(body, user.organizationId!);
  }

  // ── Movements ──────────────────────────────────────────────────────────────

  @Post("receive")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  receive(
    @Body()
    body: {
      itemId: string;
      locationId: string;
      quantity: number;
      unitCost: number;
      reference?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventory.receive(body, user.organizationId!, user.staffId);
  }

  @Post("issue")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  issue(
    @Body()
    body: {
      itemId: string;
      locationId: string;
      quantity: number;
      type?: "ISSUE" | "CONSUMPTION" | "WRITE_OFF";
      reason?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventory.issue(body, user.organizationId!, user.staffId);
  }

  @Post("transfer")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  transfer(
    @Body()
    body: {
      itemId: string;
      fromLocationId: string;
      toLocationId: string;
      quantity: number;
      reason?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventory.transfer(body, user.organizationId!, user.staffId);
  }

  @Post("count")
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  adjust(
    @Body()
    body: { itemId: string; locationId: string; countedQuantity: number; reason: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventory.adjust(body, user.organizationId!, user.staffId);
  }

  // ── Reporting ──────────────────────────────────────────────────────────────

  @Get("stock")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  stock(@CurrentUser() user: JwtPayload, @Query("locationId") locationId?: string) {
    return this.inventory.stockOnHand(user.organizationId!, locationId);
  }

  @Get("low-stock")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  lowStock(@CurrentUser() user: JwtPayload) {
    return this.inventory.lowStock(user.organizationId!);
  }

  @Get("movements")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  movements(
    @CurrentUser() user: JwtPayload,
    @Query("itemId") itemId?: string,
    @Query("locationId") locationId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.inventory.movements(user.organizationId!, {
      itemId,
      locationId,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
