import { Module } from "@nestjs/common";
import { AccountingController } from "./accounting.controller";
import { AccountingService } from "./accounting.service";
import { AccountingListener } from "./accounting.listener";
import { ChartSeeder } from "./chart.seeder";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AccountingController],
  providers: [AccountingService, AccountingListener, ChartSeeder],
  exports: [AccountingService],
})
export class AccountingModule {}
