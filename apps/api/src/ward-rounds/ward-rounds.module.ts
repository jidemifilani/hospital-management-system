import { Module } from "@nestjs/common";
import { WardRoundsService } from "./ward-rounds.service";
import { WardRoundsController } from "./ward-rounds.controller";

@Module({ controllers: [WardRoundsController], providers: [WardRoundsService] })
export class WardRoundsModule {}
