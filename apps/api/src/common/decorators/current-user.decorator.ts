import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "@hms/types";

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtPayload;
  },
);
