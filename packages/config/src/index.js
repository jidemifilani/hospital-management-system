"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = exports.HMS_CONFIG = void 0;
exports.HMS_CONFIG = {
    pagination: {
        defaultLimit: 20,
        maxLimit: 100,
    },
    jwt: {
        accessExpiresIn: "15m",
        refreshExpiresIn: "7d",
    },
    password: {
        saltRounds: 12,
        minLength: 8,
    },
    mfa: {
        issuer: "CareSync HMS",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        backupCodeCount: 10,
    },
    upload: {
        maxFileSizeMb: 10,
        allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
            "application/dicom",
        ],
    },
    audit: {
        retentionDays: 2555, // 7 years
    },
};
exports.PERMISSIONS = {
    // Patients
    PATIENTS_READ: "patients:read",
    PATIENTS_CREATE: "patients:create",
    PATIENTS_UPDATE: "patients:update",
    PATIENTS_DELETE: "patients:delete",
    // Appointments
    APPOINTMENTS_READ: "appointments:read",
    APPOINTMENTS_CREATE: "appointments:create",
    APPOINTMENTS_UPDATE: "appointments:update",
    APPOINTMENTS_CANCEL: "appointments:cancel",
    // Staff
    STAFF_READ: "staff:read",
    STAFF_CREATE: "staff:create",
    STAFF_UPDATE: "staff:update",
    // Billing
    BILLING_READ: "billing:read",
    BILLING_CREATE: "billing:create",
    BILLING_UPDATE: "billing:update",
    // Lab
    LAB_READ: "lab:read",
    LAB_CREATE: "lab:create",
    LAB_UPDATE: "lab:update",
    // Pharmacy
    PHARMACY_READ: "pharmacy:read",
    PHARMACY_CREATE: "pharmacy:create",
    PHARMACY_UPDATE: "pharmacy:update",
    // Roster
    ROSTER_READ: "roster:read",
    ROSTER_MANAGE: "roster:manage",
    // Admin
    ADMIN_USERS: "admin:users",
    ADMIN_ROLES: "admin:roles",
    ADMIN_AUDIT: "admin:audit",
    ADMIN_CONFIG: "admin:config",
    // Dashboard
    DASHBOARD_VIEW: "dashboard:view",
};
//# sourceMappingURL=index.js.map