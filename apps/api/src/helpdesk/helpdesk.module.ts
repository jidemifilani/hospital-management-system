import { Module } from "@nestjs/common";
import { HelpdeskController } from "./helpdesk.controller";
import { HelpdeskService } from "./helpdesk.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [HelpdeskController],
  providers: [HelpdeskService],
  exports: [HelpdeskService],
})
export class HelpdeskModule {}
