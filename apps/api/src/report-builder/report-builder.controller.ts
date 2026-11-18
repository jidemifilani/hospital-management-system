import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@hms/config";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RunReportDto, SaveReportDto, UpdateReportDto } from "./dto/report-builder.dto";
import { ReportBuilderService } from "./report-builder.service";

@Controller("report-builder")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportBuilderController {
  constructor(private readonly service: ReportBuilderService) {}

  /** What can be reported on. The UI builds itself from this. */
  @Get("sources")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  sources() {
    return this.service.listSources();
  }

  // Declared before the ":id" routes so a literal path segment is never
  // swallowed as a report id.
  @Get("saved")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  listSaved(@CurrentUser() u: any) {
    return this.service.listSaved(u.organizationId);
  }

  @Post("saved")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  save(@Body() dto: SaveReportDto, @CurrentUser() u: any) {
    return this.service.save(dto, u.staffId, u.organizationId);
  }

  @Get("saved/:id")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  getSaved(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.getSaved(id, u.organizationId);
  }

  @Patch("saved/:id")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  update(@Param("id") id: string, @Body() dto: UpdateReportDto, @CurrentUser() u: any) {
    return this.service.update(id, dto, u.organizationId);
  }

  @Delete("saved/:id")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  remove(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.remove(id, u.organizationId);
  }

  /**
   * Runs a saved report.
   *
   * POST rather than GET because it is audited: the audit interceptor records
   * what was asked for, and a report is a question about patient data even
   * when the answer is a count.
   */
  @Post("saved/:id/run")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  @HttpCode(HttpStatus.OK)
  runSaved(@Param("id") id: string, @CurrentUser() u: any) {
    return this.service.runSaved(id, u.organizationId);
  }

  /** Runs a report that has not been saved — the builder's preview. */
  @Post("run")
  @RequirePermissions(PERMISSIONS.ADMIN_CONFIG)
  @HttpCode(HttpStatus.OK)
  run(@Body() dto: RunReportDto, @CurrentUser() u: any) {
    return this.service.run(dto, u.organizationId);
  }
}
