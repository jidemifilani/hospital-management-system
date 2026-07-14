import { Module } from "@nestjs/common";
import { OpdQueueController } from "./opd-queue.controller";
import { OpdQueueService } from "./opd-queue.service";

@Module({
  controllers: [OpdQueueController],
  providers: [OpdQueueService],
})
export class OpdQueueModule {}
