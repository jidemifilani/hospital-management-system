import { Module } from "@nestjs/common";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { AuditPartitionsService } from "./audit-partitions.service";

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditPartitionsService],
  exports: [AuditService],
})
export class AuditModule {}
