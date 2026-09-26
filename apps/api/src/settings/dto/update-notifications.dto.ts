import { IsBoolean, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

// Without decorators the global whitelist pipe rejects every property.
export class NotificationChannelDto {
  @IsBoolean() @IsOptional() appointmentReminder?: boolean;
  @IsBoolean() @IsOptional() invoiceCreated?: boolean;
  @IsBoolean() @IsOptional() userCreated?: boolean;
  @IsBoolean() @IsOptional() labResultReady?: boolean;
  @IsBoolean() @IsOptional() leaveApproved?: boolean;
}

export class UpdateNotificationsDto {
  @ValidateNested() @Type(() => NotificationChannelDto) @IsOptional()
  email?: NotificationChannelDto;

  @ValidateNested() @Type(() => NotificationChannelDto) @IsOptional()
  sms?: NotificationChannelDto;
}
