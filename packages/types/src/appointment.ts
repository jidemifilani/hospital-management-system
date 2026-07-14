import type { AppointmentStatus, AppointmentType } from "./enums";
import type { AuditFields } from "./common";

export interface Appointment extends AuditFields {
  id: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  scheduledAt: Date;
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  chiefComplaint: string | null;
  notes: string | null;
  cancelReason: string | null;
  isTelemedicine: boolean;
  organizationId: string;
  patientName?: string;
  doctorName?: string;
}

export interface CreateAppointmentDto {
  patientId: string;
  doctorId: string;
  departmentId: string;
  scheduledAt: string;
  durationMinutes?: number;
  type: AppointmentType;
  chiefComplaint?: string;
  notes?: string;
  isTelemedicine?: boolean;
}

export interface UpdateAppointmentDto extends Partial<CreateAppointmentDto> {
  status?: AppointmentStatus;
  cancelReason?: string;
}
