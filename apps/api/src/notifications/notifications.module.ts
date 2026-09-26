import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { ReminderScheduler } from "./reminder.scheduler";
import { OperationsScheduler } from "./operations.scheduler";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, ReminderScheduler, OperationsScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
