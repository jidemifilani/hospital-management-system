import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { FeedbackService } from "./feedback.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";
import { CreateFeedbackDto, RespondToFeedbackDto } from "./dto/feedback.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("feedback")
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.FEEDBACK_MANAGE)
  create(@Body() body: CreateFeedbackDto, @Request() req: any) {
    return this.service.create(body, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.FEEDBACK_READ)
  findAll(@Query() q: any, @Request() req: any) {
    return this.service.findAll(req.user.organizationId, { category: q.category, status: q.status, rating: q.rating ? Number(q.rating) : undefined });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.FEEDBACK_READ)
  getSummary(@Request() req: any) {
    return this.service.getSummary(req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.FEEDBACK_READ)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.organizationId);
  }

  @Patch(":id/respond")
  @RequirePermissions(PERMISSIONS.FEEDBACK_MANAGE)
  respond(@Param("id") id: string, @Body() body: RespondToFeedbackDto, @Request() req: any) {
    return this.service.respond(id, body, req.user.staffId, req.user.organizationId);
  }
}
