import type { StaffRole, UserStatus } from "./enums";
import type { AuditFields } from "./common";

export interface Staff extends AuditFields {
  id: string;
  employeeId: string;
  userId: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  departmentId: string;
  department: string;
  specialization: string | null;
  licenseNumber: string | null;
  phone: string;
  isActive: boolean;
  organizationId: string;
}

export interface CreateStaffDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: StaffRole;
  departmentId: string;
  specialization?: string;
  licenseNumber?: string;
  phone: string;
}

export interface UpdateStaffDto extends Partial<Omit<CreateStaffDto, "email" | "password">> {}
