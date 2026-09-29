import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

export interface PatientJwtPayload {
  sub: string;
  role: string;
  organizationId: string;
}

/**
 * Authenticates a patient on the portal.
 *
 * The portal signs a token whose `sub` is a Patient id, but every portal route
 * was guarded by the staff strategy, which looks that id up in the users
 * table. A patient is not a user, so the lookup found nothing and the portal
 * answered 401 to the very token it had just issued — the whole patient-facing
 * side was unreachable.
 *
 * Kept separate from the staff strategy on purpose. Teaching that one to
 * accept patients would let a patient's token satisfy JwtAuthGuard on staff
 * endpoints, and the few that carry no permissions check would have let them
 * straight through.
 */
@Injectable()
export class PatientJwtStrategy extends PassportStrategy(Strategy, "patient-jwt") {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: PatientJwtPayload): Promise<PatientJwtPayload> {
    // A staff token is signed with the same secret, so the role is what keeps
    // the two apart rather than the signature.
    if (payload.role !== "PATIENT") throw new UnauthorizedException();

    const patient = await this.prisma.patient.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true },
    });
    if (!patient) throw new UnauthorizedException();

    return payload;
  }
}
