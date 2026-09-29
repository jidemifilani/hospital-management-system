import { Module } from "@nestjs/common";
import { ProductionController } from "./production.controller";
import { ProductionService } from "./production.service";
import { PrismaModule } from "../prisma/prisma.module";
import { InventoryModule } from "../inventory/inventory.module";

// InventoryModule supplies the stock movements: a run draws materials and puts
// the finished item back, both through the ordinary inventory paths so costing
// and batch tracking behave the same as anywhere else.
@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
