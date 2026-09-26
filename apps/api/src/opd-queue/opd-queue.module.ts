import { Module } from "@nestjs/common";
import { OpdQueueController } from "./opd-queue.controller";
import { OpdQueueService } from "./opd-queue.service";
import { EncountersModule } from "../encounters/encounters.module";

@Module({
  imports: [EncountersModule],
  controllers: [OpdQueueController],
  providers: [OpdQueueService],
})
export class OpdQueueModule {}
