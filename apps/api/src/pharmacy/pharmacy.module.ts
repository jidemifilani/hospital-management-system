import { Module } from "@nestjs/common";
import { PharmacyController } from "./pharmacy.controller";
import { PharmacyService } from "./pharmacy.service";
import { PrismaModule } from "../prisma/prisma.module";
import { EncountersModule } from "../encounters/encounters.module";
import { ClinicalSafetyModule } from "../clinical-safety/clinical-safety.module";
import { InventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [PrismaModule, EncountersModule, ClinicalSafetyModule, InventoryModule],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
