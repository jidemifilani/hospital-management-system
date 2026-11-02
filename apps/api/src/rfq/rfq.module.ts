import { Module } from "@nestjs/common";
import { RfqService } from "./rfq.service";
import { RfqController } from "./rfq.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { ReportsModule } from "../reports/reports.module";

@Module({
  // ReportsModule exports MailService, which issues the RFQ invitations.
  imports: [PrismaModule, ReportsModule],
  providers: [RfqService],
  controllers: [RfqController],
  exports: [RfqService],
})
export class RfqModule {}
