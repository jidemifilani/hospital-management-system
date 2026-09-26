import { Module } from "@nestjs/common";
import { AdmissionsController } from "./admissions.controller";
import { AdmissionsService } from "./admissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ChargesModule } from "../charges/charges.module";

@Module({
  imports: [PrismaModule, ChargesModule],
  controllers: [AdmissionsController],
  providers: [AdmissionsService],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}
