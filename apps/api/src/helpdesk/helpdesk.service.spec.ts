import { BadRequestException } from "@nestjs/common";
import { HelpdeskService } from "./helpdesk.service";
import { slaState, slaTargets, defaultTeamFor } from "./sla";

/**
 * A helpdesk earns its keep by being honest about what is late. These cover
 * the clock: when it starts, when it stops, and the ways it could be made to
 * lie — an internal note counting as an answer, a reopened ticket carrying a
 * target that has already passed, an old ticket drifting into breach for ever.
 */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const ago = (ms: number) => new Date(Date.now() - ms);
const ahead = (ms: number) => new Date(Date.now() + ms);

function build(ticket: any = {}) {
  const base = {
    id: "tkt-1",
    ticketNumber: "TKT-000001",
    status: "OPEN",
    priority: "MEDIUM",
    requestedById: "staff-requester",
    firstRespondedAt: null,
    resolvedAt: null,
    respondBy: ahead(8 * HOUR),
    resolveBy: ahead(72 * HOUR),
    reopenCount: 0,
    ...ticket,
  };

  const writes: any[] = [];
  const prisma = {
    supportTicket: {
      findFirst: jest.fn().mockResolvedValue(base),
      findMany: jest.fn().mockResolvedValue([base]),
      create: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ id: "new", ...data });
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ ...base, ...data });
      }),
    },
    ticketComment: {
      create: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ id: "cmt-1", ...data });
      }),
    },
    staff: { findFirst: jest.fn().mockResolvedValue({ id: "staff-2" }) },
    $transaction: jest.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any;

  return { service: new HelpdeskService(prisma), prisma, writes, base };
}

const ORG = "org-1";

describe("helpdesk SLA targets", () => {
  it("gives an urgent ticket hours and a low one days", () => {
    const urgent = slaTargets("URGENT");
    const low = slaTargets("LOW");

    expect(urgent.resolveBy.getTime()).toBeLessThan(low.resolveBy.getTime());
    // Four hours for urgent: a ward without power cannot wait a working day.
    expect(Math.round((urgent.resolveBy.getTime() - Date.now()) / HOUR)).toBe(4);
    expect(Math.round((low.resolveBy.getTime() - Date.now()) / HOUR)).toBe(168);
  });

  it("routes each category to the team that handles it", () => {
    expect(defaultTeamFor("MEDICAL_EQUIPMENT")).toBe("BIOMEDICAL");
    expect(defaultTeamFor("IT_SUPPORT")).toBe("IT");
    expect(defaultTeamFor("PLUMBING")).toBe("FACILITIES");
    expect(defaultTeamFor("CLEANING")).toBe("HOUSEKEEPING");
  });
});

describe("helpdesk breach detection", () => {
  it("counts an open ticket past its target as overdue", () => {
    const state = slaState({
      status: "IN_PROGRESS",
      respondBy: ago(2 * HOUR),
      resolveBy: ago(1 * HOUR),
      firstRespondedAt: null,
      resolvedAt: null,
    });

    expect(state.responseOverdue).toBe(true);
    expect(state.resolutionOverdue).toBe(true);
    expect(state.minutesToResolve).toBeLessThan(0);
  });

  it("judges a resolved ticket on when it was resolved, not on the clock now", () => {
    // Fixed inside target, a long time ago. Judging it against "now" would
    // drag every old ticket into breach and make the overdue count useless.
    const state = slaState({
      status: "RESOLVED",
      respondBy: ago(100 * HOUR),
      resolveBy: ago(90 * HOUR),
      firstRespondedAt: ago(101 * HOUR),
      resolvedAt: ago(95 * HOUR),
    });

    expect(state.resolutionOverdue).toBe(false);
    expect(state.minutesToResolve).toBeNull();
  });

  it("still marks a ticket that was fixed late as having missed its target", () => {
    const state = slaState({
      status: "RESOLVED",
      respondBy: ago(100 * HOUR),
      resolveBy: ago(90 * HOUR),
      firstRespondedAt: ago(99 * HOUR),
      resolvedAt: ago(80 * HOUR),
    });

    expect(state.resolutionOverdue).toBe(true);
  });

  it("does not hold a cancelled ticket against the desk", () => {
    const state = slaState({
      status: "CANCELLED",
      respondBy: ago(50 * HOUR),
      resolveBy: ago(40 * HOUR),
      firstRespondedAt: null,
      resolvedAt: null,
    });

    expect(state.responseOverdue).toBe(false);
    expect(state.resolutionOverdue).toBe(false);
  });
});

