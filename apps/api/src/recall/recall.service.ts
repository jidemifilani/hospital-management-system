import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import {
  OutreachChannel,
  OutreachOutcome,
  Prisma,
  RecallSource,
  RecallStatus,
} from "@prisma/client";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";

const genRecallNo = customAlphabet("0123456789", 6);

/** Statuses that no longer need chasing. */
const CLOSED: RecallStatus[] = ["ATTENDED", "CANCELLED"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

@Injectable()
export class RecallService {
  private readonly logger = new Logger(RecallService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Raises a recall, at most once per originating event.
   *
   * Discharge and ward-round follow-up dates arrive here. The unique
   * (source, sourceRef) pair means editing a discharge summary twice does not
   * put the same patient on the list twice.
   */
  async raise(
    dto: {
      patientId: string;
      reason: string;
      dueOn: Date | string;
      instructions?: string;
      source?: RecallSource;
      sourceRef?: string;
      assignedToId?: string;
    },
    organizationId: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, organizationId },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    if (!dto.reason?.trim()) {
      throw new BadRequestException("A recall needs a reason, or nobody knows what to call about");
    }

    try {
      return await this.prisma.patientRecall.create({
        data: {
          recallNumber: `REC-${genRecallNo()}`,
          patientId: dto.patientId,
          reason: dto.reason.trim(),
          instructions: dto.instructions,
          dueOn: new Date(dto.dueOn),
          source: dto.source ?? "MANUAL",
          sourceRef: dto.sourceRef,
          assignedToId: dto.assignedToId,
          organizationId,
        },
        include: this.include(),
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await this.prisma.patientRecall.findFirst({
          where: { source: dto.source ?? "MANUAL", sourceRef: dto.sourceRef ?? null },
          include: this.include(),
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  /**
   * Called when a follow-up date is recorded somewhere else. Never throws:
   * a recall failing must not stop a discharge being completed.
   */
  async raiseQuietly(
    dto: Parameters<RecallService["raise"]>[0],
    organizationId: string,
  ) {
    try {
      return await this.raise(dto, organizationId);
    } catch (err) {
      this.logger.error(
        `Could not raise a recall for patient ${dto.patientId}`,
        err instanceof Error ? err.stack : err,
      );
      return null;
    }
  }

  private include() {
    return {
      patient: {
        select: { id: true, firstName: true, lastName: true, mrn: true, phone: true },
      },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      appointment: { select: { id: true, scheduledAt: true, status: true } },
      attempts: {
        select: { id: true, channel: true, outcome: true, createdAt: true, note: true },
        orderBy: { createdAt: "desc" as const },
      },
    };
  }

  async list(
    organizationId: string,
    filters: { status?: RecallStatus; due?: "overdue" | "today" | "upcoming" } = {},
  ) {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const dueWindow =
      filters.due === "overdue"
        ? { dueOn: { lt: today } }
        : filters.due === "today"
          ? { dueOn: { gte: today, lt: tomorrow } }
          : filters.due === "upcoming"
            ? { dueOn: { gte: tomorrow } }
            : {};

    const recalls = await this.prisma.patientRecall.findMany({
      where: {
        organizationId,
        ...(filters.status && { status: filters.status }),
        ...dueWindow,
        // The due-date filters are about work still to do, so anything already
        // settled is left out of them.
        ...(filters.due ? { status: { notIn: CLOSED } } : {}),
      },
      include: this.include(),
      orderBy: [{ dueOn: "asc" }],
      take: 300,
    });

    return recalls.map((r) => ({
      ...r,
      isOverdue: !CLOSED.includes(r.status) && r.dueOn < today,
      attemptCount: r.attempts.length,
    }));
  }

  async logAttempt(
    id: string,
    dto: { channel: OutreachChannel; outcome: OutreachOutcome; note?: string },
    organizationId: string,
    contactedById?: string | null,
  ) {
    const recall = await this.prisma.patientRecall.findFirst({
      where: { id, organizationId },
    });
    if (!recall) throw new NotFoundException("Recall not found");
    if (CLOSED.includes(recall.status)) {
      throw new BadRequestException(`This recall is already ${recall.status.toLowerCase()}`);
    }

    return this.prisma.outreachAttempt.create({
      data: {
        recallId: id,
        channel: dto.channel,
        outcome: dto.outcome,
        note: dto.note,
        contactedById: contactedById ?? undefined,
        organizationId,
      },
    });
  }

  /** Links a recall to the appointment that satisfies it. */
  async book(id: string, appointmentId: string, organizationId: string) {
    const [recall, appointment] = await Promise.all([
      this.prisma.patientRecall.findFirst({ where: { id, organizationId } }),
      this.prisma.appointment.findFirst({ where: { id: appointmentId, organizationId } }),
    ]);
    if (!recall) throw new NotFoundException("Recall not found");
    if (!appointment) throw new NotFoundException("Appointment not found");

    if (appointment.patientId !== recall.patientId) {
      throw new BadRequestException(
        "That appointment is for a different patient, so it cannot close this recall",
      );
    }
    if (CLOSED.includes(recall.status)) {
      throw new BadRequestException(`This recall is already ${recall.status.toLowerCase()}`);
    }

    try {
      return await this.prisma.patientRecall.update({
        where: { id },
        data: { appointmentId, status: "BOOKED" },
        include: this.include(),
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("That appointment is already linked to another recall");
      }
      throw err;
    }
  }

  /**
   * Puts a recall back on the list when the visit it was waiting for falls
   * through.
   *
   * Without this a cancelled appointment leaves the recall reading BOOKED for
   * ever: it drops off every worklist while the patient has still not been
   * seen, which is the worst of both — no chase, and no sign that anything is
   * wrong.
   */
  async releaseCancelledAppointment(appointmentId: string, organizationId: string) {
    const recall = await this.prisma.patientRecall.findFirst({
      where: { appointmentId, organizationId, status: "BOOKED" },
    });
    if (!recall) return null;

    return this.prisma.patientRecall.update({
      where: { id: recall.id },
      data: { appointmentId: null, status: "DUE" },
    });
  }

  async markAttended(id: string, organizationId: string) {
    const recall = await this.prisma.patientRecall.findFirst({
      where: { id, organizationId },
    });
    if (!recall) throw new NotFoundException("Recall not found");
    if (recall.status === "ATTENDED") return recall;

    return this.prisma.patientRecall.update({
      where: { id },
      data: { status: "ATTENDED", attendedAt: new Date(), closedAt: new Date() },
      include: this.include(),
    });
  }

  async cancel(id: string, reason: string, organizationId: string) {
    if (!reason?.trim()) {
      throw new BadRequestException("Closing a recall without calling the patient needs a reason");
    }

    const recall = await this.prisma.patientRecall.findFirst({
      where: { id, organizationId },
    });
    if (!recall) throw new NotFoundException("Recall not found");
    if (recall.status === "ATTENDED") {
      throw new BadRequestException("This recall was already attended");
    }

    return this.prisma.patientRecall.update({
      where: { id },
      data: { status: "CANCELLED", closedAt: new Date(), closeReason: reason.trim() },
      include: this.include(),
    });
  }

  /**
   * Marks unbooked recalls whose date has passed as missed.
   *
   * A grace period, because a patient who turns up a day late has not been
   * missed. Marking is deliberate rather than implicit: the count of missed
   * follow-ups is the number worth reporting, and it should come from a
   * decision the system made and recorded.
   */
  async sweepMissed(organizationId: string, graceDays = 2, now = new Date()) {
    const cutoff = new Date(startOfDay(now).getTime() - graceDays * 86_400_000);

    const { count } = await this.prisma.patientRecall.updateMany({
      where: {
        organizationId,
        status: "DUE",
        dueOn: { lt: cutoff },
      },
      data: { status: "MISSED" },
    });

    if (count) this.logger.warn(`${count} follow-up(s) passed without being booked`);
    return { marked: count };
  }

  async summary(organizationId: string) {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const [dueToday, overdue, booked, missed, attended, unreached] = await Promise.all([
      this.prisma.patientRecall.count({
        where: { organizationId, status: { notIn: CLOSED }, dueOn: { gte: today, lt: tomorrow } },
      }),
      this.prisma.patientRecall.count({
        where: { organizationId, status: "DUE", dueOn: { lt: today } },
      }),
      this.prisma.patientRecall.count({ where: { organizationId, status: "BOOKED" } }),
      this.prisma.patientRecall.count({ where: { organizationId, status: "MISSED" } }),
      this.prisma.patientRecall.count({ where: { organizationId, status: "ATTENDED" } }),
      // Chased repeatedly and still not reached — these need a different
      // approach, not another phone call.
      this.prisma.patientRecall.count({
        where: {
          organizationId,
          status: "DUE",
          attempts: { some: { outcome: { in: ["NO_ANSWER", "WRONG_NUMBER"] } } },
        },
      }),
    ]);

    const concluded = attended + missed;

    return {
      dueToday,
      overdue,
      booked,
      missed,
      attended,
      unreached,
      // Of the follow-ups that reached a conclusion, how many were attended.
      attendanceRate: concluded ? Math.round((attended / concluded) * 100) : null,
    };
  }
}
