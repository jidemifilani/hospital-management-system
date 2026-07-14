export declare const HMS_CONFIG: {
    readonly pagination: {
        readonly defaultLimit: 20;
        readonly maxLimit: 100;
    };
    readonly jwt: {
        readonly accessExpiresIn: "15m";
        readonly refreshExpiresIn: "7d";
    };
    readonly password: {
        readonly saltRounds: 12;
        readonly minLength: 8;
    };
    readonly mfa: {
        readonly issuer: "CareSync HMS";
        readonly algorithm: "SHA1";
        readonly digits: 6;
        readonly period: 30;
        readonly backupCodeCount: 10;
    };
    readonly upload: {
        readonly maxFileSizeMb: 10;
        readonly allowedMimeTypes: readonly ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/dicom"];
    };
    readonly audit: {
        readonly retentionDays: 2555;
    };
};
export declare const PERMISSIONS: {
    readonly PATIENTS_READ: "patients:read";
    readonly PATIENTS_CREATE: "patients:create";
    readonly PATIENTS_UPDATE: "patients:update";
    readonly PATIENTS_DELETE: "patients:delete";
    readonly APPOINTMENTS_READ: "appointments:read";
    readonly APPOINTMENTS_CREATE: "appointments:create";
    readonly APPOINTMENTS_UPDATE: "appointments:update";
    readonly APPOINTMENTS_CANCEL: "appointments:cancel";
    readonly STAFF_READ: "staff:read";
    readonly STAFF_CREATE: "staff:create";
    readonly STAFF_UPDATE: "staff:update";
    readonly BILLING_READ: "billing:read";
    readonly BILLING_CREATE: "billing:create";
    readonly BILLING_UPDATE: "billing:update";
    readonly LAB_READ: "lab:read";
    readonly LAB_CREATE: "lab:create";
    readonly LAB_UPDATE: "lab:update";
    readonly PHARMACY_READ: "pharmacy:read";
    readonly PHARMACY_CREATE: "pharmacy:create";
    readonly PHARMACY_UPDATE: "pharmacy:update";
    readonly ROSTER_READ: "roster:read";
    readonly ROSTER_MANAGE: "roster:manage";
    readonly ADMIN_USERS: "admin:users";
    readonly ADMIN_ROLES: "admin:roles";
    readonly ADMIN_AUDIT: "admin:audit";
    readonly ADMIN_CONFIG: "admin:config";
    readonly DASHBOARD_VIEW: "dashboard:view";
};
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
//# sourceMappingURL=index.d.ts.map