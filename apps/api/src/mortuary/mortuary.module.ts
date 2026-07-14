import { Module } from "@nestjs/common";
import { MortuaryController } from "./mortuary.controller";
import { MortuaryService } from "./mortuary.service";

@Module({
  controllers: [MortuaryController],
  providers: [MortuaryService],
})
export class MortuaryModule {}
