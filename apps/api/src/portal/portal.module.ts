import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
