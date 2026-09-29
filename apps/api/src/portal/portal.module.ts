import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";
import { PrismaModule } from "../prisma/prisma.module";
import { PatientJwtStrategy } from "./strategies/patient-jwt.strategy";

@Module({
  imports: [PrismaModule, PassportModule, JwtModule.register({})],
  controllers: [PortalController],
  providers: [PortalService, PatientJwtStrategy],
})
export class PortalModule {}
