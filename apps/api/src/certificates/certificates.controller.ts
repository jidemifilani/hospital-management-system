import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { CertificatesService } from "./certificates.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";
import { CreateCertificateDto, RevokeCertificateDto } from "./dto/certificate.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("certificates")
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CERTIFICATES_MANAGE)
  create(@Body() body: CreateCertificateDto, @Request() req: any) {
    return this.service.create(body, req.user.staffId, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  findAll(@Query() q: any, @Request() req: any) {
    return this.service.findAll(req.user.organizationId, { type: q.type, status: q.status, patientId: q.patientId });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  getSummary(@Request() req: any) {
    return this.service.getSummary(req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.organizationId);
  }

  @Patch(":id/issue")
  @RequirePermissions(PERMISSIONS.CERTIFICATES_MANAGE)
  issue(@Param("id") id: string, @Request() req: any) {
    return this.service.issue(id, req.user.organizationId);
  }

  @Patch(":id/revoke")
  @RequirePermissions(PERMISSIONS.CERTIFICATES_MANAGE)
  revoke(@Param("id") id: string, @Body() body: RevokeCertificateDto, @Request() req: any) {
    return this.service.revoke(id, body.revokedReason, req.user.organizationId);
  }
}
