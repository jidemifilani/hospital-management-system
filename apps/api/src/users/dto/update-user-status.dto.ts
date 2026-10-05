import { UserStatus } from "@prisma/client";
import { IsIn } from "class-validator";

/**
 * Suspending or reactivating an account.
 *
 * The status was taken with `@Body("status")` and typed as a union of three
 * strings. A union is erased at compile time, and a single extracted property
 * is not validated, so any string at all reached the service and went on to
 * the column.
 *
 * Deliberately not the whole UserStatus enum: PENDING_VERIFICATION belongs to
 * a newly created account that has not confirmed itself, and is not something
 * an administrator sets by hand. The service has always restricted itself to
 * these three; this says so where a caller can see it.
 */
const SETTABLE_BY_ADMIN = [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.SUSPENDED,
] as const;

export class UpdateUserStatusDto {
  @IsIn([...SETTABLE_BY_ADMIN])
  status: (typeof SETTABLE_BY_ADMIN)[number];
}
