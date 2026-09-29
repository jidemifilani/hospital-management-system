import {
  Controller, Get, Post, Body, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsString, IsDateString } from "class-validator";
import { PortalService } from "./portal.service";
import { PatientAuthGuard } from "../common/guards/patient-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtPayload } from "@hms/types";

class PatientLoginDto {
  @IsString() phone: string;
  @IsDateString() dateOfBirth: string;
}

@ApiTags("portal")
@Controller("portal")
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Post("auth/login")
  login(@Body() dto: PatientLoginDto) {
    return this.portal.login(dto.phone, dto.dateOfBirth);
  }

  @Get("profile")
  @UseGuards(PatientAuthGuard)
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.portal.getProfile(user.sub);
  }

  @Get("appointments")
  @UseGuards(PatientAuthGuard)
  getAppointments(
    @CurrentUser() user: JwtPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.portal.getAppointments(user.sub, page, Math.min(limit, 50));
  }

  @Get("lab-results")
  @UseGuards(PatientAuthGuard)
  getLabResults(@CurrentUser() user: JwtPayload) {
    return this.portal.getLabResults(user.sub);
  }

  @Get("prescriptions")
  @UseGuards(PatientAuthGuard)
  getPrescriptions(@CurrentUser() user: JwtPayload) {
    return this.portal.getPrescriptions(user.sub);
  }

  @Get("invoices")
  @UseGuards(PatientAuthGuard)
  getInvoices(@CurrentUser() user: JwtPayload) {
    return this.portal.getInvoices(user.sub);
  }

  @Get("health-summary")
  @UseGuards(PatientAuthGuard)
  getHealthSummary(@CurrentUser() user: JwtPayload) {
    return this.portal.getEmrSummary(user.sub);
  }
}
