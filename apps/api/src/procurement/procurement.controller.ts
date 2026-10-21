import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ProcurementService } from "./procurement.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import { CreatePurchaseOrderDto } from "./dto/purchase-order.dto";

@Controller("procurement")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() u: any) {
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

  // ── Goods Receipt Notes ────────────────────────────────────────────────────

  @Post(":id/grns")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  createGrn(@Param("id") id: string, @Body() body: any, @CurrentUser() u: any) {
    return this.service.createGrn(id, u.organizationId, u.staffId, body);
  }

  @Get(":id/grns")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_READ)
  listGrns(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.listGrns(id, u.organizationId);
  }

  // ── Supplier Invoices ──────────────────────────────────────────────────────

  @Post(":id/supplier-invoices")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  createSupplierInvoice(@Param("id") id: string, @Body() body: any, @CurrentUser() u: any) {
    return this.service.createSupplierInvoice(id, u.organizationId, body);
  }

  @Get(":id/supplier-invoices")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_READ)
  listSupplierInvoices(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.listSupplierInvoices(id, u.organizationId);
  }

  // ── 3-Way Match ────────────────────────────────────────────────────────────

  @Post("supplier-invoices/:siId/run-match")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  runMatch(@Param("siId") siId: string, @CurrentUser() u: any) {
    return this.service.runThreeWayMatch(siId, u.organizationId);
  }

  @Post("supplier-invoices/:siId/approve")
  @RequirePermissions(PERMISSIONS.PROCUREMENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  approveInvoice(@Param("siId") siId: string, @CurrentUser() u: any) {
    return this.service.approveSupplierInvoice(siId, u.organizationId);
  }
}
