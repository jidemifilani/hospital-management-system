import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateTaxCodeDto, UpdateTaxCodeDto, ApplyTaxDto, CreateTaxReturnDto, UpdateTaxReturnDto } from "./dto/tax.dto";

const genId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);

const DEFAULT_CODES = [
  { code: "VAT75", name: "VAT 7.5%", rate: 7.5, type: "OUTPUT_VAT" as const },
  { code: "WHT5",  name: "Withholding Tax 5%", rate: 5, type: "WITHHOLDING" as const },
  { code: "WHT10", name: "Withholding Tax 10%", rate: 10, type: "WITHHOLDING" as const },
];

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tax codes ───────────────────────────────────────────────────────────────

  async listCodes(orgId: string) {
    return this.prisma.taxCode.findMany({
      where: { organizationId: orgId },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });
  }

  async seedDefaults(orgId: string) {
    const existing = await this.prisma.taxCode.findMany({ where: { organizationId: orgId }, select: { code: true } });
    const existingCodes = new Set(existing.map((c) => c.code));
    const toCreate = DEFAULT_CODES.filter((d) => !existingCodes.has(d.code));
    if (toCreate.length === 0) return { created: 0 };
    await this.prisma.taxCode.createMany({
      data: toCreate.map((d) => ({ id: genId(), code: d.code, name: d.name, rate: new Decimal(d.rate), type: d.type, organizationId: orgId })),
      skipDuplicates: true,
    });
    return { created: toCreate.length };
  }

  async createCode(dto: CreateTaxCodeDto, orgId: string) {
    const conflict = await this.prisma.taxCode.findFirst({ where: { code: dto.code.toUpperCase(), organizationId: orgId } });
    if (conflict) throw new ConflictException(`Tax code ${dto.code} already exists`);
    return this.prisma.taxCode.create({
      data: {
        id: genId(),
        code: dto.code.toUpperCase(),
        name: dto.name,
        rate: new Decimal(dto.rate),
        type: (dto.type ?? "OUTPUT_VAT") as any,
        organizationId: orgId,
      },
    });
  }

  async updateCode(id: string, dto: UpdateTaxCodeDto, orgId: string) {
    await this._findCode(id, orgId);
    return this.prisma.taxCode.update({
      where: { id },
      data: { ...dto, ...(dto.rate !== undefined ? { rate: new Decimal(dto.rate) } : {}) },
    });
  }

  async deleteCode(id: string, orgId: string) {
    await this._findCode(id, orgId);
    const inUse = await this.prisma.taxApplication.findFirst({ where: { taxCodeId: id } });
    if (inUse) throw new ConflictException("Tax code is in use and cannot be deleted. Deactivate it instead.");
    return this.prisma.taxCode.delete({ where: { id } });
  }

  private async _findCode(id: string, orgId: string) {
    const row = await this.prisma.taxCode.findFirst({ where: { id, organizationId: orgId } });
    if (!row) throw new NotFoundException("Tax code not found");
    return row;
  }

  // ── Tax applications ────────────────────────────────────────────────────────

  async applyTax(dto: ApplyTaxDto, orgId: string) {
    const code = await this._findCode(dto.taxCodeId, orgId);
    const base = new Decimal(dto.baseAmount);
    const taxAmount = base.mul(code.rate).div(100).toDecimalPlaces(2);
    return this.prisma.taxApplication.create({
      data: {
        id: genId(),
        taxCodeId: dto.taxCodeId,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        baseAmount: base,
        taxAmount,
        organizationId: orgId,
      },
    });
  }

  listApplications(orgId: string, referenceType?: string, referenceId?: string) {
    return this.prisma.taxApplication.findMany({
      where: {
        organizationId: orgId,
        ...(referenceType ? { referenceType } : {}),
        ...(referenceId   ? { referenceId }   : {}),
      },
      include: { taxCode: { select: { code: true, name: true, rate: true, type: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  deleteApplication(id: string, orgId: string) {
    return this.prisma.taxApplication.deleteMany({ where: { id, organizationId: orgId } });
  }

  // ── VAT period summary ──────────────────────────────────────────────────────

  async periodSummary(orgId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);

    const apps = await this.prisma.taxApplication.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: start, lt: end },
      },
      include: { taxCode: { select: { type: true } } },
    });

    let outputVat = new Decimal(0);
    let inputVat  = new Decimal(0);

    for (const a of apps) {
      if (a.taxCode.type === "OUTPUT_VAT") outputVat = outputVat.add(a.taxAmount);
      if (a.taxCode.type === "INPUT_VAT")  inputVat  = inputVat.add(a.taxAmount);
    }

    return {
      year, month,
      outputVat: outputVat.toString(),
      inputVat:  inputVat.toString(),
      netVat:    outputVat.sub(inputVat).toString(),
      applicationCount: apps.length,
    };
  }

  // ── Tax returns ─────────────────────────────────────────────────────────────

  listReturns(orgId: string) {
    return this.prisma.taxReturn.findMany({
      where: { organizationId: orgId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  async createReturn(dto: CreateTaxReturnDto, orgId: string) {
    const summary = await this.periodSummary(orgId, dto.year, dto.month);
    const existing = await this.prisma.taxReturn.findFirst({ where: { year: dto.year, month: dto.month, organizationId: orgId } });
    if (existing) throw new ConflictException(`Tax return for ${dto.month}/${dto.year} already exists`);

    // VAT filing is typically due on the 21st of the following month in Nigeria
    const due = new Date(dto.year, dto.month, 21);

    return this.prisma.taxReturn.create({
      data: {
        id: genId(),
        year: dto.year,
        month: dto.month,
        outputVat: new Decimal(summary.outputVat),
        inputVat:  new Decimal(summary.inputVat),
        netVat:    new Decimal(summary.netVat),
        dueDate:   due,
        notes:     dto.notes,
        organizationId: orgId,
      },
    });
  }

  async updateReturn(id: string, dto: UpdateTaxReturnDto, orgId: string) {
    const row = await this.prisma.taxReturn.findFirst({ where: { id, organizationId: orgId } });
    if (!row) throw new NotFoundException("Tax return not found");
    return this.prisma.taxReturn.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status === "SUBMITTED" ? { submittedAt: new Date() } : {}),
      },
    });
  }
}
