import { Module } from "@nestjs/common";
import { AppraisalsService } from "./appraisals.service";
import { AppraisalsController } from "./appraisals.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AppraisalsController],
  providers: [AppraisalsService],
})
export class AppraisalsModule {}
