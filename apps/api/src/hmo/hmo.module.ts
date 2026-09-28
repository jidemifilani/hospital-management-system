import { Module } from "@nestjs/common";
import { HmoController } from "./hmo.controller";
import { HmoService } from "./hmo.service";
import { HmoListener } from "./hmo.listener";
import { PrismaModule } from "../prisma/prisma.module";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [HmoController],
  providers: [HmoService, HmoListener],
  exports: [HmoService],
})
export class HmoModule {}
