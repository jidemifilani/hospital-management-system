import { Module } from "@nestjs/common";
import { CarePlansController } from "./care-plans.controller";
import { CarePlansService } from "./care-plans.service";

@Module({
  controllers: [CarePlansController],
  providers: [CarePlansService],
})
export class CarePlansModule {}
