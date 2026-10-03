import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { ConsentService } from "./consent.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";
import {
  CreateConsentFormDto,
  RevokeConsentFormDto,
  SignConsentFormDto,
  UpdateConsentStatusDto,
} from "./dto/consent.dto";

@Controller("consent")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConsentController {
  constructor(private readonly svc: ConsentService) {}

  @Get("summary")
  @RequirePermissions(PERMISSIONS.CONSENT_READ)
  summary(@Request() req: any) {
    return this.svc.getSummary(req.user.organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CONSENT_MANAGE)
  create(@Body() body: CreateConsentFormDto, @Request() req: any) {
    return this.svc.create(body, req.user.staffId, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CONSENT_READ)
  findAll(@Query() q: any, @Request() req: any) {
    return this.svc.findAll(q, req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.CONSENT_READ)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.svc.findOne(id, req.user.organizationId);
  }

  @Patch(":id/sign")
  @RequirePermissions(PERMISSIONS.CONSENT_MANAGE)
  sign(@Param("id") id: string, @Body() body: SignConsentFormDto, @Request() req: any) {
    return this.svc.sign(id, body, req.user.organizationId);
  }

  @Patch(":id/revoke")
  @RequirePermissions(PERMISSIONS.CONSENT_MANAGE)
  revoke(@Param("id") id: string, @Body() body: RevokeConsentFormDto, @Request() req: any) {
    return this.svc.revoke(id, body, req.user.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.CONSENT_MANAGE)
  updateStatus(@Param("id") id: string, @Body() body: UpdateConsentStatusDto, @Request() req: any) {
    return this.svc.updateStatus(id, body, req.user.organizationId);
  }
}
