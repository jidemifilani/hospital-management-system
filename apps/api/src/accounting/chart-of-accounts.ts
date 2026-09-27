import { AccountType } from "@prisma/client";

/** Account codes referenced directly by posting rules. */
export const ACCOUNTS = {
  CASH_ON_HAND: "1010",
  BANK: "1020",
  AR_PATIENTS: "1210",
  AR_NHIS: "1220",
  AR_HMO: "1230",
  INVENTORY_DRUGS: "1310",
  INVENTORY_CONSUMABLES: "1320",
  AP_SUPPLIERS: "2010",
  SALARIES_PAYABLE: "2110",
  TAX_PAYABLE: "2120",
  SHARE_CAPITAL: "3010",
  RETAINED_EARNINGS: "3020",
  REV_CONSULTATION: "4010",
  REV_LABORATORY: "4020",
  REV_RADIOLOGY: "4030",
  REV_PROCEDURE: "4040",
  REV_SURGERY: "4050",
  REV_ADMISSION: "4060",
  REV_PHARMACY: "4070",
  REV_OTHER: "4090",
  COGS_DRUGS: "5010",
  COGS_CONSUMABLES: "5020",
  EXP_SALARIES: "6010",
  EXP_UTILITIES: "6020",
  EXP_RENT: "6030",
  EXP_MAINTENANCE: "6040",
  EXP_SUPPLIES: "6050",
  EXP_DEPRECIATION: "6060",
  EXP_OTHER: "6090",
} as const;

interface Seed {
  code: string;
  name: string;
  type: AccountType;
  isPostable?: boolean;
  parent?: string;
}

/**
 * A default chart for a Nigerian private hospital. Group headers are not
 * postable, so a posting can never land on a rolled-up total.
 */
export const DEFAULT_CHART: Seed[] = [
  { code: "1000", name: "Assets", type: "ASSET", isPostable: false },
  { code: "1010", name: "Cash on Hand", type: "ASSET", parent: "1000" },
  { code: "1020", name: "Bank", type: "ASSET", parent: "1000" },
  { code: "1200", name: "Receivables", type: "ASSET", isPostable: false, parent: "1000" },
  { code: "1210", name: "Accounts Receivable — Patients", type: "ASSET", parent: "1200" },
  { code: "1220", name: "Accounts Receivable — NHIS", type: "ASSET", parent: "1200" },
  { code: "1230", name: "Accounts Receivable — HMO", type: "ASSET", parent: "1200" },
  { code: "1300", name: "Inventory", type: "ASSET", isPostable: false, parent: "1000" },
  { code: "1310", name: "Inventory — Drugs", type: "ASSET", parent: "1300" },
  { code: "1320", name: "Inventory — Consumables", type: "ASSET", parent: "1300" },
  { code: "1400", name: "Fixed Assets", type: "ASSET", parent: "1000" },

  { code: "2000", name: "Liabilities", type: "LIABILITY", isPostable: false },
  { code: "2010", name: "Accounts Payable — Suppliers", type: "LIABILITY", parent: "2000" },
  { code: "2110", name: "Salaries Payable", type: "LIABILITY", parent: "2000" },
  { code: "2120", name: "Tax Payable", type: "LIABILITY", parent: "2000" },

  { code: "3000", name: "Equity", type: "EQUITY", isPostable: false },
  { code: "3010", name: "Share Capital", type: "EQUITY", parent: "3000" },
  { code: "3020", name: "Retained Earnings", type: "EQUITY", parent: "3000" },

  { code: "4000", name: "Revenue", type: "INCOME", isPostable: false },
  { code: "4010", name: "Consultation Revenue", type: "INCOME", parent: "4000" },
  { code: "4020", name: "Laboratory Revenue", type: "INCOME", parent: "4000" },
  { code: "4030", name: "Radiology Revenue", type: "INCOME", parent: "4000" },
  { code: "4040", name: "Procedure & Nursing Revenue", type: "INCOME", parent: "4000" },
  { code: "4050", name: "Surgery Revenue", type: "INCOME", parent: "4000" },
  { code: "4060", name: "Admission & Bed Revenue", type: "INCOME", parent: "4000" },
  { code: "4070", name: "Pharmacy Revenue", type: "INCOME", parent: "4000" },
  { code: "4090", name: "Other Revenue", type: "INCOME", parent: "4000" },

  { code: "5000", name: "Cost of Sales", type: "EXPENSE", isPostable: false },
  { code: "5010", name: "Cost of Drugs Dispensed", type: "EXPENSE", parent: "5000" },
  { code: "5020", name: "Cost of Consumables Used", type: "EXPENSE", parent: "5000" },

  { code: "6000", name: "Operating Expenses", type: "EXPENSE", isPostable: false },
  { code: "6010", name: "Salaries & Wages", type: "EXPENSE", parent: "6000" },
  { code: "6020", name: "Utilities", type: "EXPENSE", parent: "6000" },
  { code: "6030", name: "Rent", type: "EXPENSE", parent: "6000" },
  { code: "6040", name: "Repairs & Maintenance", type: "EXPENSE", parent: "6000" },
  { code: "6050", name: "Medical Supplies", type: "EXPENSE", parent: "6000" },
  { code: "6060", name: "Depreciation", type: "EXPENSE", parent: "6000" },
  { code: "6090", name: "Other Operating Expenses", type: "EXPENSE", parent: "6000" },
];
