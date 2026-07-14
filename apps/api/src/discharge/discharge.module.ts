import { Module } from "@nestjs/common";
import { DischargeService } from "./discharge.service";
import { DischargeController } from "./discharge.controller";

@Module({ controllers: [DischargeController], providers: [DischargeService] })
export class DischargeModule {}
