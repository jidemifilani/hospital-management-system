import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { TicketCategory, TicketPriority, TicketStatus, TicketTeam } from "@prisma/client";

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  /** Where the problem is; an engineer cannot attend "the hospital". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  /** Defaults from the category when not given. */
  @IsEnum(TicketTeam)
  @IsOptional()
  team?: TicketTeam;

  @IsString()
  @IsOptional()
  assignedToId?: string;
}

export class AssignTicketDto {
  @IsString()
  @IsNotEmpty()
  assignedToId: string;
}

export class TicketCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body: string;

  /** Internal notes are not shown to whoever raised the ticket. */
  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;

  /** Required when resolving or cancelling; the service enforces that. */
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  resolutionNotes?: string;
}

export class ReopenTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
