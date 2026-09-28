import { Module } from "@nestjs/common";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";
import { EncountersModule } from "../encounters/encounters.module";
import { RecallModule } from "../recall/recall.module";

@Module({
  imports: [EncountersModule, RecallModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
