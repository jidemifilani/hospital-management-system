import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";
import { Decimal } from "@prisma/client/runtime/library";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, organizationId: string) {
    const existing = await this.prisma.payroll.findUnique({
      where: { staffId_month_year: { staffId: data.staffId, month: Number(data.month), year: Number(data.year) } },
    });
    if (existing) throw new ConflictException("Payroll already exists for this staff, month, and year");

    const components = data.components ?? [];
    let grossPay = new Decimal(0);
    let totalDeductions = new Decimal(0);

    for (const c of components) {
      const amt = new Decimal(c.amount);
      if (c.isDeduction) totalDeductions = totalDeductions.add(amt);
      else grossPay = grossPay.add(amt);
    }
    const netPay = grossPay.sub(totalDeductions);

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
}
