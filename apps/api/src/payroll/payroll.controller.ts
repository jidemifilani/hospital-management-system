import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { PayrollService } from "./payroll.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@hms/config";
import { CreatePayrollDto, UpdatePayrollStatusDto, ComputeTaxDto, CreateSalaryGradeDto, UpdateSalaryGradeDto } from "./dto/payroll.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("payroll")
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  create(@Body() body: CreatePayrollDto, @Request() req: any) {
    return this.service.create(body, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  findAll(@Query() q: any, @Request() req: any) {
    return this.service.findAll(req.user.organizationId, {
      month: q.month ? Number(q.month) : undefined,
      year: q.year ? Number(q.year) : undefined,
      staffId: q.staffId,
      status: q.status,
    });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  getSummary(@Query() q: any, @Request() req: any) {
    return this.service.getSummary(req.user.organizationId, q.month ? Number(q.month) : undefined, q.year ? Number(q.year) : undefined);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.organizationId);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  updateStatus(@Param("id") id: string, @Body() body: UpdatePayrollStatusDto, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user.organizationId, body);
  }

  // ── Tax computation ──────────────────────────────────────────────────────────

  @Post("compute-tax")
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  computeTax(@Body() body: ComputeTaxDto) {
    return this.service.computeTax({
      basicSalary:        body.basicSalary,
      housingAllowance:   body.housingAllowance   ?? 0,
      transportAllowance: body.transportAllowance ?? 0,
      medicalAllowance:   body.medicalAllowance   ?? 0,
      otherAllowances:    body.otherAllowances    ?? 0,
      applyNhf:           body.applyNhf           ?? true,
    });
  }

  // ── Salary grades ────────────────────────────────────────────────────────────

  @Get("salary-grades")
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  listGrades(@Request() req: any) {
    return this.service.listSalaryGrades(req.user.organizationId);
  }

  @Post("salary-grades")
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  createGrade(@Body() body: CreateSalaryGradeDto, @Request() req: any) {
    return this.service.createSalaryGrade(body, req.user.organizationId);
  }

  @Get("salary-grades/:id/preview")
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  previewGrade(@Param("id") id: string, @Query("nhf") nhf: string, @Request() req: any) {
    return this.service.previewGrade(id, req.user.organizationId, nhf !== "false");
  }

  @Patch("salary-grades/:id")
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  updateGrade(@Param("id") id: string, @Body() body: UpdateSalaryGradeDto, @Request() req: any) {
    return this.service.updateSalaryGrade(id, body, req.user.organizationId);
  }

  @Delete("salary-grades/:id")
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  deleteGrade(@Param("id") id: string, @Request() req: any) {
    return this.service.deleteSalaryGrade(id, req.user.organizationId);
  }
}
