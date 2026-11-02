import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { MailService } from "./mail.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService, MailService],
  exports: [MailService],
})
export class ReportsModule {}
