import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Rate-limits sign-in attempts per account rather than per IP address.
 *
 * Every staff login reaches the API from the web server's single address, so a
 * per-IP limit would either be too loose to stop a brute-force attempt or
 * tight enough that one busy morning locks out the whole hospital. Tracking
 * the submitted email confines the limit to the account actually under attack.
 *
 * The address is still part of the key, so the same attacker cannot spray one
 * password across many accounts without also filling their own bucket.
 *
 * Two limitations worth knowing:
 *  - Counts are held in memory, so they reset when the API restarts and are
 *    not shared between instances. A multi-instance deployment should move
 *    ThrottlerModule onto the Redis storage this project already runs.
 *  - Successful sign-ins consume the budget too, because the throttler counts
 *    requests rather than outcomes. Ten per quarter hour is far above what a
 *    person does and far below what guessing a password needs.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "unknown";
    const ip = (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip;
    return `login:${email}:${ip}`;
  }

  protected override async getErrorMessage(): Promise<string> {
    return "Too many sign-in attempts. Please wait a few minutes and try again.";
  }
}
