import { Module } from "@nestjs/common";
import { TheatreController } from "./theatre.controller";
import { TheatreService } from "./theatre.service";

@Module({
  controllers: [TheatreController],
  providers: [TheatreService],
})
export class TheatreModule {}
