import { AmbulanceStatus, TransportStatus, TransportType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Ambulances and the journeys they make.
 *
 * Five bodies here were typed `any` — the most of any controller — so none of
 * it was checked. A transport requested with no pickup location is a dispatch
 * nobody can act on, and it answered 500 rather than saying so.
 */
export class CreateAmbulanceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  plateNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  vehicleType: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  driverName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  driverPhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  currentLocation?: string;
}

/**
 * Where a vehicle is and who is driving it, as it changes through a shift.
 *
 * `status` is required: it is what the endpoint is for, and the only thing the
 * UI sends. Left optional, the service passed `undefined` into the update,
 * which Prisma reads as "leave it alone" — so a request that forgot the status
 * changed nothing and still answered 200.
 */
export class UpdateAmbulanceStatusDto {
  @IsEnum(AmbulanceStatus)
  status: AmbulanceStatus;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  currentLocation?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  driverName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  driverPhone?: string;
}

export class CreateTransportDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsEnum(TransportType)
  type: TransportType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  pickupLocation: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  destination: string;

  /** How the patient is travelling, which decides what the crew brings. */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  patientCondition?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateTransportStatusDto {
  @IsEnum(TransportStatus)
  status: TransportStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

/**
 * Sending a vehicle to a job.
 *
 * `ambulanceId` was read straight off an `any` body, so dispatching without
 * one looked up `undefined` and surfaced as "Ambulance not found" — which
 * reads as a missing vehicle rather than a missing field.
 */
export class DispatchTransportDto {
  @IsString()
  @IsNotEmpty()
  ambulanceId: string;
}
