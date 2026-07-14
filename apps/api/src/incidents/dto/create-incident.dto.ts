export class CreateIncidentDto {
  title: string;
  description: string;
  severity: string;
  incidentDate: string;
  patientId?: string;
  departmentId?: string;
  assignedToId?: string;
}

export class UpdateIncidentDto {
  status?: string;
  assignedToId?: string;
  rootCause?: string;
  correctiveAction?: string;
}
