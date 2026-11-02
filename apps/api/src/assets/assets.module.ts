import { Module } from "@nestjs/common";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";
import { DepreciationService } from "./depreciation.service";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  // AccountingModule exports AccountingService, which posts the depreciation
  // journal entries.
  imports: [AccountingModule],
  controllers: [AssetsController],
  providers: [AssetsService, DepreciationService],
  exports: [DepreciationService],
})
export class AssetsModule {}
