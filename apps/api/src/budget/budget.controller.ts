import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { BudgetService } from "./budget.service";
import { SetBudgetDto } from "./dto/budget.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("budget")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  list(
    @CurrentUser() u: JwtPayload,
    @Query("year") year: string,
    @Query("month") month?: string,
  ) {
    return this.service.listBudgets(u.organizationId!, parseInt(year), month ? parseInt(month) : undefined);
  }

  @Get("vs-actuals")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  vsActuals(
    @CurrentUser() u: JwtPayload,
    @Query("year") year: string,
    @Query("month") month?: string,
  ) {
    return this.service.budgetVsActuals(u.organizationId!, parseInt(year), month ? parseInt(month) : undefined);
  }

  @Get("years")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
  years(@CurrentUser() u: JwtPayload) {
    return this.service.availableYears(u.organizationId!);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  set(@Body() dto: SetBudgetDto, @CurrentUser() u: JwtPayload) {
    return this.service.setBudget(dto, u.organizationId!);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() u: JwtPayload) {
    return this.service.deleteBudget(id, u.organizationId!);
  }
}
