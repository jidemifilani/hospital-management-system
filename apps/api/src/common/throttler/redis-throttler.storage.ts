import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { ThrottlerStorage, ThrottlerStorageService } from "@nestjs/throttler";
import Redis from "ioredis";

/**
 * The record `increment` must return.
 *
 * Derived from the interface rather than imported: the package does not
 * re-export the type from its entry point, and reaching into its dist path
 * would break on an upgrade that moved the file.
 */
type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage["increment"]>>;

/**
 * Rate-limit counters in Redis rather than in each process's memory.
 *
 * The counters used to live in a Map, which made the login limit considerably
 * weaker than it looked. Ten attempts per account per quarter hour was the
 * stated rule, but the count reset on every restart — so every deploy, and
 * `nest --watch` picking up a saved file, handed an attacker a fresh ten — and
 * it was per process, so running the API behind two instances made the real
 * limit twenty, three made it thirty. Neither is visible from the
 * configuration; both make guessing a password that much cheaper.
 *
 * Redis is already running here for the job queues, so the counters simply move
 * into it and become one shared count that survives a restart.
 *
 * This is a fixed window — INCR with an expiry — rather than the sliding decay
 * the in-memory implementation does. A caller can therefore use its full
 * allowance at the end of one window and again at the start of the next, so the
 * worst case across a boundary is twice the limit in quick succession. That is
 * the normal trade for a shared counter and is what rate limiters generally do;
 * for ten logins per fifteen minutes it is not a weakness worth more machinery.
 */

const PREFIX = "throttle";

/** How often to repeat the complaint when Redis is unreachable. */
const COMPLAIN_EVERY_MS = 30_000;

/**
 * Counts a hit, decides whether the caller is blocked, and returns both, in a
 * single atomic step.
 *
 * It has to be one step. Read-then-write from several instances at once lets
 * each of them see the same count and and allow the same request, which is
 * exactly the hole a shared counter is meant to close.
 */
const INCREMENT = `
local hitsKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockTtl = redis.call('PTTL', blockKey)
if blockTtl > 0 then
  -- Already blocked. Deliberately does not count the hit, so hammering the
  -- endpoint cannot keep extending the block beyond what was configured.
  local hits = tonumber(redis.call('GET', hitsKey) or '0')
  local hitsTtl = redis.call('PTTL', hitsKey)
  return { hits, hitsTtl, 1, blockTtl }
end

local hits = redis.call('INCR', hitsKey)
if hits == 1 then
  redis.call('PEXPIRE', hitsKey, ttl)
end
local hitsTtl = redis.call('PTTL', hitsKey)

if hits > limit then
  redis.call('SET', blockKey, '1', 'PX', blockDuration)
  return { hits, hitsTtl, 1, blockDuration }
end

return { hits, hitsTtl, 0, 0 }
`;

type LuaResult = [number, number, number, number];

/**
 * A usable description of a connection failure.
 *
 * ioredis raises some connection errors with an empty message, which turned
 * the warning into "cannot reach Redis ()" — true, but no help in working out
 * why.
 */
function describe(err: unknown): string {
  if (!(err instanceof Error)) return String(err) || "unknown error";
  const code = (err as { code?: string }).code;
  return err.message || code || err.name || "unknown error";
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly redis: Redis;

  /**
   * Used only while Redis is unreachable.
   *
   * Failing open would silently remove the login limit for the duration of a
   * Redis outage, and failing closed would refuse every request in a hospital
   * because a cache is down. Falling back to an in-process count keeps the
   * limit working, just per instance — the weaker behaviour this change exists
   * to replace, which is the right thing to degrade to and the wrong thing to
   * rely on.
   */
  private readonly fallback = new ThrottlerStorageService();

  private lastComplaintAt = 0;
  private degraded = false;

  /**
   * `client` exists so tests can supply one that answers, or one that throws,
   * without a Redis to talk to. Production passes a URL and gets the real
   * thing.
   */
  constructor(redisUrl: string, client?: Redis) {
    if (client) {
      this.redis = client;
      return;
    }

    this.redis = new Redis(redisUrl, {
      // The offline queue is left on, and that detail matters more than it
      // looks. With it off, any command issued before the connection finished
      // establishing failed outright — so after every restart the first
      // requests fell back to counting in memory, silently, which is exactly
      // the weakness this class exists to remove and exactly the moment an
      // attacker retrying a password would benefit from it. Queued commands
      // are sent once the connection is up.
      //
      // The queue cannot grow without bound either: maxRetriesPerRequest means
      // a genuinely unreachable Redis fails its commands rather than holding
      // them, so an outage still reaches the fallback below instead of hanging
      // every request in front of it.
      enableOfflineQueue: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 2_000,
    });

    // ioredis emits errors on an unused connection too; without a listener
    // those become unhandled and take the process down.
    this.redis.on("error", (err) => this.complain(describe(err)));

    this.redis.defineCommand("throttleIncrement", { numberOfKeys: 2, lua: INCREMENT });
    // No explicit connect(): without lazyConnect the client is already
    // connecting, and calling it again throws "Redis is already connecting".
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `${PREFIX}:${throttlerName}:${key}`;
    const blockKey = `${PREFIX}:block:${throttlerName}:${key}`;

    try {
      const [totalHits, hitsTtlMs, blocked, blockTtlMs] = (await (
        this.redis as unknown as {
          throttleIncrement(
            hitsKey: string,
            blockKey: string,
            ttl: string,
            limit: string,
            blockDuration: string,
          ): Promise<LuaResult>;
        }
      ).throttleIncrement(
        hitsKey,
        blockKey,
        String(ttl),
        String(limit),
        String(blockDuration),
      )) as LuaResult;

      if (this.degraded) {
        this.degraded = false;
        this.logger.log("Redis is answering again; rate limits are shared once more");
      }

      return {
        totalHits,
        // The interface is in seconds, and a sub-second remainder still counts
        // as time left, so round up rather than down to zero.
        timeToExpire: Math.ceil(Math.max(hitsTtlMs, 0) / 1000),
        isBlocked: blocked === 1,
        timeToBlockExpire: Math.ceil(Math.max(blockTtlMs, 0) / 1000),
      };
    } catch (err) {
      this.complain(describe(err));
      const record = await this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);

      // The in-memory implementation reports a large negative block expiry
      // when nothing has ever been blocked, because it subtracts now from a
      // zero. The guard turns that figure into a Retry-After header, so it is
      // clamped here rather than left to appear as a nonsense value only on
      // the degraded path.
      return { ...record, timeToBlockExpire: Math.max(record.timeToBlockExpire, 0) };
    }
  }

  /**
   * Says so when the limits stop being shared, and keeps saying so, without
   * writing a line per request — a limiter in front of every request would
   * otherwise bury the log it is trying to warn through.
   */
  private complain(reason: string) {
    this.degraded = true;
    const now = Date.now();
    if (now - this.lastComplaintAt < COMPLAIN_EVERY_MS) return;
    this.lastComplaintAt = now;

    this.logger.error(
      `Rate limiting cannot reach Redis (${reason}). Counting per instance in memory ` +
        `until it returns: limits are no longer shared between instances and will reset ` +
        `on restart.`,
    );
  }

  async onApplicationShutdown() {
    this.fallback.onApplicationShutdown();
    // quit() rather than disconnect() so an in-flight command is allowed to
    // finish; a dropped increment is a request wrongly allowed or refused.
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
