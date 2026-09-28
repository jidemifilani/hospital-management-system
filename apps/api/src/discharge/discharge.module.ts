import { Module } from "@nestjs/common";
import { DischargeService } from "./discharge.service";
import { DischargeController } from "./discharge.controller";
import { RecallModule } from "../recall/recall.module";

// RecallModule is imported so a recorded follow-up date actually reaches the
// recall worklist instead of being written and forgotten.
@Module({
  imports: [RecallModule],
  controllers: [DischargeController],
  providers: [DischargeService],
})
export class DischargeModule {}
