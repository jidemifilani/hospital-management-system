import { Module } from "@nestjs/common";
import { BedsController } from "./beds.controller";
import { BedsService } from "./beds.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [BedsController],
  providers: [BedsService],
  exports: [BedsService],
})
export class BedsModule {}
