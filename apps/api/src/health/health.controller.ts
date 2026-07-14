import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller({ path: "health", version: "1" })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Health check — confirms API and DB connectivity" })
  async check() {
    const dbStart = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      db: { status: "ok", latencyMs: Date.now() - dbStart },
    };
  }
}
