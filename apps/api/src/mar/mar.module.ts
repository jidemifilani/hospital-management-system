import { Module } from "@nestjs/common";
import { MarService } from "./mar.service";
import { MarController } from "./mar.controller";

@Module({ controllers: [MarController], providers: [MarService] })
export class MarModule {}
