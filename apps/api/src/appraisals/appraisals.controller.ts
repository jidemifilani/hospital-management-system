import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { AppraisalsService } from "./appraisals.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";
import {
  CreateAppraisalDto,
  UpdateAppraisalDto,
  UpdateAppraisalStatusDto,
} from "./dto/appraisal.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("appraisals")
export class AppraisalsController {
  constructor(private readonly service: AppraisalsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.APPRAISALS_MANAGE)
  create(@Body() body: CreateAppraisalDto, @Request() req: any) {
    return this.service.create(body, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.APPRAISALS_READ)
  findAll(@Query() q: any, @Request() req: any) {
    return this.service.findAll(req.user.organizationId, { staffId: q.staffId, status: q.status, year: q.year ? Number(q.year) : undefined });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.APPRAISALS_READ)
  getSummary(@Query() q: any, @Request() req: any) {
    return this.service.getSummary(req.user.organizationId, q.year ? Number(q.year) : undefined);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.APPRAISALS_READ)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.organizationId);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.APPRAISALS_MANAGE)
  update(@Param("id") id: string, @Body() body: UpdateAppraisalDto, @Request() req: any) {
    return this.service.update(id, body, req.user.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.APPRAISALS_MANAGE)
  updateStatus(@Param("id") id: string, @Body() body: UpdateAppraisalStatusDto, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user.organizationId);
  }
}
