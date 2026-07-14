import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { CreateDrugItemDto } from "./dto/create-drug-item.dto";
import { RestockDrugDto } from "./dto/restock-drug.dto";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { PharmacyService } from "./pharmacy.service";
import { CreatePrescriptionDto } from "./dto/create-prescription.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@ApiTags("pharmacy")
@ApiBearerAuth()
@Controller("pharmacy")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PharmacyController {
  constructor(private readonly pharmacy: PharmacyService) {}

  @Post("prescriptions")
  @RequirePermissions(PERMISSIONS.PHARMACY_CREATE)
  createPrescription(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: JwtPayload) {
    return this.pharmacy.createPrescription(dto, user.staffId!, user.organizationId!);
  }

  @Get("prescriptions")
  @RequirePermissions(PERMISSIONS.PHARMACY_READ)
  findPrescriptions(
    @CurrentUser() user: JwtPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: string,
    @Query("patientId") patientId?: string,
  ) {
    return this.pharmacy.findPrescriptions(user.organizationId!, page, Math.min(limit, 50), {
      status, patientId,
    });
  }

  @Get("prescriptions/:id")
  @RequirePermissions(PERMISSIONS.PHARMACY_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.pharmacy.findOnePrescription(id, user.organizationId!);
  }

  @Patch("prescriptions/:id/dispense")
  @RequirePermissions(PERMISSIONS.PHARMACY_UPDATE)
  dispense(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.pharmacy.dispensePrescription(id, user.staffId!, user.organizationId!);
  }

  @Post("drugs")
  @RequirePermissions(PERMISSIONS.PHARMACY_CREATE)
  createDrug(@Body() dto: CreateDrugItemDto, @CurrentUser() user: JwtPayload) {
    return this.pharmacy.createDrugItem(dto, user.organizationId!);
  }

  @Post("drugs/:id/restock")
  @RequirePermissions(PERMISSIONS.PHARMACY_UPDATE)
  restockDrug(@Param("id") id: string, @Body() dto: RestockDrugDto, @CurrentUser() user: JwtPayload) {
    return this.pharmacy.restockDrug(id, dto, user.organizationId!);
  }

  @Get("drugs/catalogue")
  @RequirePermissions(PERMISSIONS.PHARMACY_READ)
  getCatalogue(@CurrentUser() user: JwtPayload, @Query("search") search?: string) {
    return this.pharmacy.getDrugCatalogue(user.organizationId!, search);
  }

  @Get("drugs")
  @RequirePermissions(PERMISSIONS.PHARMACY_READ)
  getDrugs(@CurrentUser() user: JwtPayload, @Query("search") search?: string) {
    return this.pharmacy.getDrugItems(user.organizationId!, search);
  }

  @Get("drugs/low-stock")
  @RequirePermissions(PERMISSIONS.PHARMACY_READ)
  lowStock(@CurrentUser() user: JwtPayload) {
    return this.pharmacy.getLowStockAlert(user.organizationId!);
  }
}
