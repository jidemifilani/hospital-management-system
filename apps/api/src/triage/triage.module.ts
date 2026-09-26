import { Module } from "@nestjs/common";
import { TriageController } from "./triage.controller";
import { TriageService } from "./triage.service";
import { EncountersModule } from "../encounters/encounters.module";

@Module({
  imports: [EncountersModule],
  controllers: [TriageController],
  providers: [TriageService],
})
export class TriageModule {}
