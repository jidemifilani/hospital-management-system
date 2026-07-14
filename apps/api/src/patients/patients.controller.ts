import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@Controller("patients")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PATIENTS_CREATE)
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: JwtPayload) {
    return this.patientsService.create(dto, user.organizationId!, user.sub);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("search") search?: string,
  ) {
    return this.patientsService.findAll(user.organizationId!, page, Math.min(limit, 100), search);
  }

  @Get("by-mrn/:mrn")
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  findByMrn(@Param("mrn") mrn: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.findByMrn(mrn, user.organizationId!);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.findOne(id, user.organizationId!);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.PATIENTS_UPDATE)
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.update(id, dto, user.organizationId!, user.sub);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.PATIENTS_DELETE)
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.remove(id, user.organizationId!);
  }
}
