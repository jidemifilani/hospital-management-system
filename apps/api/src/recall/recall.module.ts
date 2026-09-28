import { Module } from "@nestjs/common";
import { RecallController } from "./recall.controller";
import { RecallService } from "./recall.service";
import { RecallScheduler } from "./recall.scheduler";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [RecallController],
  providers: [RecallService, RecallScheduler],
  exports: [RecallService],
})
export class RecallModule {}
