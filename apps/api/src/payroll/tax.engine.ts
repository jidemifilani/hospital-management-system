/**
 * Nigerian statutory payroll tax engine.
 *
 * Rates are per the Personal Income Tax Act (PITA) as amended by Finance Act 2020
 * and the Pension Reform Act 2014.
 *
 * All inputs and outputs are MONTHLY amounts in NGN.
 */

export interface TaxInput {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  /** Apply NHF at 2.5 % of basic. Default: true */
  applyNhf?: boolean;
}

export interface TaxResult {
  grossIncome: number;
  /** basic + housing + transport — the pensionable pay base per PRA 2014 */
  pensionableBase: number;
  /** Employee pension contribution: 8 % of pensionable base */
  pensionEmployee: number;
  /** Employer pension contribution: 10 % of pensionable base (employer cost, not deducted from employee pay) */
  pensionEmployer: number;
  /** National Housing Fund: 2.5 % of basic salary */
  nhf: number;
  /** Monthly equivalent of annual CRA (informational) */
  craMonthly: number;
  /** Monthly equivalent of annual taxable income (informational) */
  taxableIncomeMonthly: number;
  /** Monthly PAYE deduction */
  payeTax: number;
  /** pensionEmployee + nhf + payeTax */
  totalStatutoryDeductions: number;
  /** grossIncome − totalStatutoryDeductions */
  netAfterStatutory: number;
}

// Annual PAYE bands (PITA as amended by Finance Act 2020)
const PAYE_BANDS: { limit: number; rate: number }[] = [
  { limit: 300_000,   rate: 0.07 },
  { limit: 300_000,   rate: 0.11 },
  { limit: 500_000,   rate: 0.15 },
  { limit: 500_000,   rate: 0.19 },
  { limit: 1_600_000, rate: 0.21 },
  { limit: Infinity,  rate: 0.24 },
];

function annualPaye(taxableAnnual: number): number {
  if (taxableAnnual <= 0) return 0;
  let tax = 0;
  let remaining = taxableAnnual;
  for (const band of PAYE_BANDS) {
    const slice = Math.min(remaining, band.limit);
    tax += slice * band.rate;
    remaining -= slice;
    if (remaining <= 0) break;
  }
  return tax;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeNigerianTax(input: TaxInput): TaxResult {
  const {
    basicSalary,
    housingAllowance,
    transportAllowance,
    medicalAllowance,
    otherAllowances,
    applyNhf = true,
  } = input;

  const grossIncome     = basicSalary + housingAllowance + transportAllowance + medicalAllowance + otherAllowances;
  const pensionableBase = basicSalary + housingAllowance + transportAllowance;

  // Monthly statutory deductions
  const pensionEmployee = round2(pensionableBase * 0.08);
  const pensionEmployer = round2(pensionableBase * 0.10);
  const nhf             = applyNhf ? round2(basicSalary * 0.025) : 0;

  // Annualise for PAYE computation
  const annualGross   = grossIncome * 12;
  const annualPension = pensionEmployee * 12;
  const annualNhf     = nhf * 12;

  // CRA = higher of (₦200,000 or 1 % of annual gross) + 20 % of annual gross
  const cra = Math.max(200_000, annualGross * 0.01) + annualGross * 0.20;

  const taxableAnnual = Math.max(0, annualGross - annualPension - annualNhf - cra);
  const payeTax       = round2(annualPaye(taxableAnnual) / 12);

  const totalStatutoryDeductions = round2(pensionEmployee + nhf + payeTax);

  return {
    grossIncome:             round2(grossIncome),
    pensionableBase:         round2(pensionableBase),
    pensionEmployee,
    pensionEmployer,
    nhf,
    craMonthly:              round2(cra / 12),
    taxableIncomeMonthly:    round2(taxableAnnual / 12),
    payeTax,
    totalStatutoryDeductions,
    netAfterStatutory:       round2(grossIncome - totalStatutoryDeductions),
  };
}
