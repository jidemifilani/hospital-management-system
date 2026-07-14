import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { PayrollService } from "./payroll.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("payroll")
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  create(@Body() body: any, @Request() req: any) {
    return this.service.create(body, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  findAll(@Query() q: any, @Request() req: any) {
    return this.service.findAll(req.user.organizationId, {
      month: q.month ? Number(q.month) : undefined,
      year: q.year ? Number(q.year) : undefined,
      staffId: q.staffId,
      status: q.status,
    });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  getSummary(@Query() q: any, @Request() req: any) {
    return this.service.getSummary(req.user.organizationId, q.month ? Number(q.month) : undefined, q.year ? Number(q.year) : undefined);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  updateStatus(@Param("id") id: string, @Body() body: any, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user.organizationId, body);
  }
}
