import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { TicketCategory, TicketPriority, TicketStatus, TicketTeam } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { slaTargets, slaState, defaultTeamFor } from "./sla";

const genTicketNo = customAlphabet("0123456789", 6);

/** Statuses a ticket can no longer be worked from. */
const SETTLED: TicketStatus[] = ["RESOLVED", "CLOSED", "CANCELLED"];

@Injectable()
export class HelpdeskService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: {
      title: string;
      description: string;
      category: TicketCategory;
      location: string;
      priority?: TicketPriority;
      team?: TicketTeam;
      assignedToId?: string;
    },
    organizationId: string,
    requestedById: string,
  ) {
    const priority = dto.priority ?? "MEDIUM";
    const { respondBy, resolveBy } = slaTargets(priority);

    return this.prisma.supportTicket.create({
      data: {
        ticketNumber: `TKT-${genTicketNo()}`,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        // Routed by category unless someone says otherwise, so a ticket is
        // never left in a queue nobody watches.
        team: dto.team ?? defaultTeamFor(dto.category),
        location: dto.location,
        priority,
        status: dto.assignedToId ? "ASSIGNED" : "OPEN",
        assignedToId: dto.assignedToId,
        respondBy,
        resolveBy,
        requestedById,
        organizationId,
      },
      include: this.include(),
    });
  }

  private include() {
    return {
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { comments: true } },
    } as const;
  }

  private decorate<T extends {
    status: string;
    respondBy: Date;
    resolveBy: Date;
    firstRespondedAt: Date | null;
    resolvedAt: Date | null;
  }>(ticket: T) {
    return { ...ticket, sla: slaState(ticket) };
  }

  async list(
    organizationId: string,
    filters: {
      status?: TicketStatus;
      team?: TicketTeam;
      priority?: TicketPriority;
      assignedToId?: string;
      overdueOnly?: boolean;
    } = {},
  ) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        organizationId,
        ...(filters.status && { status: filters.status }),
        ...(filters.team && { team: filters.team }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
      },
      include: this.include(),
      orderBy: [{ status: "asc" }, { resolveBy: "asc" }],
      take: 300,
    });

    const decorated = tickets.map((t) => this.decorate(t));
    return filters.overdueOnly
      ? decorated.filter((t) => t.sla.resolutionOverdue || t.sla.responseOverdue)
      : decorated;
  }

  async findOne(id: string, organizationId: string, includeInternal = true) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
      include: {
        ...this.include(),
        comments: {
          where: includeInternal ? {} : { isInternal: false },
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    return this.decorate(ticket);
  }

  async assign(id: string, assignedToId: string, organizationId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (SETTLED.includes(ticket.status)) {
      throw new BadRequestException(`A ${ticket.status.toLowerCase()} ticket cannot be assigned`);
    }

    const staff = await this.prisma.staff.findFirst({
      where: { id: assignedToId, organizationId },
    });
    if (!staff) throw new NotFoundException("Staff member not found");

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        assignedToId,
        status: ticket.status === "OPEN" ? "ASSIGNED" : ticket.status,
      },
      include: this.include(),
    });
  }

  /**
   * Adds to the conversation.
   *
   * The first reply that the requester can actually see is what stops the
   * response clock — an internal note between engineers is not an answer to
   * the person waiting.
   */
  async comment(
    id: string,
    dto: { body: string; isInternal?: boolean },
    organizationId: string,
    authorId?: string | null,
  ) {
    if (!dto.body?.trim()) throw new BadRequestException("A comment cannot be empty");

    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const isInternal = dto.isInternal ?? false;
    const startsTheClock =
      !isInternal && ticket.firstRespondedAt === null && authorId !== ticket.requestedById;

    const [comment] = await this.prisma.$transaction([
      this.prisma.ticketComment.create({
        data: {
          ticketId: id,
          body: dto.body.trim(),
          isInternal,
          authorId: authorId ?? undefined,
          organizationId,
        },
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
      }),
      ...(startsTheClock
        ? [
            this.prisma.supportTicket.update({
              where: { id },
              data: { firstRespondedAt: new Date() },
            }),
          ]
        : []),
    ]);

    return comment;
  }

  async updateStatus(
    id: string,
    dto: { status: TicketStatus; resolutionNotes?: string },
    organizationId: string,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    // A ticket marked fixed with no account of what was done tells the next
    // person nothing when it comes back.
    if (dto.status === "RESOLVED" && !dto.resolutionNotes?.trim()) {
      throw new BadRequestException("Resolving a ticket needs a note saying what was done");
    }
    if (dto.status === "CANCELLED" && !dto.resolutionNotes?.trim()) {
      throw new BadRequestException("Cancelling a ticket needs a reason");
    }
    if (ticket.status === "CLOSED" && dto.status !== "OPEN") {
      throw new BadRequestException("A closed ticket can only be reopened");
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.resolutionNotes && { resolutionNotes: dto.resolutionNotes.trim() }),
        ...(dto.status === "RESOLVED" && { resolvedAt: new Date() }),
        ...(dto.status === "CLOSED" && { closedAt: new Date() }),
        ...(dto.status === "CANCELLED" && { closedAt: new Date() }),
      },
      include: this.include(),
    });
  }

  /**
   * Reopens a ticket that was not really fixed.
   *
   * The resolution clock restarts from now rather than keeping the original
   * target, which would mark the ticket overdue the instant it reopened and
   * tell nobody anything useful. The reopen count is what shows the desk is
   * closing things too early.
   */
  async reopen(id: string, reason: string, organizationId: string, authorId?: string | null) {
    if (!reason?.trim()) throw new BadRequestException("Reopening a ticket needs a reason");

    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
      throw new BadRequestException("Only a resolved or closed ticket can be reopened");
    }

    const { resolveBy } = slaTargets(ticket.priority);

    const [updated] = await this.prisma.$transaction([
      this.prisma.supportTicket.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          resolvedAt: null,
          closedAt: null,
          resolveBy,
          reopenCount: { increment: 1 },
        },
        include: this.include(),
      }),
      this.prisma.ticketComment.create({
        data: {
          ticketId: id,
          body: `Reopened: ${reason.trim()}`,
          isInternal: false,
          authorId: authorId ?? undefined,
          organizationId,
        },
      }),
    ]);

    return updated;
  }

  /** What the desk looks like right now. */
  async summary(organizationId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { organizationId },
      select: {
        status: true,
        team: true,
        priority: true,
        respondBy: true,
        resolveBy: true,
        firstRespondedAt: true,
        resolvedAt: true,
        createdAt: true,
        reopenCount: true,
      },
    });

    const open = tickets.filter((t) => !SETTLED.includes(t.status));
    const overdue = open.filter((t) => slaState(t).resolutionOverdue);
    const awaitingFirstReply = open.filter((t) => t.firstRespondedAt === null);

    const responded = tickets.filter((t) => t.firstRespondedAt);
    const averageFirstResponseMinutes = responded.length
      ? Math.round(
          responded.reduce(
            (a, t) => a + (t.firstRespondedAt!.getTime() - t.createdAt.getTime()) / 60000,
            0,
          ) / responded.length,
        )
      : null;

    const byTeam = Object.values(TicketTeam).map((team) => ({
      team,
      open: open.filter((t) => t.team === team).length,
      overdue: overdue.filter((t) => t.team === team).length,
    }));

    // Tickets resolved within target, of those that reached a conclusion.
    const concluded = tickets.filter((t) => t.resolvedAt);
    const metTarget = concluded.filter((t) => !slaState(t).resolutionOverdue).length;

    return {
      total: tickets.length,
      open: open.length,
      overdue: overdue.length,
      awaitingFirstReply: awaitingFirstReply.length,
      reopened: tickets.filter((t) => t.reopenCount > 0).length,
      averageFirstResponseMinutes,
      slaAttainment: concluded.length
        ? Math.round((metTarget / concluded.length) * 100)
        : null,
      byTeam,
    };
  }
}
