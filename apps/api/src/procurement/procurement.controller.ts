import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ProcurementService } from "./procurement.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("procurement")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  create(@Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(dto, u.staffId, u.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PROCUREMENT_READ)
  findAll(@CurrentUser() u: any, @Query("status") status?: string) {
    return this.service.findAll(u.organizationId, status);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_READ)
  getSummary(@CurrentUser() u: any) {
    return this.service.getSummary(u.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_READ)
  findOne(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  updateStatus(@Param("id") id: string, @Body("status") status: string, @CurrentUser() u: any) {
    return this.service.updateStatus(id, status, u.organizationId);
  }

  @Patch(":id/items/:itemId/receive")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  receiveItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body("receivedQuantity") qty: number,
    @CurrentUser() u: any,
  ) {
    return this.service.receiveItem(id, itemId, qty, u.organizationId);
  }
}
