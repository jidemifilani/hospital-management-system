export class CreateQueueDto {
  patientId: string;
  departmentId: string;
  doctorId?: string;
  appointmentId?: string;
  notes?: string;
}
