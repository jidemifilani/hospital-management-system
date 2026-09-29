import { Module } from "@nestjs/common";
import { HmoController } from "./hmo.controller";
import { HmoService } from "./hmo.service";
import { HmoListener } from "./hmo.listener";
import { StatementsService } from "./statements.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [HmoController],
  providers: [HmoService, HmoListener, StatementsService],
  exports: [HmoService, StatementsService],
})
export class HmoModule {}
