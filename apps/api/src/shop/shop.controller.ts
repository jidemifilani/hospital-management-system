import {
  Controller, Get, Post, Body, Query, UseGuards,
} from "@nestjs/common";
import { ShopService } from "./shop.service";
import { PatientAuthGuard } from "../common/guards/patient-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtPayload } from "@hms/types";
import { IsString, IsInt, Min, IsOptional, IsArray, ValidateNested, IsIn } from "class-validator";
import { Type } from "class-transformer";

class CartItemDto {
  @IsString() itemId: string;
  @IsInt() @Min(1) quantity: number;
}

class PlaceOrderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsOptional() @IsIn(["PICKUP", "DELIVERY"]) deliveryMethod?: "PICKUP" | "DELIVERY";
  @IsOptional() @IsString() deliveryAddress?: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller("shop")
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  /** Public catalog — no auth required; org resolved from query param */
  @Get("catalog")
  getCatalog(@Query("orgId") orgId: string) {
    return this.shop.getCatalog(orgId);
  }

  @Post("orders")
  @UseGuards(PatientAuthGuard)
  placeOrder(@Body() dto: PlaceOrderDto, @CurrentUser() user: JwtPayload) {
    return this.shop.placeOrder(user.sub, user.organizationId!, dto);
  }

  @Get("orders")
  @UseGuards(PatientAuthGuard)
  getOrders(@CurrentUser() user: JwtPayload) {
    return this.shop.getOrders(user.sub);
  }

  @Get("callback")
  handleCallback(@Query("reference") reference: string) {
    return this.shop.confirmPayment(reference);
  }
}
