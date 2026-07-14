import { customAlphabet } from "nanoid";

const numericId = customAlphabet("0123456789", 8);

/**
 * Generates a unique Medical Record Number.
 * Format: HMS-YYYYMMDD-XXXXXXXX  (e.g. HMS-20260623-00423811)
 */
export function generateMRN(prefix = "HMS"): string {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${datePart}-${numericId()}`;
}

export function generateEmployeeId(rolePrefix: string): string {
  return `${rolePrefix.toUpperCase().slice(0, 3)}-${numericId()}`;
}
