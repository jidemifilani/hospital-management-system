import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { TransportService } from "./transport.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";
import {
  CreateAmbulanceDto,
  CreateTransportDto,
  DispatchTransportDto,
  UpdateAmbulanceStatusDto,
  UpdateTransportStatusDto,
} from "./dto/transport.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("transport")
export class TransportController {
  constructor(private readonly service: TransportService) {}

  // ─── Ambulances ───────────────────────────────────────────────────────────

  @Post("ambulances")
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  createAmbulance(@Body() body: CreateAmbulanceDto, @Request() req: any) {
    return this.service.createAmbulance(body, req.user.organizationId);
  }

  @Get("ambulances")
  @RequirePermissions(PERMISSIONS.TRANSPORT_READ)
  findAllAmbulances(@Query() q: any, @Request() req: any) {
    return this.service.findAllAmbulances(req.user.organizationId, q.status);
  }

  @Patch("ambulances/:id/status")
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  updateAmbulanceStatus(@Param("id") id: string, @Body() body: UpdateAmbulanceStatusDto, @Request() req: any) {
    return this.service.updateAmbulanceStatus(id, body.status, body, req.user.organizationId);
  }

  // ─── Transports ───────────────────────────────────────────────────────────

  @Post()
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  createTransport(@Body() body: CreateTransportDto, @Request() req: any) {
    return this.service.createTransport(body, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.TRANSPORT_READ)
  findAllTransports(@Query() q: any, @Request() req: any) {
    return this.service.findAllTransports(req.user.organizationId, { status: q.status, type: q.type });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.TRANSPORT_READ)
  getSummary(@Request() req: any) {
    return this.service.getSummary(req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.TRANSPORT_READ)
  findOneTransport(@Param("id") id: string, @Request() req: any) {
    return this.service.findOneTransport(id, req.user.organizationId);
  }

  @Patch(":id/dispatch")
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  dispatch(@Param("id") id: string, @Body() body: DispatchTransportDto, @Request() req: any) {
    return this.service.dispatch(id, body.ambulanceId, req.user.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  updateStatus(@Param("id") id: string, @Body() body: UpdateTransportStatusDto, @Request() req: any) {
    return this.service.updateTransportStatus(id, body, req.user.organizationId);
  }
}
