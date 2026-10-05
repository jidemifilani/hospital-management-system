import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { HandoverService } from "./handover.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";
import { CreateHandoverDto } from "./dto/handover.dto";

@Controller("handover")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HandoverController {
  constructor(private readonly handoverService: HandoverService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.HANDOVER_MANAGE)
  create(@Body() body: CreateHandoverDto, @Req() req: any) {
    return this.handoverService.create(body, req.user.staffId, req.user.organizationId);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.HANDOVER_READ)
  getSummary(@Req() req: any) {
    return this.handoverService.getSummary(req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.HANDOVER_READ)
  findAll(@Query() q: any, @Req() req: any) {
    return this.handoverService.findAll(q, req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.HANDOVER_READ)
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.handoverService.findOne(id, req.user.organizationId);
  }

  @Patch(":id/acknowledge")
  @RequirePermissions(PERMISSIONS.HANDOVER_MANAGE)
  acknowledge(@Param("id") id: string, @Req() req: any) {
    return this.handoverService.acknowledge(id, req.user.staffId, req.user.organizationId);
  }
}
