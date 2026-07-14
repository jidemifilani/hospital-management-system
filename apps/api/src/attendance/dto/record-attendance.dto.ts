export class RecordAttendanceDto {
  staffId: string;
  date: string;
  status?: string;
  notes?: string;
}

export class ClockDto {
  time?: string;
}
