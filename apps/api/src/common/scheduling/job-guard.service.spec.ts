import { Prisma } from "@prisma/client";
import {
  dailyKey,
  hourlyKey,
  JobGuardService,
  monthlyKey,
  weeklyKey,
} from "./job-guard.service";

function duplicateError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.22.0",
  });
}

function guard(overrides: Record<string, jest.Mock> = {}) {
  const scheduledJobRun = {
    create: overrides.create ?? jest.fn().mockResolvedValue({ id: "claim-1" }),
    update: overrides.update ?? jest.fn().mockResolvedValue({}),
    delete: overrides.delete ?? jest.fn().mockResolvedValue({}),
  };
  const prisma = { scheduledJobRun } as never;
  return { service: new JobGuardService(prisma), scheduledJobRun };
}

describe("running a scheduled job once", () => {
  it("claims the period and runs the work", async () => {
    const { service, scheduledJobRun } = guard();
    const work = jest.fn().mockResolvedValue(undefined);

    const outcome = await service.runOnce("nightly-bed-charges", "2026-11-27", work);

    expect(outcome).toBe("ran");
    expect(work).toHaveBeenCalledTimes(1);
    expect(scheduledJobRun.create).toHaveBeenCalledWith({
      data: { jobName: "nightly-bed-charges", periodKey: "2026-11-27" },
      select: { id: true },
    });
  });

  it("marks the claim finished only after the work succeeds", async () => {
    const order: string[] = [];
    const { service, scheduledJobRun } = guard({
      update: jest.fn().mockImplementation(async () => {
        order.push("finished");
        return {};
      }),
    });

    await service.runOnce("x", "2026-11-27", async () => {
      order.push("work");
    });

    expect(order).toEqual(["work", "finished"]);
    expect(scheduledJobRun.update).toHaveBeenCalledWith({
      where: { id: "claim-1" },
      data: { finishedAt: expect.any(Date) },
    });
  });

  it("skips without running when another instance already claimed the period", async () => {
    // This is the deploy-overlap case: two copies of the API, both firing the
    // same cron. The second one's insert loses to the unique constraint.
    const { service } = guard({ create: jest.fn().mockRejectedValue(duplicateError()) });
    const work = jest.fn();

    const outcome = await service.runOnce("daily-digest", "2026-11-27", work);

    expect(outcome).toBe("skipped");
    expect(work).not.toHaveBeenCalled();
  });

  it("releases the claim when the work throws, so the next tick retries", async () => {
    // A failed run recorded as done is a nightly billing run that never
    // happens again.
    const { service, scheduledJobRun } = guard();

    const outcome = await service.runOnce("x", "2026-11-27", async () => {
      throw new Error("mail server refused");
    });

    expect(outcome).toBe("failed");
    expect(scheduledJobRun.delete).toHaveBeenCalledWith({ where: { id: "claim-1" } });
    expect(scheduledJobRun.update).not.toHaveBeenCalled();
  });

  it("survives the release itself failing", async () => {
    const { service } = guard({ delete: jest.fn().mockRejectedValue(new Error("gone")) });

    await expect(
      service.runOnce("x", "2026-11-27", async () => {
        throw new Error("boom");
      }),
    ).resolves.toBe("failed");
  });

  it("does not swallow a real database failure as a skip", async () => {
    // Only P2002 means "someone else has it". Anything else is broken, and
    // treating it as a skip would stop every scheduled job silently.
    const { service } = guard({
      create: jest.fn().mockRejectedValue(new Error("connection refused")),
    });

    await expect(service.runOnce("x", "2026-11-27", jest.fn())).rejects.toThrow(
      "connection refused",
    );
  });
});

describe("period keys", () => {
  it("name the day, hour, month and ISO week", () => {
    const at = new Date(2026, 10, 27, 14, 5); // 27 Nov 2026, 14:05 local

    expect(dailyKey(at)).toBe("2026-11-27");
    expect(hourlyKey(at)).toBe("2026-11-27T14");
    expect(monthlyKey(at)).toBe("2026-11");
    expect(weeklyKey(at)).toBe("2026-W48");
  });

  it("give two runs in the same hour the same key, and the next hour a new one", () => {
    expect(hourlyKey(new Date(2026, 10, 27, 14, 1))).toBe(
      hourlyKey(new Date(2026, 10, 27, 14, 59)),
    );
    expect(hourlyKey(new Date(2026, 10, 27, 15, 0))).not.toBe(
      hourlyKey(new Date(2026, 10, 27, 14, 0)),
    );
  });

  it("keep the week key stable across a year boundary", () => {
    // 1 January 2027 is a Friday, which ISO 8601 places in the last week of
    // 2026. A key built from the calendar year would change identity midweek
    // and let a Monday job run a second time.
    expect(weeklyKey(new Date(2026, 11, 28))).toBe("2026-W53");
    expect(weeklyKey(new Date(2027, 0, 1))).toBe("2026-W53");
  });
});
