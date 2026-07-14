import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { EmrService } from "./emr.service";
import { CreateVitalSignsDto } from "./dto/create-vital-signs.dto";
import { CreateClinicalNoteDto } from "./dto/create-clinical-note.dto";
import { CreateDiagnosisDto } from "./dto/create-diagnosis.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PERMISSIONS } from "@hms/config";
import type { JwtPayload } from "@hms/types";

@ApiTags("emr")
@ApiBearerAuth()
@Controller("emr")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmrController {
  constructor(private readonly emr: EmrService) {}

  // ── Patient Summary ───────────────────────────────────────────────────────

  @Get("patients/:patientId/summary")
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  @ApiOperation({ summary: "Full EMR snapshot for a patient" })
  summary(@Param("patientId") id: string, @CurrentUser() user: JwtPayload) {
    return this.emr.getPatientSummary(id, user.organizationId!);
  }

  // ── Vital Signs ───────────────────────────────────────────────────────────

  @Post("vitals")
  @RequirePermissions(PERMISSIONS.PATIENTS_UPDATE)
  recordVitals(@Body() dto: CreateVitalSignsDto, @CurrentUser() user: JwtPayload) {
    return this.emr.recordVitals(dto, user.staffId!, user.organizationId!);
  }

  @Get("patients/:patientId/vitals")
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  getVitals(
    @Param("patientId") id: string,
    @CurrentUser() user: JwtPayload,
    @Query("limit") limit?: number,
  ) {
    return this.emr.getVitalsHistory(id, user.organizationId!, limit);
  }

  // ── Clinical Notes ────────────────────────────────────────────────────────

  @Post("notes")
  @RequirePermissions(PERMISSIONS.PATIENTS_UPDATE)
  createNote(@Body() dto: CreateClinicalNoteDto, @CurrentUser() user: JwtPayload) {
    return this.emr.createNote(dto, user.staffId!, user.organizationId!);
  }

  @Get("patients/:patientId/notes")
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  getNotes(
    @Param("patientId") id: string,
    @CurrentUser() user: JwtPayload,
    @Query("appointmentId") appointmentId?: string,
  ) {
    return this.emr.getNotes(id, user.organizationId!, appointmentId);
  }

  @Patch("notes/:id")
  @RequirePermissions(PERMISSIONS.PATIENTS_UPDATE)
  updateNote(
    @Param("id") id: string,
    @Body() dto: Partial<CreateClinicalNoteDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.emr.updateNote(id, dto, user.staffId!, user.organizationId!);
  }

  // ── Diagnoses ─────────────────────────────────────────────────────────────

  @Post("diagnoses")
  @RequirePermissions(PERMISSIONS.PATIENTS_UPDATE)
  createDiagnosis(@Body() dto: CreateDiagnosisDto, @CurrentUser() user: JwtPayload) {
    return this.emr.createDiagnosis(dto, user.staffId!, user.organizationId!);
  }

  @Get("patients/:patientId/diagnoses")
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  getDiagnoses(@Param("patientId") id: string, @CurrentUser() user: JwtPayload) {
    return this.emr.getDiagnoses(id, user.organizationId!);
  }

  @Patch("diagnoses/:id")
  @RequirePermissions(PERMISSIONS.PATIENTS_UPDATE)
  updateDiagnosis(
    @Param("id") id: string,
    @Body() body: { status?: string; resolvedAt?: string; notes?: string },
  ) {
    return this.emr.updateDiagnosis(id, {
      ...body,
      resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : undefined,
    });
  }
}
