import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { AssetsService } from "./assets.service";
import { DepreciationService } from "./depreciation.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import {
  CompleteMaintenanceDto,
  CreateAssetDto,
  ScheduleMaintenanceDto,
  UpdateAssetDto,
} from "./dto/asset.dto";
import { SetupDepreciationDto, RunDepreciationDto } from "./dto/depreciation.dto";

@Controller("assets")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(
    private readonly service: AssetsService,
    private readonly depreciation: DepreciationService,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ASSETS_MANAGE)
  create(@Body() dto: CreateAssetDto, @CurrentUser() u: any) {
    return this.service.create(dto, u.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ASSETS_READ)
  findAll(
    @CurrentUser() u: any,
    @Query("category") category?: string,
    @Query("status") status?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.service.findAll(u.organizationId, category, status, departmentId);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.ASSETS_READ)
  getSummary(@CurrentUser() u: any) {
    return this.service.getSummary(u.organizationId);
  }

  // ── Depreciation ────────────────────────────────────────────────────────────
  // Declared ahead of the ":id" routes so a literal path segment is never
  // swallowed as an asset id.

  @Get("depreciation/register")
  @RequirePermissions(PERMISSIONS.ASSETS_READ)
  register(@CurrentUser() u: any) {
    return this.depreciation.register(u.organizationId);
  }

  @Get("depreciation/period")
  @RequirePermissions(PERMISSIONS.ASSETS_READ)
  periodEntries(@CurrentUser() u: any, @Query("year") year: string, @Query("month") month: string) {
    return this.depreciation.periodEntries(parseInt(year), parseInt(month), u.organizationId);
  }

  @Post("depreciation/run")
  @RequirePermissions(PERMISSIONS.ASSETS_MANAGE)
  @HttpCode(HttpStatus.OK)
  runDepreciation(@Body() dto: RunDepreciationDto, @CurrentUser() u: any) {
    return this.depreciation.runMonth(dto.year, dto.month, u.organizationId, u.staffId ?? undefined);
  }

  @Post(":id/depreciation/setup")
  @RequirePermissions(PERMISSIONS.ASSETS_MANAGE)
  setupDepreciation(@Param("id") id: string, @Body() dto: SetupDepreciationDto, @CurrentUser() u: any) {
    return this.depreciation.setup(id, dto, u.organizationId);
  }

  @Get(":id/depreciation/schedule")
  @RequirePermissions(PERMISSIONS.ASSETS_READ)
  schedule(@Param("id") id: string, @CurrentUser() u: any) {
    return this.depreciation.schedule(id, u.organizationId);
  }

  @Get(":id/depreciation/entries")
  @RequirePermissions(PERMISSIONS.ASSETS_READ)
  depreciationEntries(@Param("id") id: string, @CurrentUser() u: any) {
    return this.depreciation.entries(id, u.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.ASSETS_READ)
  findOne(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.findOne(id, u.organizationId);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.ASSETS_MANAGE)
  update(@Param("id") id: string, @Body() dto: UpdateAssetDto, @CurrentUser() u: any) {
    return this.service.update(id, dto, u.organizationId);
  }

  @Post(":id/maintenance")
  @RequirePermissions(PERMISSIONS.ASSETS_MANAGE)
  scheduleMaintenance(@Param("id") id: string, @Body() dto: ScheduleMaintenanceDto, @CurrentUser() u: any) {
    return this.service.scheduleMaintenance(id, dto, u.organizationId);
  }

  @Patch("maintenance/:maintenanceId/complete")
  @RequirePermissions(PERMISSIONS.ASSETS_MANAGE)
  completeMaintenance(@Param("maintenanceId") id: string, @Body() dto: CompleteMaintenanceDto, @CurrentUser() u: any) {
    return this.service.completeMaintenance(id, dto, u.organizationId);
  }
}