describe("helpdesk first response", () => {
  it("starts the clock on the first reply the requester can see", async () => {
    const ctx = build();

    await ctx.service.comment("tkt-1", { body: "Engineer on the way" }, ORG, "staff-2");

    const stamped = ctx.writes.find((w) => w.firstRespondedAt);
    expect(stamped).toBeTruthy();
  });

  it("does not let an internal note count as answering the requester", async () => {
    const ctx = build();

    await ctx.service.comment(
      "tkt-1",
      { body: "Anyone know where the spare is?", isInternal: true },
      ORG,
      "staff-2",
    );

    // Otherwise the desk looks responsive while the person waiting has heard
    // nothing at all.
    expect(ctx.writes.find((w) => w.firstRespondedAt)).toBeUndefined();
  });

  it("does not let the requester chasing their own ticket count as a response", async () => {
    const ctx = build();

    await ctx.service.comment("tkt-1", { body: "Any update?" }, ORG, "staff-requester");

    expect(ctx.writes.find((w) => w.firstRespondedAt)).toBeUndefined();
  });

  it("does not move the clock once it has already started", async () => {
    const ctx = build({ firstRespondedAt: ago(3 * HOUR) });

    await ctx.service.comment("tkt-1", { body: "Second update" }, ORG, "staff-2");

    expect(ctx.writes.find((w) => w.firstRespondedAt)).toBeUndefined();
  });

  it("refuses an empty comment", async () => {
    const ctx = build();

    await expect(
      ctx.service.comment("tkt-1", { body: "   " }, ORG, "staff-2"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("helpdesk status changes", () => {
  it("refuses to resolve a ticket without saying what was done", async () => {
    const ctx = build();

    await expect(
      ctx.service.updateStatus("tkt-1", { status: "RESOLVED" }, ORG),
    ).rejects.toThrow(/what was done/i);
  });

  it("refuses to cancel a ticket without a reason", async () => {
    const ctx = build();

    await expect(
      ctx.service.updateStatus("tkt-1", { status: "CANCELLED" }, ORG),
    ).rejects.toThrow(/reason/i);
  });

  it("records the resolution time when a ticket is resolved", async () => {
    const ctx = build();

    await ctx.service.updateStatus(
      "tkt-1",
      { status: "RESOLVED", resolutionNotes: "Replaced the fuse" },
      ORG,
    );

    const write = ctx.writes.at(-1);
    expect(write.resolvedAt).toBeInstanceOf(Date);
    expect(write.resolutionNotes).toBe("Replaced the fuse");
  });

  it("refuses to assign a ticket that is already closed", async () => {
    const ctx = build({ status: "CLOSED" });

    await expect(ctx.service.assign("tkt-1", "staff-2", ORG)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("helpdesk reopening", () => {
  it("restarts the resolution target rather than keeping one that has passed", async () => {
    const ctx = build({ status: "RESOLVED", resolveBy: ago(40 * HOUR), resolvedAt: ago(20 * HOUR) });

    await ctx.service.reopen("tkt-1", "Fault came back overnight", ORG, "staff-2");

    const write = ctx.writes.find((w) => w.reopenCount);
    // Keeping the old target would mark it overdue the instant it reopened,
    // which tells nobody anything about how the desk is doing now.
    expect(write.resolveBy.getTime()).toBeGreaterThan(Date.now());
    expect(write.resolvedAt).toBeNull();
    expect(write.reopenCount).toEqual({ increment: 1 });
  });

  it("leaves a note on the ticket saying why it came back", async () => {
    const ctx = build({ status: "RESOLVED" });

    await ctx.service.reopen("tkt-1", "Still leaking", ORG, "staff-2");

    const comment = ctx.writes.find((w) => typeof w.body === "string");
    expect(comment.body).toMatch(/Still leaking/);
    expect(comment.isInternal).toBe(false);
  });

  it("refuses to reopen a ticket that was never resolved", async () => {
    const ctx = build({ status: "IN_PROGRESS" });

    await expect(ctx.service.reopen("tkt-1", "why", ORG)).rejects.toThrow(/resolved or closed/i);
  });

  it("refuses to reopen without a reason", async () => {
    const ctx = build({ status: "RESOLVED" });

    await expect(ctx.service.reopen("tkt-1", "  ", ORG)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("helpdesk creation", () => {
  it("sets targets from the priority and routes by category", async () => {
    const ctx = build();

    await ctx.service.create(
      {
        title: "Ventilator alarming",
        description: "Bed 4 ventilator alarms continuously",
        category: "MEDICAL_EQUIPMENT",
        location: "ICU",
        priority: "URGENT",
      },
      ORG,
      "staff-requester",
    );

    const created = ctx.writes[0];
    expect(created.team).toBe("BIOMEDICAL");
    expect(Math.round((created.resolveBy.getTime() - Date.now()) / HOUR)).toBe(4);
    expect(created.status).toBe("OPEN");
  });

  it("marks a ticket assigned at creation when someone is named", async () => {
    const ctx = build();

    await ctx.service.create(
      {
        title: "Blocked drain",
        description: "Sluice room drain blocked",
        category: "PLUMBING",
        location: "Ward B",
        assignedToId: "staff-2",
      },
      ORG,
      "staff-requester",
    );

    expect(ctx.writes[0].status).toBe("ASSIGNED");
  });
});
