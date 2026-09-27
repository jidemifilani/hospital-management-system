import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { AuditAction } from "@prisma/client";

export interface AuditEvent {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  organizationId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(event: AuditEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma.auditLog.create({ data: event as any });
  }

  @OnEvent("audit.log")
  handleAuditEvent(event: AuditEvent) {
    // Audit logging must never crash the clinical flow, but a silent failure
    // is worse than a noisy one: this is a retained compliance record, so a
    // dropped write has to leave a trace somewhere an operator will see.
    this.log(event).catch((err) => {
      this.logger.error(
        `Audit write failed for ${event.action} on ${event.resource}` +
          `${event.resourceId ? ` (${event.resourceId})` : ""} by user ${event.userId ?? "unknown"}`,
        err instanceof Error ? err.stack : err,
      );
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 50,
    filters: { userId?: string; resource?: string; action?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.resource && { resource: filters.resource }),
      ...(filters.action && { action: filters.action as AuditAction }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              email: true,
              staff: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
