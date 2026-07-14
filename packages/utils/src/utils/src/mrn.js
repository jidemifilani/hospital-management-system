"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMRN = generateMRN;
exports.generateEmployeeId = generateEmployeeId;
const nanoid_1 = require("nanoid");
const numericId = (0, nanoid_1.customAlphabet)("0123456789", 8);
/**
 * Generates a unique Medical Record Number.
 * Format: HMS-YYYYMMDD-XXXXXXXX  (e.g. HMS-20260623-00423811)
 */
function generateMRN(prefix = "HMS") {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
    return `${prefix}-${datePart}-${numericId()}`;
}
function generateEmployeeId(rolePrefix) {
    return `${rolePrefix.toUpperCase().slice(0, 3)}-${numericId()}`;
}
//# sourceMappingURL=mrn.js.map