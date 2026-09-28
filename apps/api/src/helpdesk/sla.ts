import { TicketPriority, TicketCategory, TicketTeam } from "@prisma/client";

/**
 * How long the desk has to answer and to fix, by priority.
 *
 * Expressed in hours against the wall clock rather than working hours: a
 * hospital does not close, and a ward with no power at 2am is not a Monday
 * morning problem.
 */
export const SLA_HOURS: Record<TicketPriority, { respond: number; resolve: number }> = {
  URGENT: { respond: 1, resolve: 4 },
  HIGH: { respond: 4, resolve: 24 },
  MEDIUM: { respond: 8, resolve: 72 },
  LOW: { respond: 24, resolve: 168 },
};

const HOUR = 60 * 60 * 1000;

export function slaTargets(priority: TicketPriority, from = new Date()) {
  const { respond, resolve } = SLA_HOURS[priority];
  return {
    respondBy: new Date(from.getTime() + respond * HOUR),
    resolveBy: new Date(from.getTime() + resolve * HOUR),
  };
}

/** Where a ticket goes when nobody says. */
const TEAM_FOR: Record<TicketCategory, TicketTeam> = {
  CLEANING: "HOUSEKEEPING",
  PEST_CONTROL: "HOUSEKEEPING",
  PLUMBING: "FACILITIES",
  ELECTRICAL: "FACILITIES",
  HVAC: "FACILITIES",
  CARPENTRY: "FACILITIES",
  PAINTING: "FACILITIES",
  IT_SUPPORT: "IT",
  MEDICAL_EQUIPMENT: "BIOMEDICAL",
  SECURITY: "SECURITY",
  OTHER: "GENERAL",
};

export const defaultTeamFor = (category: TicketCategory): TicketTeam => TEAM_FOR[category];

export interface SlaState {
  responseOverdue: boolean;
  resolutionOverdue: boolean;
  /** Negative once the target has passed. */
  minutesToResolve: number | null;
}

/**
 * Whether a ticket has missed its targets.
 *
 * A ticket already resolved is judged on when it was resolved, not on the
 * clock now — otherwise every old ticket would drift into breach and the
 * overdue count would be meaningless.
 */
export function slaState(ticket: {
  status: string;
  respondBy: Date;
  resolveBy: Date;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
}, now = new Date()): SlaState {
  const settled = ["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.status);

  const responseOverdue = ticket.firstRespondedAt
    ? ticket.firstRespondedAt > ticket.respondBy
    : !settled && now > ticket.respondBy;

  const resolutionOverdue = ticket.resolvedAt
    ? ticket.resolvedAt > ticket.resolveBy
    : !settled && now > ticket.resolveBy;

  return {
    responseOverdue,
    resolutionOverdue,
    minutesToResolve: settled
      ? null
      : Math.round((ticket.resolveBy.getTime() - now.getTime()) / 60000),
  };
}
