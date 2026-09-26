import { Module } from "@nestjs/common";
import { RadiologyService } from "./radiology.service";
import { RadiologyController } from "./radiology.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { EncountersModule } from "../encounters/encounters.module";

@Module({
  imports: [PrismaModule, EncountersModule],
  controllers: [RadiologyController],
  providers: [RadiologyService],
  exports: [RadiologyService],
})
export class RadiologyModule {}
