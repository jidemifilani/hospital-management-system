import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
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

    // SUPER_ADMIN and HOSPITAL_ADMIN bypass permission checks
    if (["SUPER_ADMIN", "HOSPITAL_ADMIN"].includes(user.role)) return true;

    const hasAll = required.every((p) => user.permissions.includes(p));
    if (!hasAll) throw new ForbiddenException("Insufficient permissions");
    return true;
  }
}
