import { Module } from "@nestjs/common";
import { EncountersController } from "./encounters.controller";
import { EncountersService } from "./encounters.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ChargesModule } from "../charges/charges.module";

@Module({
  imports: [PrismaModule, ChargesModule],
  controllers: [EncountersController],
  providers: [EncountersService],
  exports: [EncountersService],
})
export class EncountersModule {}
