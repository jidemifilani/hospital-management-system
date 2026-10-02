import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { hasPermission } from "@hms/config";
import type { JwtPayload } from "@hms/types";
import type { Permission } from "@hms/config";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user: JwtPayload = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException("Not authenticated");

    // hasPermission is shared with the web app's navigation, which decides
    // whether to offer a link at all. Two copies of this rule drift, and the
    // quiet half of that is a feature somebody is entitled to use that nothing
    // ever shows them. It derives from the role rather than reading a list off
    // the token, which is what keeps the token small.
    const hasAll = required.every((p) => hasPermission(user.role, p));
    if (!hasAll) throw new ForbiddenException("Insufficient permissions");
    return true;
  }
}
