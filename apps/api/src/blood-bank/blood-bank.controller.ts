import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { BloodBankService } from "./blood-bank.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import {
  AddBloodDonorDto,
  AddBloodUnitDto,
  CreateBloodRequestDto,
} from "./dto/blood-bank.dto";

@Controller("blood-bank")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BloodBankController {
  constructor(private readonly service: BloodBankService) {}

  @Get("inventory")
  @RequirePermissions(PERMISSIONS.BLOOD_BANK_READ)
  getInventory(@CurrentUser() u: any, @Query("bloodGroup") bg?: string, @Query("status") s?: string) {
    return this.service.getInventory(u.organizationId, bg, s);
  }

  @Get("inventory/summary")
  @RequirePermissions(PERMISSIONS.BLOOD_BANK_READ)
  getInventorySummary(@CurrentUser() u: any) {
    return this.service.getInventorySummary(u.organizationId);
  }

  @Post("inventory")
  @RequirePermissions(PERMISSIONS.BLOOD_BANK_MANAGE)
  addUnit(@Body() dto: AddBloodUnitDto, @CurrentUser() u: any) {
    return this.service.addUnit(dto, u.organizationId);
  }

  @Patch("inventory/:id/discard")
  @RequirePermissions(PERMISSIONS.BLOOD_BANK_MANAGE)
  discardUnit(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.discardUnit(id, u.organizationId);
  }

  @Get("donors")
  @RequirePermissions(PERMISSIONS.BLOOD_BANK_READ)
  getDonors(@CurrentUser() u: any, @Query("search") search?: string) {
    return this.service.getDonors(u.organizationId, search);
  }

  @Post("donors")
  @RequirePermissions(PERMISSIONS.BLOOD_BANK_MANAGE)
  addDonor(@Body() dto: AddBloodDonorDto, @CurrentUser() u: any) {
    return this.service.addDonor(dto, u.organizationId);
  }

  @Get("requests")
  @RequirePermissions(PERMISSIONS.BLOOD_BANK_READ)
  getRequests(@CurrentUser() u: any, @Query("status") status?: string) {
    return this.service.getRequests(u.organizationId, status);
  }

  @Post("requests")
  @RequirePermissions(PERMISSIONS.BLOOD_BANK_MANAGE)
  createRequest(@Body() dto: CreateBloodRequestDto, @CurrentUser() u: any) {
    return this.service.createRequest(dto, u.staffId ?? u.sub, u.organizationId);
  }

  @Patch("requests/:id/issue")
  @RequirePermissions(PERMISSIONS.BLOOD_BANK_MANAGE)
  issueBlood(@Param("id") id: string, @Body("unitIds") unitIds: string[], @CurrentUser() u: any) {
    return this.service.issueBlood(id, unitIds, u.organizationId);
  }

  @Patch("requests/:id/status")
  @RequirePermissions(PERMISSIONS.BLOOD_BANK_MANAGE)
  updateStatus(@Param("id") id: string, @Body("status") status: string, @CurrentUser() u: any) {
    return this.service.updateRequestStatus(id, status, u.organizationId);
  }
}
