import { Module } from "@nestjs/common";
import { PosController } from "./pos.controller";
import { PosService } from "./pos.service";
import { PosListener } from "./pos.listener";
import { PrismaModule } from "../prisma/prisma.module";
import { InventoryModule } from "../inventory/inventory.module";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [PrismaModule, InventoryModule, AccountingModule],
  controllers: [PosController],
  providers: [PosService, PosListener],
  exports: [PosService],
})
export class PosModule {}
