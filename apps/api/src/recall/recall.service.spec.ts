import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RecallService } from "./recall.service";

/**
 * A recall exists so that a patient who was told to come back actually does.
 * These cover the ways that could quietly fail: the same follow-up raised
 * twice, a booked visit that falls through and leaves nobody chasing, and a
 * date passing without anyone noticing.
 */

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY);

function build(opts: { recall?: any; appointment?: any; patient?: any } = {}) {
  const writes: any[] = [];
  let updateMany: any = null;

  const recall = {
    id: "rec-1",
    recallNumber: "REC-000001",
    patientId: "pat-1",
    status: "DUE",
    dueOn: daysAhead(3),
    appointmentId: null,
    ...opts.recall,
  };

  const prisma = {
    patient: {
      findFirst: jest.fn().mockResolvedValue(opts.patient === null ? null : { id: "pat-1" }),
    },
    appointment: {
      findFirst: jest.fn().mockResolvedValue(
        opts.appointment === null ? null : { id: "apt-1", patientId: "pat-1", ...opts.appointment },
      ),
    },
    patientRecall: {
      findFirst: jest.fn().mockResolvedValue(recall),
      findMany: jest.fn().mockResolvedValue([recall]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ id: "new", ...data });
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ ...recall, ...data });
      }),
      updateMany: jest.fn().mockImplementation((args) => {
        updateMany = args;
        return Promise.resolve({ count: 2 });
      }),
    },
    outreachAttempt: {
      create: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ id: "att-1", ...data });
      }),
    },
  } as any;

  return {
    service: new RecallService(prisma),
    prisma,
    writes,
    recall,
    get updateManyArgs() { return updateMany; },
  };
}

const ORG = "org-1";

describe("raising a recall", () => {
  it("records what the patient is being called about", async () => {
    const ctx = build();

    await ctx.service.raise(
      { patientId: "pat-1", reason: "Wound review", dueOn: daysAhead(7), source: "DISCHARGE", sourceRef: "dis-1" },
      ORG,
    );

    expect(ctx.writes[0].reason).toBe("Wound review");
    expect(ctx.writes[0].source).toBe("DISCHARGE");
    expect(ctx.writes[0].status).toBeUndefined(); // defaults to DUE in the schema
  });

  it("refuses a recall with no reason", async () => {
    const ctx = build();

    await expect(
      ctx.service.raise({ patientId: "pat-1", reason: "  ", dueOn: daysAhead(1) }, ORG),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses a recall for a patient who does not exist", async () => {
    const ctx = build({ patient: null });

    await expect(
      ctx.service.raise({ patientId: "nope", reason: "Review", dueOn: daysAhead(1) }, ORG),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns the existing recall rather than listing a patient twice", async () => {
    const ctx = build();
    const clash: any = new Error("unique");
    clash.code = "P2002";
    Object.setPrototypeOf(clash, Prisma.PrismaClientKnownRequestError.prototype);
    ctx.prisma.patientRecall.create.mockRejectedValue(clash);

    // Editing a discharge summary twice must not put the same follow-up on
    // the worklist twice.
    const result = await ctx.service.raise(
      { patientId: "pat-1", reason: "Follow-up", dueOn: daysAhead(5), source: "DISCHARGE", sourceRef: "dis-1" },
      ORG,
    );

    expect(result.id).toBe("rec-1");
  });

  it("never lets a failed recall break the discharge it came from", async () => {
    const ctx = build();
    ctx.prisma.patient.findFirst.mockRejectedValue(new Error("database gone"));

    // A discharge must still complete even if the worklist write fails.
    await expect(
      ctx.service.raiseQuietly({ patientId: "pat-1", reason: "x", dueOn: daysAhead(1) }, ORG),
    ).resolves.toBeNull();
  });
});

describe("booking a recall", () => {
  it("links the appointment and marks it booked", async () => {
    const ctx = build();

    await ctx.service.book("rec-1", "apt-1", ORG);

    expect(ctx.writes[0]).toEqual({ appointmentId: "apt-1", status: "BOOKED" });
  });

  it("refuses an appointment belonging to a different patient", async () => {
    const ctx = build({ appointment: { patientId: "someone-else" } });

    await expect(ctx.service.book("rec-1", "apt-1", ORG)).rejects.toThrow(/different patient/i);
  });

  it("refuses to book a recall that was already cancelled", async () => {
    const ctx = build({ recall: { status: "CANCELLED" } });

    await expect(ctx.service.book("rec-1", "apt-1", ORG)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("puts the recall back on the list when the appointment is cancelled", async () => {
    const ctx = build({ recall: { status: "BOOKED", appointmentId: "apt-1" } });

    await ctx.service.releaseCancelledAppointment("apt-1", ORG);

    // Left as BOOKED it would drop off every worklist while the patient still
    // had not been seen — no chase, and no sign anything was wrong.
    expect(ctx.writes[0]).toEqual({ appointmentId: null, status: "DUE" });
  });

  it("does nothing when a cancelled appointment was never linked to a recall", async () => {
    const ctx = build();
    ctx.prisma.patientRecall.findFirst.mockResolvedValue(null);

    await expect(ctx.service.releaseCancelledAppointment("apt-9", ORG)).resolves.toBeNull();
  });
});

describe("outreach attempts", () => {
  it("records the channel and what came of it", async () => {
    const ctx = build();

    await ctx.service.logAttempt(
      "rec-1",
      { channel: "PHONE", outcome: "NO_ANSWER", note: "Rang twice" },
      ORG,
      "staff-1",
    );

    expect(ctx.writes[0]).toMatchObject({
      channel: "PHONE",
      outcome: "NO_ANSWER",
      contactedById: "staff-1",
    });
  });

  it("refuses to log an attempt against a recall already attended", async () => {
    const ctx = build({ recall: { status: "ATTENDED" } });

    await expect(
      ctx.service.logAttempt("rec-1", { channel: "PHONE", outcome: "REACHED" }, ORG),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("closing a recall", () => {
  it("refuses to close one without a reason", async () => {
    const ctx = build();

    await expect(ctx.service.cancel("rec-1", "   ", ORG)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("refuses to cancel one the patient already attended", async () => {
    const ctx = build({ recall: { status: "ATTENDED" } });

    await expect(ctx.service.cancel("rec-1", "no longer needed", ORG)).rejects.toThrow(
      /already attended/i,
    );
  });

  it("records attendance", async () => {
    const ctx = build();

    await ctx.service.markAttended("rec-1", ORG);

    expect(ctx.writes[0].status).toBe("ATTENDED");
    expect(ctx.writes[0].attendedAt).toBeInstanceOf(Date);
  });
});

describe("sweeping missed follow-ups", () => {
  it("only marks recalls that are still unbooked and past the grace period", async () => {
    const ctx = build();

    await ctx.service.sweepMissed(ORG, 2, new Date());

    const where = ctx.updateManyArgs.where;
    expect(where.status).toBe("DUE");
    // A patient who turns up a day late has not been missed.
    expect(where.dueOn.lt.getTime()).toBeLessThan(daysAgo(1).getTime());
    expect(ctx.updateManyArgs.data).toEqual({ status: "MISSED" });
  });

  it("leaves booked follow-ups alone however old they are", async () => {
    const ctx = build();

    await ctx.service.sweepMissed(ORG, 2);

    // Only DUE is swept; a booked visit is somebody else's problem to close.
    expect(ctx.updateManyArgs.where.status).toBe("DUE");
  });
});
