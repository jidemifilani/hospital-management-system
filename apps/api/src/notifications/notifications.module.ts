import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { ReminderScheduler } from "./reminder.scheduler";
import { OperationsScheduler } from "./operations.scheduler";
import { OperationsController } from "./operations.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [OperationsController],
  providers: [NotificationsService, ReminderScheduler, OperationsScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
