import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import { UpdateAppointmentStatusDto } from "./dto/update-appointment-status.dto";
import type { JwtPayload } from "@hms/types";

@Controller("appointments")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_CREATE)
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.create(dto, user.organizationId!, user.sub);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("patientId") patientId?: string,
    @Query("doctorId") doctorId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("status") status?: string,
    @Query("date") date?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.appointmentsService.findAll(
      user.organizationId!,
      page,
      Math.min(limit, 100),
      { patientId, doctorId, departmentId, status, date, from, to },
    );
  }

  @Get("today")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  today(@CurrentUser() user: JwtPayload) {
    const todayStr = new Date().toISOString().split("T")[0];
    return this.appointmentsService.findAll(user.organizationId!, 1, 50, { date: todayStr });
  }

  @Get("my-today")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  todayForDoctor(@CurrentUser() user: JwtPayload) {
    if (!user.staffId) return { data: [] };
    return this.appointmentsService.getTodayForDoctor(user.staffId, user.organizationId!);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.findOne(id, user.organizationId!);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_UPDATE)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentsService.update(id, dto, user.organizationId!, user.sub);
  }

  @Post(":id/check-in")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_UPDATE)
  checkIn(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.checkIn(id, user.organizationId!, user.staffId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_UPDATE)
  updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateAppointmentStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!body.status) throw new BadRequestException("status is required");
    return this.appointmentsService.update(
      id,
      { status: body.status, cancelReason: body.cancelReason } as UpdateAppointmentDto,
      user.organizationId!,
      user.sub,
    );
  }
}
