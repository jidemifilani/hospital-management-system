import { Module } from "@nestjs/common";
import { ChargesController } from "./charges.controller";
import { ChargesService } from "./charges.service";
import { ChargesListener } from "./charges.listener";
import { BedChargeScheduler } from "./bed-charge.scheduler";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ChargesController],
  providers: [ChargesService, ChargesListener, BedChargeScheduler],
  exports: [ChargesService],
})
export class ChargesModule {}
