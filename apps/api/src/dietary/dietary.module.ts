import { Module } from "@nestjs/common";
import { DietaryController } from "./dietary.controller";
import { DietaryService } from "./dietary.service";

@Module({
  controllers: [DietaryController],
  providers: [DietaryService],
})
export class DietaryModule {}
