import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { TrainingService } from "./training.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";

@Controller("training")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.TRAINING_MANAGE)
  create(@Body() body: any, @Req() req: any) {
    return this.trainingService.create(body, req.user.organizationId);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.TRAINING_READ)
  getSummary(@Req() req: any) {
    return this.trainingService.getSummary(req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.TRAINING_READ)
  findAll(@Query() q: any, @Req() req: any) {
    return this.trainingService.findAll(q, req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.TRAINING_READ)
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.trainingService.findOne(id, req.user.organizationId);
  }

  @Patch(":id/complete")
  @RequirePermissions(PERMISSIONS.TRAINING_MANAGE)
  complete(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.trainingService.complete(id, body, req.user.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.TRAINING_MANAGE)
  updateStatus(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.trainingService.updateStatus(id, body.status, req.user.organizationId);
  }
}
