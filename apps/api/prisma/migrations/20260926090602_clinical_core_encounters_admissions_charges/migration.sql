-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_HEAD', 'DOCTOR', 'NURSE', 'LAB_TECHNOLOGIST', 'RADIOLOGIST', 'PHARMACIST', 'CASHIER', 'RECEPTIONIST', 'HR_OFFICER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTATION', 'FOLLOW_UP', 'PROCEDURE', 'LAB_TEST', 'IMAGING', 'TELEMEDICINE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'PRINT');

-- CreateEnum
CREATE TYPE "ClinicalNoteType" AS ENUM ('SOAP', 'PROGRESS', 'DISCHARGE', 'REFERRAL', 'PROCEDURE', 'NURSING');

-- CreateEnum
CREATE TYPE "DiagnosisType" AS ENUM ('PRIMARY', 'SECONDARY', 'DIFFERENTIAL');

-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'CHRONIC', 'RULED_OUT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'POS_CARD', 'BANK_TRANSFER', 'NHIS', 'HMO', 'INSURANCE', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('PENDING', 'SAMPLE_COLLECTED', 'PROCESSING', 'RESULTED', 'VERIFIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabOrderPriority" AS ENUM ('ROUTINE', 'URGENT', 'STAT');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('PENDING', 'DISPENSING', 'DISPENSED', 'PARTIALLY_DISPENSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT', 'ON_CALL');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'EMERGENCY', 'STUDY', 'UNPAID');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImagingModality" AS ENUM ('XRAY', 'CT_SCAN', 'MRI', 'ULTRASOUND', 'MAMMOGRAPHY', 'FLUOROSCOPY', 'NUCLEAR_MEDICINE', 'PET_SCAN', 'ECHOCARDIOGRAPHY');

