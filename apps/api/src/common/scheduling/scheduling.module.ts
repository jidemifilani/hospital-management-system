import { Global, Module } from "@nestjs/common";
import { JobGuardService } from "./job-guard.service";

/**
 * Global, like PrismaModule, because the schedulers live in six different
 * feature modules and every one of them needs the same guard. Importing it
 * into each would be six chances to forget, and forgetting means a job that
 * sends email twice.
 */
@Global()
@Module({
  providers: [JobGuardService],
  exports: [JobGuardService],
})
export class SchedulingModule {}
