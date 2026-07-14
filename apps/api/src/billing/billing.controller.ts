import {
  Controller, Get, Post, Body, Param, Query, Headers, RawBodyRequest,
  UseGuards, ParseIntPipe, DefaultValuePipe, Req, BadRequestException,
} from "@nestjs/common";
import type { Request } from "express";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import { PaystackService } from "./paystack.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@ApiTags("billing")
@ApiBearerAuth()
@Controller("billing")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly paystack: PaystackService,
  ) {}

  @Post("invoices")
  @RequirePermissions(PERMISSIONS.BILLING_CREATE)
  createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: JwtPayload) {
    return this.billing.createInvoice(dto, user.sub, user.organizationId!);
  }

  @Get("invoices")
  @RequirePermissions(PERMISSIONS.BILLING_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: string,
    @Query("patientId") patientId?: string,
    @Query("search") search?: string,
  ) {
    return this.billing.findAll(user.organizationId!, page, Math.min(limit, 100), {
      status, patientId, search,
    });
  }

  @Get("invoices/daily-summary")
  @RequirePermissions(PERMISSIONS.BILLING_READ)
  dailySummary(@CurrentUser() user: JwtPayload, @Query("date") date?: string) {
    return this.billing.getDailySummary(user.organizationId!, date);
  }

  @Get("invoices/:id")
  @RequirePermissions(PERMISSIONS.BILLING_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.billing.findOne(id, user.organizationId!);
  }

  @Post("webhooks/paystack")
  async paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-paystack-signature") signature: string,
    @Body() body: any,
  ) {
    const raw = req.rawBody?.toString() ?? JSON.stringify(body);
    if (!this.paystack.verifyWebhookSignature(raw, signature)) {
      throw new BadRequestException("Invalid webhook signature");
    }
    return this.billing.handlePaystackWebhook(body);
  }

  @Post("invoices/:id/pay/initiate")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.BILLING_READ)
  initiatePayment(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.billing.initiateOnlinePayment(id, user.organizationId!);
  }

  @Post("invoices/:id/payments")
  @RequirePermissions(PERMISSIONS.BILLING_CREATE)
  recordPayment(
    @Param("id") id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.billing.recordPayment(id, dto, user.staffId ?? user.sub, user.organizationId!);
  }
}
