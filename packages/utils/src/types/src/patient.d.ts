import type { BloodGroup, Gender } from "./enums";
import type { AuditFields, PaginationQuery } from "./common";
export interface Patient extends AuditFields {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: Gender;
    phone: string;
    email: string | null;
    address: string | null;
    state: string | null;
    country: string;
    bloodGroup: BloodGroup | null;
    allergies: string | null;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
    ninNumber: string | null;
    nhisNumber: string | null;
    isActive: boolean;
    organizationId: string;
}
export interface CreatePatientDto {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: Gender;
    phone: string;
    email?: string;
    address?: string;
    state?: string;
    bloodGroup?: BloodGroup;
    allergies?: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
    ninNumber?: string;
    nhisNumber?: string;
}
export interface UpdatePatientDto extends Partial<CreatePatientDto> {
}
export interface PatientQuery extends PaginationQuery {
    gender?: Gender;
    bloodGroup?: BloodGroup;
    isActive?: boolean;
}
//# sourceMappingURL=patient.d.ts.map