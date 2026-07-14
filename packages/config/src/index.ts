export const HMS_CONFIG = {
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
} as const;

export const PERMISSIONS = {
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
  // Leave
  LEAVE_READ: "leave:read",
  LEAVE_APPLY: "leave:apply",
  LEAVE_MANAGE: "leave:manage",
  // Radiology
  RADIOLOGY_READ: "radiology:read",
  RADIOLOGY_ORDER: "radiology:order",
  RADIOLOGY_RESULT: "radiology:result",
  // Referrals
  REFERRALS_READ: "referrals:read",
  REFERRALS_CREATE: "referrals:create",
  REFERRALS_MANAGE: "referrals:manage",
  // Blood Bank
  BLOOD_BANK_READ: "blood_bank:read",
  BLOOD_BANK_MANAGE: "blood_bank:manage",
  // Insurance / HMO
  INSURANCE_READ: "insurance:read",
  INSURANCE_MANAGE: "insurance:manage",
  // Mortuary
  MORTUARY_READ: "mortuary:read",
  MORTUARY_MANAGE: "mortuary:manage",
  // OPD Queue
  OPD_READ: "opd:read",
  OPD_MANAGE: "opd:manage",
  // Attendance
  ATTENDANCE_READ: "attendance:read",
  ATTENDANCE_MANAGE: "attendance:manage",
  // Incidents
  INCIDENTS_READ: "incidents:read",
  INCIDENTS_CREATE: "incidents:create",
  INCIDENTS_MANAGE: "incidents:manage",
  // Assets
  ASSETS_READ: "assets:read",
  ASSETS_MANAGE: "assets:manage",
  // Dietary
  DIETARY_READ: "dietary:read",
  DIETARY_MANAGE: "dietary:manage",
  // Triage
  TRIAGE_READ: "triage:read",
  TRIAGE_MANAGE: "triage:manage",
  // Theatre / Surgery
  THEATRE_READ: "theatre:read",
  THEATRE_MANAGE: "theatre:manage",
  // Care Plans
  CARE_PLAN_READ: "care_plan:read",
  CARE_PLAN_MANAGE: "care_plan:manage",
  // Procurement
  PROCUREMENT_READ: "procurement:read",
  PROCUREMENT_MANAGE: "procurement:manage",
  // Appraisals
  APPRAISALS_READ: "appraisals:read",
  APPRAISALS_MANAGE: "appraisals:manage",
  // Patient Feedback
  FEEDBACK_READ: "feedback:read",
  FEEDBACK_MANAGE: "feedback:manage",
  // Ambulance / Transport
  TRANSPORT_READ: "transport:read",
  TRANSPORT_MANAGE: "transport:manage",
  // Payroll
  PAYROLL_READ: "payroll:read",
  PAYROLL_MANAGE: "payroll:manage",
  // Medical Certificates
  CERTIFICATES_READ: "certificates:read",
  CERTIFICATES_MANAGE: "certificates:manage",
  // Visitor Management
  VISITORS_READ: "visitors:read",
  VISITORS_MANAGE: "visitors:manage",
  // Patient Alerts
  ALERTS_READ: "alerts:read",
  ALERTS_MANAGE: "alerts:manage",
  // Shift Handover
  HANDOVER_READ: "handover:read",
  HANDOVER_MANAGE: "handover:manage",
  // Physiotherapy / Rehab
  REHAB_READ: "rehab:read",
  REHAB_MANAGE: "rehab:manage",
  // MAR
  MAR_READ: "mar:read",
  MAR_MANAGE: "mar:manage",
  // Maintenance Requests
  MAINTENANCE_READ: "maintenance:read",
  MAINTENANCE_MANAGE: "maintenance:manage",
  // Staff Training
  TRAINING_READ: "training:read",
  TRAINING_MANAGE: "training:manage",
  // Ward Rounds
  WARD_ROUND_READ: "ward-round:read",
  WARD_ROUND_MANAGE: "ward-round:manage",
  // Patient Consent
  CONSENT_READ: "consent:read",
  CONSENT_MANAGE: "consent:manage",
  // Discharge Management
  DISCHARGE_READ: "discharge:read",
  DISCHARGE_MANAGE: "discharge:manage",
  // Settings
  SETTINGS_READ: "settings:read",
  SETTINGS_MANAGE: "settings:manage",
  // Admin
  ADMIN_USERS: "admin:users",
  ADMIN_ROLES: "admin:roles",
  ADMIN_AUDIT: "admin:audit",
  ADMIN_CONFIG: "admin:config",
  // Dashboard
  DASHBOARD_VIEW: "dashboard:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