-- CreateEnum
CREATE TYPE "RadiologyOrderStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralUrgency" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "OpdQueueStatus" AS ENUM ('WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BloodUnitStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ISSUED', 'EXPIRED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "BloodRequestStatus" AS ENUM ('PENDING', 'CROSSMATCH', 'APPROVED', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BloodRequestUrgency" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "InsuranceClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "MortuaryStatus" AS ENUM ('ADMITTED', 'RELEASED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "TheatreBookingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "SurgeryUrgency" AS ENUM ('ELECTIVE', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CarePlanTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('MEDICAL_EQUIPMENT', 'FURNITURE', 'IT_EQUIPMENT', 'VEHICLE', 'LABORATORY', 'PHARMACY', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED', 'LOST', 'STOLEN');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'CALIBRATION', 'INSPECTION');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DietOrderStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayComponentType" AS ENUM ('BASIC_SALARY', 'HOUSING_ALLOWANCE', 'TRANSPORT_ALLOWANCE', 'MEDICAL_ALLOWANCE', 'OVERTIME', 'BONUS', 'PENSION_DEDUCTION', 'TAX_DEDUCTION', 'LOAN_DEDUCTION', 'OTHER_ALLOWANCE', 'OTHER_DEDUCTION');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('SICK_LEAVE', 'FITNESS_TO_WORK', 'MEDICAL_EXAMINATION', 'VACCINATION', 'DISABILITY', 'DEATH_CERTIFICATE');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('DRAFT', 'ISSUED', 'REVOKED');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('CHECKED_IN', 'CHECKED_OUT', 'OVERSTAY');

-- CreateEnum
CREATE TYPE "TriageLevel" AS ENUM ('IMMEDIATE', 'EMERGENT', 'URGENT', 'SEMI_URGENT', 'NON_URGENT');

-- CreateEnum
CREATE TYPE "TriageStatus" AS ENUM ('WAITING', 'IN_ASSESSMENT', 'ASSESSED', 'ADMITTED', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "AppraisalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "AppraisalPeriod" AS ENUM ('QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('GENERAL', 'DOCTOR', 'NURSE', 'PHARMACY', 'LABORATORY', 'BILLING', 'CLEANLINESS', 'WAITING_TIME', 'FOOD', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AmbulanceStatus" AS ENUM ('AVAILABLE', 'DISPATCHED', 'AT_SCENE', 'EN_ROUTE', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "TransportStatus" AS ENUM ('REQUESTED', 'ASSIGNED', 'DISPATCHED', 'AT_SCENE', 'EN_ROUTE_TO_HOSPITAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('EMERGENCY', 'SCHEDULED', 'TRANSFER', 'DISCHARGE');

-- CreateEnum
CREATE TYPE "MARStatus" AS ENUM ('SCHEDULED', 'ADMINISTERED', 'SKIPPED', 'REFUSED', 'HELD');

-- CreateEnum
CREATE TYPE "MedicationRoute" AS ENUM ('ORAL', 'IV', 'IM', 'SC', 'TOPICAL', 'INHALATION', 'SUBLINGUAL', 'RECTAL', 'NASOGASTRIC');

-- CreateEnum
CREATE TYPE "MaintenanceRequestType" AS ENUM ('CLEANING', 'PLUMBING', 'ELECTRICAL', 'HVAC', 'CARPENTRY', 'PAINTING', 'PEST_CONTROL', 'IT_SUPPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceRequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceRequestStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrainingCategory" AS ENUM ('CLINICAL', 'SAFETY', 'COMPLIANCE', 'LEADERSHIP', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('MANDATORY', 'ELECTIVE');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('ALLERGY', 'FALL_RISK', 'INFECTION_CONTROL', 'DNR', 'DIET_RESTRICTION', 'MEDICATION', 'BLOOD_TRANSFUSION', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "TherapyType" AS ENUM ('PHYSIOTHERAPY', 'OCCUPATIONAL', 'SPEECH', 'RESPIRATORY', 'CARDIAC', 'OTHER');

-- CreateEnum
CREATE TYPE "RehabStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "WardRoundStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('SURGICAL', 'ANAESTHESIA', 'BLOOD_TRANSFUSION', 'RESEARCH', 'PHOTOGRAPHY', 'PROCEDURE', 'GENERAL');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DischargeType" AS ENUM ('REGULAR', 'AMA', 'TRANSFER', 'DEATH', 'ABSCONDED');

-- CreateEnum
CREATE TYPE "DischargeStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'DAY_CASE', 'TELEMEDICINE');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('PLANNED', 'ARRIVED', 'TRIAGED', 'IN_CONSULTATION', 'OBSERVATION', 'ADMITTED', 'DISCHARGED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdmissionType" AS ENUM ('ELECTIVE', 'EMERGENCY', 'MATERNITY', 'TRANSFER_IN', 'DAY_CASE');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('ACTIVE', 'DISCHARGED', 'TRANSFERRED_OUT', 'ABSCONDED', 'DECEASED');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CONSULTATION', 'LABORATORY', 'RADIOLOGY', 'PROCEDURE', 'SURGERY', 'BED_CHARGE', 'NURSING', 'PHARMACY', 'CONSUMABLE', 'AMBULANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargeSource" AS ENUM ('MANUAL', 'CONSULTATION', 'LAB_ORDER', 'RADIOLOGY_ORDER', 'PHARMACY_DISPENSE', 'BED_DAY', 'PROCEDURE', 'THEATRE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "notificationSettings" JSONB,
    "siteContent" JSONB,
    "siteTheme" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaBackupCodes" TEXT[],
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "headOfDeptId" TEXT,
    "consultationServiceItemId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "specialization" TEXT,
    "licenseNumber" TEXT,
    "qualifications" TEXT[],
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "bloodGroup" "BloodGroup",
    "allergies" TEXT,
    "ninNumber" TEXT,
    "nhisNumber" TEXT,
    "hmoProvider" TEXT,
    "hmoNumber" TEXT,
    "photoUrl" TEXT,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "emergencyContactRelation" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "chiefComplaint" TEXT,
    "notes" TEXT,
    "cancelReason" TEXT,
    "isTelemedicine" BOOLEAN NOT NULL DEFAULT false,
    "meetingUrl" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "wardClass" TEXT,
    "serviceItemId" TEXT,
    "departmentId" TEXT NOT NULL,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "patientId" TEXT,
    "admittedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "encounterId" TEXT,
    "recordedById" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "oxygenSaturation" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bloodGlucose" DOUBLE PRECISION,
    "pain" INTEGER,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "encounterId" TEXT,
    "authorId" TEXT NOT NULL,
    "noteType" "ClinicalNoteType" NOT NULL DEFAULT 'SOAP',
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "content" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "encounterId" TEXT,
    "diagnosedById" TEXT NOT NULL,
    "icdCode" TEXT,
    "description" TEXT NOT NULL,
    "diagnosisType" "DiagnosisType" NOT NULL DEFAULT 'PRIMARY',
    "status" "DiagnosisStatus" NOT NULL DEFAULT 'ACTIVE',
    "diagnosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "encounterId" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "receivedById" TEXT NOT NULL,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "encounterId" TEXT,
    "requestedById" TEXT NOT NULL,
    "priority" "LabOrderPriority" NOT NULL DEFAULT 'ROUTINE',
    "status" "LabOrderStatus" NOT NULL DEFAULT 'PENDING',
    "clinicalInfo" TEXT,
    "sampleType" TEXT,
    "collectedAt" TIMESTAMP(3),
    "collectedById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" TEXT NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "testCode" TEXT,
    "result" TEXT NOT NULL,
    "unit" TEXT,
    "normalRange" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "notes" TEXT,
    "resultedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "reorderLevel" INTEGER NOT NULL DEFAULT 50,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_stock" (
    "id" TEXT NOT NULL,
    "drugItemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "supplierName" TEXT,
    "costPerUnit" DECIMAL(10,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "prescriptionNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescribedById" TEXT NOT NULL,
    "appointmentId" TEXT,
    "encounterId" TEXT,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "dispensedById" TEXT,
    "dispensedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "drugItemId" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dispensedQty" INTEGER NOT NULL DEFAULT 0,
    "instructions" TEXT,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosters" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shiftType" "ShiftType" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isOnCall" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referralNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "referredById" TEXT NOT NULL,
    "toStaffId" TEXT,
    "toDepartmentId" TEXT,
    "toFacility" TEXT,
    "type" "ReferralType" NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "urgency" "ReferralUrgency" NOT NULL DEFAULT 'ROUTINE',
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "appointmentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "encounterId" TEXT,
    "serviceItemId" TEXT,
    "requestedById" TEXT NOT NULL,
    "modality" "ImagingModality" NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "priority" "LabOrderPriority" NOT NULL DEFAULT 'ROUTINE',
    "status" "RadiologyOrderStatus" NOT NULL DEFAULT 'PENDING',
    "clinicalInfo" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "performedAt" TIMESTAMP(3),
    "performedById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "radiology_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_results" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "findings" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "recommendations" TEXT,
    "imageUrl" TEXT,
    "reportedById" TEXT NOT NULL,
    "verifiedById" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radiology_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opd_queues" (
    "id" TEXT NOT NULL,
    "queueNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "doctorId" TEXT,
    "appointmentId" TEXT,
    "encounterId" TEXT,
    "status" "OpdQueueStatus" NOT NULL DEFAULT 'WAITING',
    "calledAt" TIMESTAMP(3),
    "consultationStartAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opd_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'LOW',
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT,
    "departmentId" TEXT,
    "reportedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_donors" (
    "id" TEXT NOT NULL,
    "donorNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "lastDonationAt" TIMESTAMP(3),
    "totalDonations" INTEGER NOT NULL DEFAULT 0,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_units" (
    "id" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 450,
    "donorId" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "BloodUnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "issuedToId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_requests" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "urgency" "BloodRequestUrgency" NOT NULL DEFAULT 'ROUTINE',
    "status" "BloodRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "clinicalReason" TEXT,
    "crossmatchedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claims" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "provider" TEXT NOT NULL,
    "scheme" TEXT,
    "memberNumber" TEXT,
    "preAuthCode" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "status" "InsuranceClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mortuary_records" (
    "id" TEXT NOT NULL,
    "recordNumber" TEXT NOT NULL,
    "deceasedName" TEXT NOT NULL,
    "deathDate" TIMESTAMP(3) NOT NULL,
    "causeOfDeath" TEXT,
    "patientId" TEXT,
    "storageUnit" TEXT,
    "status" "MortuaryStatus" NOT NULL DEFAULT 'ADMITTED',
    "nextOfKinName" TEXT NOT NULL,
    "nextOfKinPhone" TEXT NOT NULL,
    "nextOfKinRelation" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releasedTo" TEXT,
    "releaseNotes" TEXT,
    "admittedById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mortuary_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theatre_bookings" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "surgeonId" TEXT NOT NULL,
    "anaesthesiologistId" TEXT,
    "assistantSurgeonId" TEXT,
    "procedureName" TEXT NOT NULL,
    "icdCode" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledDuration" INTEGER NOT NULL DEFAULT 60,
    "operatingRoom" TEXT,
    "urgency" "SurgeryUrgency" NOT NULL DEFAULT 'ELECTIVE',
    "status" "TheatreBookingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "preOpNotes" TEXT,
    "postOpNotes" TEXT,
    "complications" TEXT,
    "anaesthesiaType" TEXT,
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theatre_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "planNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "nurseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goals" TEXT,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_tasks" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "frequency" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "CarePlanTaskStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plan_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorContact" TEXT,
    "vendorEmail" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "orderedAt" TIMESTAMP(3),
    "expectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "assetNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL DEFAULT 'OTHER',
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DECIMAL(12,2),
    "warrantyExpiry" TIMESTAMP(3),
    "location" TEXT,
    "departmentId" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenances" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL DEFAULT 'PREVENTIVE',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "cost" DECIMAL(12,2),
    "performedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "dietType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "allergies" TEXT,
    "instructions" TEXT,
    "status" "DietOrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "orderedById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diet_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_records" (
    "id" TEXT NOT NULL,
    "dietOrderId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealType" "MealType" NOT NULL,
    "served" BOOLEAN NOT NULL DEFAULT false,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL,
    "payrollNumber" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basicSalary" DECIMAL(12,2) NOT NULL,
    "grossPay" DECIMAL(12,2) NOT NULL,
    "totalDeductions" DECIMAL(12,2) NOT NULL,
    "netPay" DECIMAL(12,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_components" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "type" "PayComponentType" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isDeduction" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pay_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_certificates" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'DRAFT',
    "patientId" TEXT,
    "issuedById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "daysOff" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "diagnosis" TEXT,
    "fittedForDuty" BOOLEAN,
    "restrictions" TEXT,
    "deceasedName" TEXT,
    "deathDate" TIMESTAMP(3),
    "causeOfDeath" TEXT,
    "placeOfDeath" TEXT,
    "notes" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "visitorNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "relationship" TEXT,
    "patientId" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutTime" TIMESTAMP(3),
    "visitPurpose" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'CHECKED_IN',
    "approvedById" TEXT,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_records" (
    "id" TEXT NOT NULL,
    "triageNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "encounterId" TEXT,
    "walkinName" TEXT,
    "walkinPhone" TEXT,
    "chiefComplaint" TEXT NOT NULL,
    "triageLevel" "TriageLevel" NOT NULL DEFAULT 'NON_URGENT',
    "status" "TriageStatus" NOT NULL DEFAULT 'WAITING',
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "heartRate" INTEGER,
    "temperature" DECIMAL(4,1),
    "oxygenSaturation" INTEGER,
    "respiratoryRate" INTEGER,
    "painScore" INTEGER,
    "glasgowComaScale" INTEGER,
    "triageNurseId" TEXT,
    "assessedAt" TIMESTAMP(3),
    "disposition" TEXT,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "triage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_appraisals" (
    "id" TEXT NOT NULL,
    "appraisalNumber" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "period" "AppraisalPeriod" NOT NULL DEFAULT 'ANNUAL',
    "year" INTEGER NOT NULL,
    "quarter" INTEGER,
    "status" "AppraisalStatus" NOT NULL DEFAULT 'DRAFT',
    "overallScore" DECIMAL(4,2),
    "attendanceScore" DECIMAL(4,2),
    "performanceScore" DECIMAL(4,2),
    "teamworkScore" DECIMAL(4,2),
    "initiativeScore" DECIMAL(4,2),
    "strengths" TEXT,
    "improvements" TEXT,
    "goals" TEXT,
    "staffComments" TEXT,
    "reviewerComments" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_appraisals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_feedback" (
    "id" TEXT NOT NULL,
    "feedbackNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "organizationId" TEXT NOT NULL,
    "category" "FeedbackCategory" NOT NULL DEFAULT 'GENERAL',
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'SUBMITTED',
    "response" TEXT,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulances" (
    "id" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'Basic',
    "status" "AmbulanceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "driverName" TEXT,
    "driverPhone" TEXT,
    "currentLocation" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambulances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transports" (
    "id" TEXT NOT NULL,
    "transportNumber" TEXT NOT NULL,
    "ambulanceId" TEXT,
    "patientId" TEXT,
    "type" "TransportType" NOT NULL DEFAULT 'EMERGENCY',
    "status" "TransportStatus" NOT NULL DEFAULT 'REQUESTED',
    "pickupLocation" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "patientCondition" TEXT,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mar_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "marNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "prescriptionId" TEXT,
    "medicationName" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "route" "MedicationRoute" NOT NULL DEFAULT 'ORAL',
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "administeredAt" TIMESTAMP(3),
    "administeredById" TEXT,
    "status" "MARStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "reasonSkipped" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mar_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "type" "MaintenanceRequestType" NOT NULL,
    "priority" "MaintenanceRequestPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceRequestStatus" NOT NULL DEFAULT 'OPEN',
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trainingNumber" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "category" "TrainingCategory" NOT NULL,
    "type" "TrainingType" NOT NULL DEFAULT 'ELECTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "TrainingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "score" DECIMAL(5,2),
    "certificationNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_alerts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "alertNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MODERATE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_handovers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "handoverNumber" TEXT NOT NULL,
    "fromStaffId" TEXT NOT NULL,
    "toStaffId" TEXT NOT NULL,
    "shiftType" "ShiftType" NOT NULL,
    "departmentId" TEXT NOT NULL,
    "handoverDate" TIMESTAMP(3) NOT NULL,
    "status" "HandoverStatus" NOT NULL DEFAULT 'DRAFT',
    "generalNotes" TEXT,
    "pendingTasks" TEXT,
    "patients" JSONB,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rehab_sessions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "therapistId" TEXT NOT NULL,
    "type" "TherapyType" NOT NULL,
    "status" "RehabStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "goals" TEXT,
    "sessionNotes" TEXT,
    "progressNotes" TEXT,
    "functionalScore" DECIMAL(4,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rehab_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ward_rounds" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roundNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "bedId" TEXT,
    "attendingDoctorId" TEXT NOT NULL,
    "nurseId" TEXT,
    "roundDate" TIMESTAMP(3) NOT NULL,
    "chiefComplaint" TEXT,
    "findings" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "followUpDate" TIMESTAMP(3),
    "status" "WardRoundStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ward_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_forms" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "consentNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL DEFAULT 'GENERAL',
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "consentText" TEXT,
    "signedAt" TIMESTAMP(3),
    "witnessName" TEXT,
    "witnessRelation" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "requestedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discharge_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dischargeNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "admissionId" TEXT,
    "bedId" TEXT,
    "admittedAt" TIMESTAMP(3),
    "dischargedAt" TIMESTAMP(3),
    "dischargeType" "DischargeType" NOT NULL DEFAULT 'REGULAR',
    "status" "DischargeStatus" NOT NULL DEFAULT 'PENDING',
    "dischargingDoctorId" TEXT NOT NULL,
    "dischargeNotes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "followUpInstructions" TEXT,
    "medicationsOnDischarge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discharge_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "encounterNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "EncounterType" NOT NULL DEFAULT 'OUTPATIENT',
    "status" "EncounterStatus" NOT NULL DEFAULT 'PLANNED',
    "appointmentId" TEXT,
    "departmentId" TEXT NOT NULL,
    "attendingDoctorId" TEXT,
    "chiefComplaint" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "disposition" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionType" "AdmissionType" NOT NULL DEFAULT 'EMERGENCY',
    "status" "AdmissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDischargeAt" TIMESTAMP(3),
    "dischargedAt" TIMESTAMP(3),
    "admittingDoctorId" TEXT NOT NULL,
    "attendingDoctorId" TEXT,
    "reason" TEXT NOT NULL,
    "provisionalDiagnosis" TEXT,
    "lengthOfStayDays" INTEGER,
    "lastBedChargeOn" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_assignments" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "assignedById" TEXT,
    "reason" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bed_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "nhisPrice" DECIMAL(12,2),
    "hmoPrice" DECIMAL(12,2),
    "unit" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "serviceItemId" TEXT,
    "description" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "source" "ChargeSource" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "invoiceId" TEXT,
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_order_items" (
    "id" TEXT NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "serviceItemId" TEXT,
    "testName" TEXT NOT NULL,
    "testCode" TEXT,

    CONSTRAINT "lab_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "departments_organizationId_idx" ON "departments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_organizationId_key" ON "departments"("code", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_employeeId_key" ON "staff"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");

-- CreateIndex
CREATE INDEX "staff_departmentId_idx" ON "staff"("departmentId");

-- CreateIndex
CREATE INDEX "staff_organizationId_idx" ON "staff"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_mrn_key" ON "patients"("mrn");

-- CreateIndex
CREATE INDEX "patients_mrn_idx" ON "patients"("mrn");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "patients_organizationId_idx" ON "patients"("organizationId");

-- CreateIndex
CREATE INDEX "patients_lastName_firstName_idx" ON "patients"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE INDEX "appointments_doctorId_idx" ON "appointments"("doctorId");

-- CreateIndex
CREATE INDEX "appointments_scheduledAt_idx" ON "appointments"("scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_organizationId_idx" ON "appointments"("organizationId");

-- CreateIndex
CREATE INDEX "appointments_organizationId_scheduledAt_idx" ON "appointments"("organizationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_organizationId_status_idx" ON "appointments"("organizationId", "status");

-- CreateIndex
CREATE INDEX "beds_departmentId_idx" ON "beds"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "beds_bedNumber_departmentId_key" ON "beds"("bedNumber", "departmentId");

-- CreateIndex
CREATE INDEX "consents_patientId_idx" ON "consents"("patientId");

-- CreateIndex
CREATE INDEX "vital_signs_patientId_idx" ON "vital_signs"("patientId");

-- CreateIndex
CREATE INDEX "vital_signs_appointmentId_idx" ON "vital_signs"("appointmentId");

-- CreateIndex
CREATE INDEX "clinical_notes_patientId_idx" ON "clinical_notes"("patientId");

-- CreateIndex
CREATE INDEX "clinical_notes_appointmentId_idx" ON "clinical_notes"("appointmentId");

-- CreateIndex
CREATE INDEX "clinical_notes_authorId_idx" ON "clinical_notes"("authorId");

-- CreateIndex
CREATE INDEX "diagnoses_patientId_idx" ON "diagnoses"("patientId");

-- CreateIndex
CREATE INDEX "diagnoses_appointmentId_idx" ON "diagnoses"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_patientId_idx" ON "invoices"("patientId");

-- CreateIndex
CREATE INDEX "invoices_organizationId_idx" ON "invoices"("organizationId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_organizationId_idx" ON "payments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_orders_orderNumber_key" ON "lab_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "lab_orders_patientId_idx" ON "lab_orders"("patientId");

-- CreateIndex
CREATE INDEX "lab_orders_organizationId_idx" ON "lab_orders"("organizationId");

-- CreateIndex
CREATE INDEX "lab_orders_status_idx" ON "lab_orders"("status");

-- CreateIndex
CREATE INDEX "lab_results_labOrderId_idx" ON "lab_results"("labOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_results_labOrderId_testName_key" ON "lab_results"("labOrderId", "testName");

-- CreateIndex
CREATE INDEX "drug_items_organizationId_idx" ON "drug_items"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "drug_items_code_organizationId_key" ON "drug_items"("code", "organizationId");

-- CreateIndex
CREATE INDEX "drug_stock_drugItemId_idx" ON "drug_stock"("drugItemId");

-- CreateIndex
CREATE INDEX "drug_stock_organizationId_idx" ON "drug_stock"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_prescriptionNo_key" ON "prescriptions"("prescriptionNo");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_idx" ON "prescriptions"("patientId");

-- CreateIndex
CREATE INDEX "prescriptions_organizationId_idx" ON "prescriptions"("organizationId");

-- CreateIndex
CREATE INDEX "prescriptions_status_idx" ON "prescriptions"("status");

-- CreateIndex
CREATE INDEX "prescription_items_prescriptionId_idx" ON "prescription_items"("prescriptionId");

-- CreateIndex
CREATE INDEX "rosters_departmentId_date_idx" ON "rosters"("departmentId", "date");

-- CreateIndex
CREATE INDEX "rosters_organizationId_idx" ON "rosters"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "rosters_staffId_date_shiftType_key" ON "rosters"("staffId", "date", "shiftType");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referralNumber_key" ON "referrals"("referralNumber");

-- CreateIndex
CREATE INDEX "referrals_patientId_idx" ON "referrals"("patientId");

-- CreateIndex
CREATE INDEX "referrals_organizationId_idx" ON "referrals"("organizationId");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referrals_referredById_idx" ON "referrals"("referredById");

-- CreateIndex
CREATE INDEX "leave_requests_staffId_idx" ON "leave_requests"("staffId");

-- CreateIndex
CREATE INDEX "leave_requests_organizationId_status_idx" ON "leave_requests"("organizationId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_organizationId_startDate_idx" ON "leave_requests"("organizationId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_orders_orderNumber_key" ON "radiology_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "radiology_orders_patientId_idx" ON "radiology_orders"("patientId");

-- CreateIndex
CREATE INDEX "radiology_orders_organizationId_idx" ON "radiology_orders"("organizationId");

-- CreateIndex
CREATE INDEX "radiology_orders_status_idx" ON "radiology_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_results_orderId_key" ON "radiology_results"("orderId");

-- CreateIndex
CREATE INDEX "radiology_results_orderId_idx" ON "radiology_results"("orderId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "opd_queues_organizationId_status_idx" ON "opd_queues"("organizationId", "status");

-- CreateIndex
CREATE INDEX "opd_queues_organizationId_createdAt_idx" ON "opd_queues"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "opd_queues_queueNumber_organizationId_key" ON "opd_queues"("queueNumber", "organizationId");

-- CreateIndex
CREATE INDEX "attendance_organizationId_date_idx" ON "attendance"("organizationId", "date");

-- CreateIndex
CREATE INDEX "attendance_staffId_idx" ON "attendance"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_staffId_date_key" ON "attendance"("staffId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "incident_reports_incidentNumber_key" ON "incident_reports"("incidentNumber");

-- CreateIndex
CREATE INDEX "incident_reports_organizationId_status_idx" ON "incident_reports"("organizationId", "status");

-- CreateIndex
CREATE INDEX "incident_reports_organizationId_severity_idx" ON "incident_reports"("organizationId", "severity");

-- CreateIndex
CREATE INDEX "incident_reports_organizationId_incidentDate_idx" ON "incident_reports"("organizationId", "incidentDate");

-- CreateIndex
CREATE UNIQUE INDEX "blood_donors_donorNumber_key" ON "blood_donors"("donorNumber");

-- CreateIndex
CREATE INDEX "blood_donors_organizationId_idx" ON "blood_donors"("organizationId");

-- CreateIndex
CREATE INDEX "blood_donors_bloodGroup_idx" ON "blood_donors"("bloodGroup");

-- CreateIndex
CREATE UNIQUE INDEX "blood_units_unitNumber_key" ON "blood_units"("unitNumber");

-- CreateIndex
CREATE INDEX "blood_units_organizationId_status_idx" ON "blood_units"("organizationId", "status");

-- CreateIndex
CREATE INDEX "blood_units_bloodGroup_status_idx" ON "blood_units"("bloodGroup", "status");

-- CreateIndex
CREATE UNIQUE INDEX "blood_requests_requestNumber_key" ON "blood_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "blood_requests_organizationId_status_idx" ON "blood_requests"("organizationId", "status");

-- CreateIndex
CREATE INDEX "blood_requests_patientId_idx" ON "blood_requests"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_claims_claimNumber_key" ON "insurance_claims"("claimNumber");

-- CreateIndex
CREATE INDEX "insurance_claims_organizationId_status_idx" ON "insurance_claims"("organizationId", "status");

-- CreateIndex
CREATE INDEX "insurance_claims_patientId_idx" ON "insurance_claims"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "mortuary_records_recordNumber_key" ON "mortuary_records"("recordNumber");

-- CreateIndex
CREATE INDEX "mortuary_records_organizationId_status_idx" ON "mortuary_records"("organizationId", "status");

-- CreateIndex
CREATE INDEX "mortuary_records_organizationId_deathDate_idx" ON "mortuary_records"("organizationId", "deathDate");

-- CreateIndex
CREATE UNIQUE INDEX "theatre_bookings_bookingNumber_key" ON "theatre_bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "theatre_bookings_organizationId_scheduledDate_idx" ON "theatre_bookings"("organizationId", "scheduledDate");

-- CreateIndex
CREATE INDEX "theatre_bookings_organizationId_status_idx" ON "theatre_bookings"("organizationId", "status");

-- CreateIndex
CREATE INDEX "theatre_bookings_patientId_idx" ON "theatre_bookings"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "care_plans_planNumber_key" ON "care_plans"("planNumber");

-- CreateIndex
CREATE INDEX "care_plans_organizationId_status_idx" ON "care_plans"("organizationId", "status");

-- CreateIndex
CREATE INDEX "care_plans_patientId_idx" ON "care_plans"("patientId");

-- CreateIndex
CREATE INDEX "care_plan_tasks_carePlanId_idx" ON "care_plan_tasks"("carePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_organizationId_status_idx" ON "purchase_orders"("organizationId", "status");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_assetNumber_key" ON "assets"("assetNumber");

-- CreateIndex
CREATE INDEX "assets_organizationId_status_idx" ON "assets"("organizationId", "status");

-- CreateIndex
CREATE INDEX "assets_organizationId_category_idx" ON "assets"("organizationId", "category");

-- CreateIndex
CREATE INDEX "asset_maintenances_assetId_idx" ON "asset_maintenances"("assetId");

-- CreateIndex
CREATE INDEX "asset_maintenances_scheduledDate_idx" ON "asset_maintenances"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "diet_orders_orderNumber_key" ON "diet_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "diet_orders_organizationId_status_idx" ON "diet_orders"("organizationId", "status");

-- CreateIndex
CREATE INDEX "diet_orders_patientId_idx" ON "diet_orders"("patientId");

-- CreateIndex
CREATE INDEX "meal_records_dietOrderId_idx" ON "meal_records"("dietOrderId");

-- CreateIndex
CREATE INDEX "meal_records_date_idx" ON "meal_records"("date");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_payrollNumber_key" ON "payrolls"("payrollNumber");

-- CreateIndex
CREATE INDEX "payrolls_organizationId_status_idx" ON "payrolls"("organizationId", "status");

-- CreateIndex
CREATE INDEX "payrolls_organizationId_month_year_idx" ON "payrolls"("organizationId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_staffId_month_year_key" ON "payrolls"("staffId", "month", "year");

-- CreateIndex
CREATE INDEX "pay_components_payrollId_idx" ON "pay_components"("payrollId");

-- CreateIndex
CREATE UNIQUE INDEX "medical_certificates_certificateNumber_key" ON "medical_certificates"("certificateNumber");

-- CreateIndex
CREATE INDEX "medical_certificates_organizationId_type_idx" ON "medical_certificates"("organizationId", "type");

-- CreateIndex
CREATE INDEX "medical_certificates_organizationId_status_idx" ON "medical_certificates"("organizationId", "status");

-- CreateIndex
CREATE INDEX "medical_certificates_patientId_idx" ON "medical_certificates"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "visitors_visitorNumber_key" ON "visitors"("visitorNumber");

-- CreateIndex
CREATE INDEX "visitors_organizationId_status_idx" ON "visitors"("organizationId", "status");

-- CreateIndex
CREATE INDEX "visitors_organizationId_checkInTime_idx" ON "visitors"("organizationId", "checkInTime");

-- CreateIndex
CREATE INDEX "visitors_patientId_idx" ON "visitors"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "triage_records_triageNumber_key" ON "triage_records"("triageNumber");

-- CreateIndex
CREATE INDEX "triage_records_organizationId_status_idx" ON "triage_records"("organizationId", "status");

-- CreateIndex
CREATE INDEX "triage_records_organizationId_triageLevel_idx" ON "triage_records"("organizationId", "triageLevel");

-- CreateIndex
CREATE INDEX "triage_records_organizationId_createdAt_idx" ON "triage_records"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "staff_appraisals_appraisalNumber_key" ON "staff_appraisals"("appraisalNumber");

-- CreateIndex
CREATE INDEX "staff_appraisals_organizationId_status_idx" ON "staff_appraisals"("organizationId", "status");

-- CreateIndex
CREATE INDEX "staff_appraisals_staffId_idx" ON "staff_appraisals"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_appraisals_staffId_period_year_quarter_key" ON "staff_appraisals"("staffId", "period", "year", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "patient_feedback_feedbackNumber_key" ON "patient_feedback"("feedbackNumber");

-- CreateIndex
CREATE INDEX "patient_feedback_organizationId_status_idx" ON "patient_feedback"("organizationId", "status");

-- CreateIndex
CREATE INDEX "patient_feedback_organizationId_category_idx" ON "patient_feedback"("organizationId", "category");

-- CreateIndex
CREATE INDEX "patient_feedback_patientId_idx" ON "patient_feedback"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_vehicleNumber_key" ON "ambulances"("vehicleNumber");

-- CreateIndex
CREATE INDEX "ambulances_organizationId_status_idx" ON "ambulances"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "transports_transportNumber_key" ON "transports"("transportNumber");

-- CreateIndex
CREATE INDEX "transports_organizationId_status_idx" ON "transports"("organizationId", "status");

-- CreateIndex
CREATE INDEX "transports_organizationId_type_idx" ON "transports"("organizationId", "type");

-- CreateIndex
CREATE INDEX "transports_patientId_idx" ON "transports"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "mar_records_marNumber_key" ON "mar_records"("marNumber");

-- CreateIndex
CREATE INDEX "mar_records_organizationId_patientId_idx" ON "mar_records"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "mar_records_organizationId_status_idx" ON "mar_records"("organizationId", "status");

-- CreateIndex
CREATE INDEX "mar_records_scheduledTime_idx" ON "mar_records"("scheduledTime");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_requests_requestNumber_key" ON "maintenance_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "maintenance_requests_organizationId_status_idx" ON "maintenance_requests"("organizationId", "status");

-- CreateIndex
CREATE INDEX "maintenance_requests_organizationId_priority_idx" ON "maintenance_requests"("organizationId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "training_records_trainingNumber_key" ON "training_records"("trainingNumber");

-- CreateIndex
CREATE INDEX "training_records_organizationId_staffId_idx" ON "training_records"("organizationId", "staffId");

-- CreateIndex
CREATE INDEX "training_records_organizationId_status_idx" ON "training_records"("organizationId", "status");

-- CreateIndex
CREATE INDEX "training_records_organizationId_expiryDate_idx" ON "training_records"("organizationId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "patient_alerts_alertNumber_key" ON "patient_alerts"("alertNumber");

-- CreateIndex
CREATE INDEX "patient_alerts_organizationId_patientId_idx" ON "patient_alerts"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "patient_alerts_organizationId_isActive_idx" ON "patient_alerts"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "patient_alerts_organizationId_type_idx" ON "patient_alerts"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "shift_handovers_handoverNumber_key" ON "shift_handovers"("handoverNumber");

-- CreateIndex
CREATE INDEX "shift_handovers_organizationId_departmentId_idx" ON "shift_handovers"("organizationId", "departmentId");

-- CreateIndex
CREATE INDEX "shift_handovers_organizationId_handoverDate_idx" ON "shift_handovers"("organizationId", "handoverDate");

-- CreateIndex
CREATE UNIQUE INDEX "rehab_sessions_sessionNumber_key" ON "rehab_sessions"("sessionNumber");

-- CreateIndex
CREATE INDEX "rehab_sessions_organizationId_patientId_idx" ON "rehab_sessions"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "rehab_sessions_organizationId_therapistId_idx" ON "rehab_sessions"("organizationId", "therapistId");

-- CreateIndex
CREATE INDEX "rehab_sessions_organizationId_status_idx" ON "rehab_sessions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "rehab_sessions_scheduledAt_idx" ON "rehab_sessions"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "ward_rounds_roundNumber_key" ON "ward_rounds"("roundNumber");

-- CreateIndex
CREATE INDEX "ward_rounds_organizationId_patientId_idx" ON "ward_rounds"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "ward_rounds_organizationId_roundDate_idx" ON "ward_rounds"("organizationId", "roundDate");

-- CreateIndex
CREATE INDEX "ward_rounds_organizationId_status_idx" ON "ward_rounds"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "consent_forms_consentNumber_key" ON "consent_forms"("consentNumber");

-- CreateIndex
CREATE INDEX "consent_forms_organizationId_patientId_idx" ON "consent_forms"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "consent_forms_organizationId_status_idx" ON "consent_forms"("organizationId", "status");

-- CreateIndex
CREATE INDEX "consent_forms_organizationId_consentType_idx" ON "consent_forms"("organizationId", "consentType");

-- CreateIndex
CREATE UNIQUE INDEX "discharge_records_dischargeNumber_key" ON "discharge_records"("dischargeNumber");

-- CreateIndex
CREATE INDEX "discharge_records_organizationId_patientId_idx" ON "discharge_records"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "discharge_records_organizationId_status_idx" ON "discharge_records"("organizationId", "status");

-- CreateIndex
CREATE INDEX "discharge_records_organizationId_dischargedAt_idx" ON "discharge_records"("organizationId", "dischargedAt");

-- CreateIndex
CREATE INDEX "discharge_records_encounterId_idx" ON "discharge_records"("encounterId");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_encounterNumber_key" ON "encounters"("encounterNumber");

-- CreateIndex
CREATE INDEX "encounters_patientId_idx" ON "encounters"("patientId");

-- CreateIndex
CREATE INDEX "encounters_organizationId_status_idx" ON "encounters"("organizationId", "status");

-- CreateIndex
CREATE INDEX "encounters_organizationId_type_idx" ON "encounters"("organizationId", "type");

-- CreateIndex
CREATE INDEX "encounters_organizationId_startedAt_idx" ON "encounters"("organizationId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_admissionNumber_key" ON "admissions"("admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_encounterId_key" ON "admissions"("encounterId");

-- CreateIndex
CREATE INDEX "admissions_patientId_idx" ON "admissions"("patientId");

-- CreateIndex
CREATE INDEX "admissions_organizationId_status_idx" ON "admissions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "admissions_organizationId_admittedAt_idx" ON "admissions"("organizationId", "admittedAt");

-- CreateIndex
CREATE INDEX "bed_assignments_admissionId_idx" ON "bed_assignments"("admissionId");

-- CreateIndex
CREATE INDEX "bed_assignments_bedId_idx" ON "bed_assignments"("bedId");

-- CreateIndex
CREATE INDEX "bed_assignments_organizationId_releasedAt_idx" ON "bed_assignments"("organizationId", "releasedAt");

-- CreateIndex
CREATE INDEX "service_items_organizationId_category_idx" ON "service_items"("organizationId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "service_items_code_organizationId_key" ON "service_items"("code", "organizationId");

-- CreateIndex
CREATE INDEX "charges_encounterId_idx" ON "charges"("encounterId");

-- CreateIndex
CREATE INDEX "charges_patientId_idx" ON "charges"("patientId");

-- CreateIndex
CREATE INDEX "charges_organizationId_isBilled_idx" ON "charges"("organizationId", "isBilled");

-- CreateIndex
CREATE UNIQUE INDEX "charges_source_sourceRef_key" ON "charges"("source", "sourceRef");

-- CreateIndex
CREATE INDEX "lab_order_items_labOrderId_idx" ON "lab_order_items"("labOrderId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_consultationServiceItemId_fkey" FOREIGN KEY ("consultationServiceItemId") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_diagnosedById_fkey" FOREIGN KEY ("diagnosedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_items" ADD CONSTRAINT "drug_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_stock" ADD CONSTRAINT "drug_stock_drugItemId_fkey" FOREIGN KEY ("drugItemId") REFERENCES "drug_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_stock" ADD CONSTRAINT "drug_stock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescribedById_fkey" FOREIGN KEY ("prescribedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_drugItemId_fkey" FOREIGN KEY ("drugItemId") REFERENCES "drug_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_toStaffId_fkey" FOREIGN KEY ("toStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_results" ADD CONSTRAINT "radiology_results_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "radiology_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_results" ADD CONSTRAINT "radiology_results_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_results" ADD CONSTRAINT "radiology_results_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_queues" ADD CONSTRAINT "opd_queues_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_queues" ADD CONSTRAINT "opd_queues_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_queues" ADD CONSTRAINT "opd_queues_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_queues" ADD CONSTRAINT "opd_queues_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_queues" ADD CONSTRAINT "opd_queues_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_donors" ADD CONSTRAINT "blood_donors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_units" ADD CONSTRAINT "blood_units_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "blood_donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_units" ADD CONSTRAINT "blood_units_issuedToId_fkey" FOREIGN KEY ("issuedToId") REFERENCES "blood_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_units" ADD CONSTRAINT "blood_units_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortuary_records" ADD CONSTRAINT "mortuary_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortuary_records" ADD CONSTRAINT "mortuary_records_admittedById_fkey" FOREIGN KEY ("admittedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortuary_records" ADD CONSTRAINT "mortuary_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theatre_bookings" ADD CONSTRAINT "theatre_bookings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theatre_bookings" ADD CONSTRAINT "theatre_bookings_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theatre_bookings" ADD CONSTRAINT "theatre_bookings_surgeonId_fkey" FOREIGN KEY ("surgeonId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theatre_bookings" ADD CONSTRAINT "theatre_bookings_anaesthesiologistId_fkey" FOREIGN KEY ("anaesthesiologistId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theatre_bookings" ADD CONSTRAINT "theatre_bookings_assistantSurgeonId_fkey" FOREIGN KEY ("assistantSurgeonId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theatre_bookings" ADD CONSTRAINT "theatre_bookings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_tasks" ADD CONSTRAINT "care_plan_tasks_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_orders" ADD CONSTRAINT "diet_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_orders" ADD CONSTRAINT "diet_orders_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_orders" ADD CONSTRAINT "diet_orders_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_orders" ADD CONSTRAINT "diet_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_dietOrderId_fkey" FOREIGN KEY ("dietOrderId") REFERENCES "diet_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_components" ADD CONSTRAINT "pay_components_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_triageNurseId_fkey" FOREIGN KEY ("triageNurseId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_appraisals" ADD CONSTRAINT "staff_appraisals_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_appraisals" ADD CONSTRAINT "staff_appraisals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_appraisals" ADD CONSTRAINT "staff_appraisals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_feedback" ADD CONSTRAINT "patient_feedback_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_feedback" ADD CONSTRAINT "patient_feedback_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_feedback" ADD CONSTRAINT "patient_feedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulances" ADD CONSTRAINT "ambulances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mar_records" ADD CONSTRAINT "mar_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mar_records" ADD CONSTRAINT "mar_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mar_records" ADD CONSTRAINT "mar_records_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mar_records" ADD CONSTRAINT "mar_records_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_alerts" ADD CONSTRAINT "patient_alerts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_alerts" ADD CONSTRAINT "patient_alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_alerts" ADD CONSTRAINT "patient_alerts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_alerts" ADD CONSTRAINT "patient_alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_fromStaffId_fkey" FOREIGN KEY ("fromStaffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_toStaffId_fkey" FOREIGN KEY ("toStaffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehab_sessions" ADD CONSTRAINT "rehab_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehab_sessions" ADD CONSTRAINT "rehab_sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehab_sessions" ADD CONSTRAINT "rehab_sessions_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehab_sessions" ADD CONSTRAINT "rehab_sessions_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_rounds" ADD CONSTRAINT "ward_rounds_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_rounds" ADD CONSTRAINT "ward_rounds_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_rounds" ADD CONSTRAINT "ward_rounds_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_rounds" ADD CONSTRAINT "ward_rounds_attendingDoctorId_fkey" FOREIGN KEY ("attendingDoctorId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_rounds" ADD CONSTRAINT "ward_rounds_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_forms" ADD CONSTRAINT "consent_forms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_forms" ADD CONSTRAINT "consent_forms_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_forms" ADD CONSTRAINT "consent_forms_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_records" ADD CONSTRAINT "discharge_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_records" ADD CONSTRAINT "discharge_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_records" ADD CONSTRAINT "discharge_records_dischargingDoctorId_fkey" FOREIGN KEY ("dischargingDoctorId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_records" ADD CONSTRAINT "discharge_records_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_records" ADD CONSTRAINT "discharge_records_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_attendingDoctorId_fkey" FOREIGN KEY ("attendingDoctorId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_admittingDoctorId_fkey" FOREIGN KEY ("admittingDoctorId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_attendingDoctorId_fkey" FOREIGN KEY ("attendingDoctorId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
