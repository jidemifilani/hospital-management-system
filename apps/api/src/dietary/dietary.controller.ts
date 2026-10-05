import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { DietaryService } from "./dietary.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import { CreateDietOrderDto, RecordMealDto } from "./dto/dietary.dto";

@Controller("dietary")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DietaryController {
  constructor(private readonly service: DietaryService) {}

  @Post("orders")
  @RequirePermissions(PERMISSIONS.DIETARY_MANAGE)
  createOrder(@Body() dto: CreateDietOrderDto, @CurrentUser() u: any) {
    return this.service.createOrder(dto, u.staffId, u.organizationId);
  }

  @Get("orders")
  @RequirePermissions(PERMISSIONS.DIETARY_READ)
  findAllOrders(
    @CurrentUser() u: any,
    @Query("patientId") patientId?: string,
    @Query("status") status?: string,
  ) {
    return this.service.findAllOrders(u.organizationId, patientId, status);
  }

  @Get("orders/summary")
  @RequirePermissions(PERMISSIONS.DIETARY_READ)
  getSummary(@CurrentUser() u: any) {
    return this.service.getSummary(u.organizationId);
  }

  @Get("orders/:id")
  @RequirePermissions(PERMISSIONS.DIETARY_READ)
  findOneOrder(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.findOneOrder(id, u.organizationId);
  }

  @Patch("orders/:id/status")
  @RequirePermissions(PERMISSIONS.DIETARY_MANAGE)
  updateOrderStatus(@Param("id") id: string, @Body("status") status: string, @CurrentUser() u: any) {
    return this.service.updateOrderStatus(id, status, u.organizationId);
  }

  @Post("meals")
  @RequirePermissions(PERMISSIONS.DIETARY_MANAGE)
  recordMeal(@Body() dto: RecordMealDto, @CurrentUser() u: any) {
    return this.service.recordMeal(dto, u.organizationId);
  }

  @Get("meals/today")
  @RequirePermissions(PERMISSIONS.DIETARY_READ)
  getTodayMeals(@CurrentUser() u: any) {
    return this.service.getTodayMeals(u.organizationId);
  }
}
