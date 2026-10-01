import Redis from "ioredis";
import { RedisThrottlerStorage } from "./redis-throttler.storage";

/**
 * The login limit is what stands between an attacker and an unlimited number
 * of password guesses, so what matters here is that it keeps counting: across
 * instances, across restarts, and — when Redis itself is gone — at least
 * within one process rather than not at all.
 */

type Lua = [number, number, number, number];

/** A stand-in for the Lua script, counting in a Map the way Redis would. */
function fakeRedis(behaviour?: { throws?: Error }) {
  const hits = new Map<string, number>();
  const calls: string[][] = [];

  const client = {
    on: jest.fn(),
    defineCommand: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue("OK"),
    disconnect: jest.fn(),
    throttleIncrement: jest.fn(
      async (hitsKey: string, blockKey: string, ttl: string, limit: string, block: string) => {
        if (behaviour?.throws) throw behaviour.throws;
        calls.push([hitsKey, blockKey, ttl, limit, block]);

        const count = (hits.get(hitsKey) ?? 0) + 1;
        hits.set(hitsKey, count);
        const blocked = count > Number(limit);
        return [count, Number(ttl), blocked ? 1 : 0, blocked ? Number(block) : 0] as Lua;
      },
    ),
  };

  return { client: client as unknown as Redis, hits, calls, raw: client };
}

/**
 * Every storage built here is shut down afterwards.
 *
 * The in-memory fallback schedules a timer per hit to decay the count, so a
 * test that exercises it leaves timers behind and Jest will not exit — which
 * reads as a hung CI job rather than as leftover test state.
 */
const built: RedisThrottlerStorage[] = [];

afterEach(async () => {
  while (built.length) await built.pop()!.onApplicationShutdown();
});

const build = (b?: { throws?: Error }) => {
  const fake = fakeRedis(b);
  const storage = new RedisThrottlerStorage("redis://unused", fake.client);
  built.push(storage);
  return { ...fake, storage };
};

describe("counting in Redis", () => {
  it("returns the running total, so two instances share one count", async () => {
    const ctx = build();

    const first = await ctx.storage.increment("user-1", 60_000, 10, 30_000, "default");
    const second = await ctx.storage.increment("user-1", 60_000, 10, 30_000, "default");

    // The same key counted twice is the whole point: in memory each process
    // started again from one.
    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
  });

  it("keeps separate counts per throttler and per key", async () => {
    const ctx = build();

    await ctx.storage.increment("user-1", 60_000, 10, 0, "default");
    await ctx.storage.increment("user-1", 60_000, 10, 0, "login");
    const other = await ctx.storage.increment("user-2", 60_000, 10, 0, "default");

    expect(other.totalHits).toBe(1);
    expect(new Set(ctx.calls.map((c) => c[0])).size).toBe(3);
  });

  it("namespaces its keys so it cannot collide with the job queues", async () => {
    const ctx = build();
    await ctx.storage.increment("user-1", 60_000, 10, 0, "default");

    // Redis here is shared with BullMQ.
    expect(ctx.calls[0]![0]).toBe("throttle:default:user-1");
    expect(ctx.calls[0]![1]).toBe("throttle:block:default:user-1");
  });

  it("reports times in seconds, rounding a part-second up", async () => {
    const ctx = build();
    const record = await ctx.storage.increment("user-1", 1_500, 10, 0, "default");

    // Rounding down would report 1 second of a 1.5 second window, and zero
    // would read as "no time left" — the opposite of the truth.
    expect(record.timeToExpire).toBe(2);
  });

  it("blocks once the limit is passed, and says for how long", async () => {
    const ctx = build();
    for (let i = 0; i < 3; i++) await ctx.storage.increment("user-1", 60_000, 3, 30_000, "default");

    const over = await ctx.storage.increment("user-1", 60_000, 3, 30_000, "default");

    expect(over.isBlocked).toBe(true);
    expect(over.timeToBlockExpire).toBe(30);
  });

  it("is not blocked while still within the limit", async () => {
    const ctx = build();
    const record = await ctx.storage.increment("user-1", 60_000, 10, 30_000, "default");

    expect(record.isBlocked).toBe(false);
    expect(record.timeToBlockExpire).toBe(0);
  });
});

describe("when Redis cannot be reached", () => {
  it("still counts, rather than letting every request through", async () => {
    const ctx = build({ throws: new Error("ECONNREFUSED") });

    const first = await ctx.storage.increment("user-1", 60_000, 10, 30_000, "default");
    const second = await ctx.storage.increment("user-1", 60_000, 10, 30_000, "default");

    // Failing open would quietly remove the login limit for the whole outage.
    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
  });

  it("still blocks past the limit", async () => {
    const ctx = build({ throws: new Error("ECONNREFUSED") });
    for (let i = 0; i < 3; i++) await ctx.storage.increment("u", 60_000, 3, 30_000, "default");

    expect((await ctx.storage.increment("u", 60_000, 3, 30_000, "default")).isBlocked).toBe(true);
  });

  it("does not throw, because this guard runs in front of every request", async () => {
    const ctx = build({ throws: new Error("ECONNREFUSED") });

    // Throwing here would turn a Redis outage into a dead hospital API.
    await expect(
      ctx.storage.increment("user-1", 60_000, 10, 30_000, "default"),
    ).resolves.toBeDefined();
  });

  it("never reports a negative time until the block expires", async () => {
    const ctx = build({ throws: new Error("ECONNREFUSED") });

    // The in-memory implementation returns a large negative figure when
    // nothing has been blocked, and the guard turns that into a Retry-After.
    const record = await ctx.storage.increment("u", 60_000, 10, 30_000, "default");

    expect(record.timeToBlockExpire).toBeGreaterThanOrEqual(0);
  });

  it("names the cause even when the error carries no message", async () => {
    const bare = Object.assign(new Error(""), { code: "ECONNREFUSED" });
    const ctx = build({ throws: bare });
    const errors = jest.spyOn((ctx.storage as any).logger, "error").mockImplementation(() => {});

    await ctx.storage.increment("u", 60_000, 10, 0, "default");

    // ioredis raises some connection errors with an empty message, which left
    // the warning reading "cannot reach Redis ()".
    expect(errors.mock.calls[0]![0]).toContain("ECONNREFUSED");
    errors.mockRestore();
  });

  it("complains once rather than on every request", async () => {
    const ctx = build({ throws: new Error("ECONNREFUSED") });
    const errors = jest.spyOn((ctx.storage as any).logger, "error").mockImplementation(() => {});

    for (let i = 0; i < 25; i++) await ctx.storage.increment("u", 60_000, 10, 0, "default");

    // A limiter in front of every request would bury the warning it is trying
    // to raise.
    expect(errors).toHaveBeenCalledTimes(1);
    errors.mockRestore();
  });
});

describe("shutdown", () => {
  it("closes the connection with quit, so an in-flight count is not dropped", async () => {
    const ctx = build();
    await ctx.storage.onApplicationShutdown();

    expect(ctx.raw.quit).toHaveBeenCalled();
    expect(ctx.raw.disconnect).not.toHaveBeenCalled();
  });

  it("falls back to disconnect if quit fails", async () => {
    const ctx = build();
    ctx.raw.quit.mockRejectedValue(new Error("already gone"));

    await ctx.storage.onApplicationShutdown();

    expect(ctx.raw.disconnect).toHaveBeenCalled();
  });
});
