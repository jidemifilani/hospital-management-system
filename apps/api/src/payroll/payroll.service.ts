import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";
import { Decimal } from "@prisma/client/runtime/library";
import { computeNigerianTax, TaxInput } from "./tax.engine";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, organizationId: string) {
    const existing = await this.prisma.payroll.findUnique({
      where: { staffId_month_year: { staffId: data.staffId, month: Number(data.month), year: Number(data.year) } },
    });
    if (existing) throw new ConflictException("Payroll already exists for this staff, month, and year");

    const components: any[] = data.components ?? [];

    // Auto-compute statutory deductions if requested
    if (data.autoComputeStatutory) {
      const taxInput = this._buildTaxInput(components);
      const tax = computeNigerianTax({ ...taxInput, applyNhf: data.applyNhf !== false });

      // Replace any existing PAYE / pension / NHF lines with computed values
      const filtered = components.filter(
        (c) => !["TAX_DEDUCTION", "PENSION_DEDUCTION", "NHF_DEDUCTION"].includes(c.type),
      );
      if (tax.pensionEmployee > 0)
        filtered.push({ type: "PENSION_DEDUCTION", label: "Pension (Employee 8%)", amount: tax.pensionEmployee, isDeduction: true });
      if (tax.nhf > 0)
        filtered.push({ type: "NHF_DEDUCTION", label: "NHF (2.5%)", amount: tax.nhf, isDeduction: true });
      if (tax.payeTax > 0)
        filtered.push({ type: "TAX_DEDUCTION", label: "PAYE Tax", amount: tax.payeTax, isDeduction: true });

      components.splice(0, components.length, ...filtered);
      data._tax = tax;
    }

    let grossPay = new Decimal(0);
    let totalDeductions = new Decimal(0);

    for (const c of components) {
      const amt = new Decimal(c.amount);
      if (c.isDeduction) totalDeductions = totalDeductions.add(amt);
      else grossPay = grossPay.add(amt);
    }
    const netPay = grossPay.sub(totalDeductions);
    const tax = data._tax;

    return this.prisma.payroll.create({
      data: {
        payrollNumber: `PAY-${genId()}`,
        staffId: data.staffId,
        organizationId,
        month: Number(data.month),
        year: Number(data.year),
        basicSalary: new Decimal(data.basicSalary ?? 0),
        grossPay,
        totalDeductions,
        netPay,
        payeTax:         new Decimal(tax?.payeTax         ?? 0),
        pensionEmployee: new Decimal(tax?.pensionEmployee ?? 0),
        pensionEmployer: new Decimal(tax?.pensionEmployer ?? 0),
        nhf:             new Decimal(tax?.nhf             ?? 0),
        notes: data.notes,
        components: {
          create: components.map((c: any) => ({
            type: c.type,
            label: c.label,
            amount: new Decimal(c.amount),
            isDeduction: c.isDeduction ?? false,
          })),
        },
      },
      include: { components: true, staff: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } } },
    });
  }

  /** Extract allowance amounts from a component list for the tax engine. */
  private _buildTaxInput(components: any[]): TaxInput {
    const get = (type: string) =>
      components.filter((c) => c.type === type && !c.isDeduction).reduce((s, c) => s + Number(c.amount ?? 0), 0);

    const basic     = get("BASIC_SALARY");
    const housing   = get("HOUSING_ALLOWANCE");
    const transport = get("TRANSPORT_ALLOWANCE");
    const medical   = get("MEDICAL_ALLOWANCE");
    const other     = components
      .filter((c) => !c.isDeduction && !["BASIC_SALARY","HOUSING_ALLOWANCE","TRANSPORT_ALLOWANCE","MEDICAL_ALLOWANCE"].includes(c.type))
      .reduce((s, c) => s + Number(c.amount ?? 0), 0);

    return { basicSalary: basic, housingAllowance: housing, transportAllowance: transport, medicalAllowance: medical, otherAllowances: other };
  }

  async findAll(organizationId: string, filters: { month?: number; year?: number; staffId?: string; status?: string }) {
    const where: any = { organizationId };
    if (filters.month) where.month = Number(filters.month);
    if (filters.year) where.year = Number(filters.year);
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.status) where.status = filters.status;

    return this.prisma.payroll.findMany({
      where,
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
        components: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.payroll.findFirst({
      where: { id, organizationId },
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
        components: true,
      },
    });
    if (!record) throw new NotFoundException("Payroll not found");
    return record;
  }

  async updateStatus(id: string, status: string, organizationId: string, extra?: any) {
    const record = await this.findOne(id, organizationId);

    const transitions: Record<string, string[]> = {
      DRAFT: ["APPROVED", "CANCELLED"],
      APPROVED: ["PAID", "CANCELLED"],
    };
    if (!transitions[record.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${record.status} to ${status}`);
    }

    return this.prisma.payroll.update({
      where: { id },
      data: {
        status: status as any,
        paidAt: status === "PAID" ? new Date() : undefined,
        paymentMethod: status === "PAID" ? extra?.paymentMethod : undefined,
      },
      include: { components: true, staff: { select: { firstName: true, lastName: true, employeeId: true } } },
    });
  }

  async getSummary(organizationId: string, month?: number, year?: number) {
    const where: any = { organizationId };
    const now = new Date();
    if (month) where.month = Number(month);
    else where.month = now.getMonth() + 1;
    if (year) where.year = Number(year);
    else where.year = now.getFullYear();

    const [draft, approved, paid, cancelled] = await Promise.all([
      this.prisma.payroll.count({ where: { ...where, status: "DRAFT" } }),
      this.prisma.payroll.count({ where: { ...where, status: "APPROVED" } }),
      this.prisma.payroll.count({ where: { ...where, status: "PAID" } }),
      this.prisma.payroll.count({ where: { ...where, status: "CANCELLED" } }),
    ]);

    const paidPayrolls = await this.prisma.payroll.findMany({ where: { ...where, status: "PAID" }, select: { netPay: true } });
    const totalNetPaid = paidPayrolls.reduce((s, p) => s + Number(p.netPay), 0);

    const allPayrolls = await this.prisma.payroll.findMany({ where, select: { netPay: true, grossPay: true } });
    const totalGross = allPayrolls.reduce((s, p) => s + Number(p.grossPay), 0);

    return { draft, approved, paid, cancelled, totalNetPaid, totalGross, month: where.month, year: where.year };
  }

  // ── Tax computation ──────────────────────────────────────────────────────────

  computeTax(input: TaxInput & { applyNhf?: boolean }) {
    return computeNigerianTax(input);
  }

  // ── Salary grades ────────────────────────────────────────────────────────────

  listSalaryGrades(organizationId: string) {
    return this.prisma.salaryGrade.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  createSalaryGrade(data: any, organizationId: string) {
    return this.prisma.salaryGrade.create({
      data: {
        organizationId,
        name:               data.name,
        basicSalary:        new Decimal(data.basicSalary        ?? 0),
        housingAllowance:   new Decimal(data.housingAllowance   ?? 0),
        transportAllowance: new Decimal(data.transportAllowance ?? 0),
        medicalAllowance:   new Decimal(data.medicalAllowance   ?? 0),
        otherAllowances:    new Decimal(data.otherAllowances    ?? 0),
      },
    });
  }

  async updateSalaryGrade(id: string, data: any, organizationId: string) {
    const existing = await this.prisma.salaryGrade.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException("Salary grade not found");
    return this.prisma.salaryGrade.update({
      where: { id },
      data: {
        name:               data.name               ?? existing.name,
        basicSalary:        data.basicSalary        != null ? new Decimal(data.basicSalary)        : undefined,
        housingAllowance:   data.housingAllowance   != null ? new Decimal(data.housingAllowance)   : undefined,
        transportAllowance: data.transportAllowance != null ? new Decimal(data.transportAllowance) : undefined,
        medicalAllowance:   data.medicalAllowance   != null ? new Decimal(data.medicalAllowance)   : undefined,
        otherAllowances:    data.otherAllowances    != null ? new Decimal(data.otherAllowances)    : undefined,
        isActive:           data.isActive           != null ? Boolean(data.isActive)               : undefined,
      },
    });
  }

  async deleteSalaryGrade(id: string, organizationId: string) {
    const existing = await this.prisma.salaryGrade.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException("Salary grade not found");
    await this.prisma.salaryGrade.delete({ where: { id } });
    return { deleted: true };
  }

  /** Return the tax preview that would result from applying a salary grade. */
  previewGrade(id: string, organizationId: string, applyNhf = true) {
    return this.prisma.salaryGrade.findFirst({ where: { id, organizationId } }).then((grade) => {
      if (!grade) throw new NotFoundException("Salary grade not found");
      const tax = computeNigerianTax({
        basicSalary:        Number(grade.basicSalary),
        housingAllowance:   Number(grade.housingAllowance),
        transportAllowance: Number(grade.transportAllowance),
        medicalAllowance:   Number(grade.medicalAllowance),
        otherAllowances:    Number(grade.otherAllowances),
        applyNhf,
      });
      return { grade, tax };
    });
  }
}
