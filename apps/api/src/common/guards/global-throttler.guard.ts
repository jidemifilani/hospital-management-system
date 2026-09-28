import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/** Routes that own their own throttling and must not also be limited by IP. */
const SELF_THROTTLED = [/\/auth\/login$/];

/**
 * The application-wide limit, tracked by address.
 *
 * It deliberately steps aside on sign-in. Both this guard and the route's own
 * LoginThrottlerGuard read the same @Throttle metadata, so without this the
 * strict per-account login limit was *also* applied per IP — and because every
 * staff login arrives from the web server's single address, ten bad attempts
 * against one account locked out everybody.
 */
@Injectable()
export class GlobalThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (await super.shouldSkip(context)) return true;

    const { req } = this.getRequestResponse(context);
    const path: string = req.route?.path ?? req.url ?? "";
    return SELF_THROTTLED.some((rule) => rule.test(path.split("?")[0] ?? ""));
  }
}
