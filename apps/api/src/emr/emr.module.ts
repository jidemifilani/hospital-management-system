import { Module } from "@nestjs/common";
import { EmrController } from "./emr.controller";
import { EmrService } from "./emr.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [EmrController],
  providers: [EmrService],
  exports: [EmrService],
})
export class EmrModule {}
