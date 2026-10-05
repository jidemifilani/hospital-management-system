import { IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { IsStrictBoolean } from "../../common/validation/is-strict-boolean.decorator";

// Without decorators the global whitelist pipe rejects every property.
export class NotificationChannelDto {
  @IsStrictBoolean() @IsOptional() appointmentReminder?: boolean;
  @IsStrictBoolean() @IsOptional() invoiceCreated?: boolean;
  @IsStrictBoolean() @IsOptional() userCreated?: boolean;
  @IsStrictBoolean() @IsOptional() labResultReady?: boolean;
  @IsStrictBoolean() @IsOptional() leaveApproved?: boolean;
}

export class UpdateNotificationsDto {
  @ValidateNested() @Type(() => NotificationChannelDto) @IsOptional()
  email?: NotificationChannelDto;

  @ValidateNested() @Type(() => NotificationChannelDto) @IsOptional()
  sms?: NotificationChannelDto;
}
