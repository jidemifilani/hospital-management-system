import { Module } from "@nestjs/common";
import { ClinicalSafetyService } from "./clinical-safety.service";
import { ClinicalSafetyListener } from "./clinical-safety.listener";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [ClinicalSafetyService, ClinicalSafetyListener],
  exports: [ClinicalSafetyService],
})
export class ClinicalSafetyModule {}
