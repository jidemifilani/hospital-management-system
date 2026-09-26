import { Module } from "@nestjs/common";
import { TheatreController } from "./theatre.controller";
import { TheatreService } from "./theatre.service";
import { EncountersModule } from "../encounters/encounters.module";

@Module({
  imports: [EncountersModule],
  controllers: [TheatreController],
  providers: [TheatreService],
})
export class TheatreModule {}
