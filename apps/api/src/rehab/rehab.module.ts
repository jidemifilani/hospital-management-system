import { Module } from "@nestjs/common";
import { RehabService } from "./rehab.service";
import { RehabController } from "./rehab.controller";

@Module({ controllers: [RehabController], providers: [RehabService] })
export class RehabModule {}
