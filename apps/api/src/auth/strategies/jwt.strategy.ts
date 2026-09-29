import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import type { JwtPayload } from "@hms/types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Patient portal tokens are signed with the same secret, so the role is
    // what separates them. Refused explicitly rather than relying on the
    // lookup below failing to find a patient id in the users table.
    // Compared as a string: the payload type says staff roles only, but what
    // actually arrives is whatever was signed.
    if (String(payload.role) === "PATIENT") throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE") throw new UnauthorizedException();
    return payload;
  }
}
