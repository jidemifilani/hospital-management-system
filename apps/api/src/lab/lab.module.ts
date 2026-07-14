import { Module } from "@nestjs/common";
import { LabController } from "./lab.controller";
import { LabService } from "./lab.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [LabController],
  providers: [LabService],
  exports: [LabService],
})
export class LabModule {}
