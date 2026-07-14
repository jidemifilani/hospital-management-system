export class NotificationChannelDto {
  appointmentReminder?: boolean;
  invoiceCreated?: boolean;
  userCreated?: boolean;
  labResultReady?: boolean;
  leaveApproved?: boolean;
}

export class UpdateNotificationsDto {
  email?: NotificationChannelDto;
  sms?: NotificationChannelDto;
}
