import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuditAction } from "@prisma/client";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { JwtPayload } from "@hms/types";

const METHOD_ACTION: Record<string, AuditAction> = {
  POST: "CREATE",
  PATCH: "UPDATE",
  PUT: "UPDATE",
  DELETE: "DELETE",
};

/** Endpoints whose bodies carry credentials and must never be recorded. */
const SENSITIVE_PATHS = [/\/auth\/login/, /\/auth\/refresh/, /\/auth\/mfa/, /password/i];

/**
 * Reads that expose one identified patient's clinical record.
 *
 * Deliberately narrow: auditing every GET would bury the signal, but a record
 * of who opened whose chart is the part that matters — an unexplained lookup
 * is the classic way patient confidentiality is breached.
 */
const PHI_READ_ROUTES = [
  /\/patients\/:id$/,
  /\/emr\/patients\/:patientId\//,
  /\/encounters\/:id$/,
  /\/admissions\/:id$/,
  /\/charges\/encounter\/:encounterId/,
  // Downloading a patient's scan or letter is a disclosure of their
  // record, and is the document question an investigation actually asks.
  /\/documents\/:id\/download$/,
];

const SENSITIVE_FIELDS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "mfaSecret",
  "mfaCode",
  "otp",
]);

/**
 * Writes the audit trail.
 *
 * The AuditService has always listened for an "audit.log" event that nothing
 * ever emitted, so the audit table, the Audit Trail screen and the AUDITOR
 * role had no data at all. This records every successful state change.
 *
 * Reads are deliberately not audited yet: logging every GET would swamp the
 * table, and PHI read-access auditing deserves its own targeted pass.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private events: EventEmitter2) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const routePath: string = req.route?.path ?? req.url;

    // Reads of an identified patient's record are audited; general list and
    // search traffic is not, or the trail becomes unreadable. "Who opened this
    // chart" is the question an investigation actually asks.
    const action =
      METHOD_ACTION[req.method] ??
      (req.method === "GET" && PHI_READ_ROUTES.some((p) => p.test(routePath))
        ? ("READ" as AuditAction)
        : undefined);

    // Only successful requests are recorded — tap's next arm does not fire on error.
    if (!action) return next.handle();

    return next.handle().pipe(
      tap((body) => {
        const user: JwtPayload | undefined = req.user;
        const { resource, resourceId } = this.describe(req.route?.path ?? req.url, req.params);

        const sensitive = SENSITIVE_PATHS.some((p) => p.test(req.url));

        this.events.emit("audit.log", {
          userId: user?.sub ?? this.idFrom(body, "userId"),
          action: this.refineAction(action, req.url),
          resource,
          resourceId: resourceId ?? this.idFrom(body, "id"),
          // Credential-bearing endpoints are still audited — the fact of a
          // login matters — but their bodies are never stored.
          metadata: sensitive ? undefined : this.scrub(req.body),
          ipAddress: req.ip ?? req.socket?.remoteAddress,
          userAgent: req.headers?.["user-agent"],
          organizationId: user?.organizationId,
        });
      }),
    );
  }

  /** Turns "/api/v1/patients/:id/notes" into resource "patients/notes". */
  private describe(routePath: string, params: Record<string, string> = {}) {
    const segments = routePath
      .replace(/^\/?api\/v\d+\//, "")
      .split("/")
      .filter((s) => s && !s.startsWith(":"));

    // Routes name the identifier differently (:id, :patientId, :encounterId),
    // so take whichever the route actually declared.
    const resourceId =
      params.id ?? params.patientId ?? params.encounterId ?? Object.values(params)[0];

    return {
      resource: segments.join("/") || "root",
      resourceId,
    };
  }

  /** Sign-in and sign-out are mutations, but read better as LOGIN/LOGOUT. */
  private refineAction(action: AuditAction, url: string): AuditAction {
    if (/\/auth\/logout/.test(url)) return "LOGOUT";
    if (/\/auth\/login/.test(url)) return "LOGIN";
    return action;
  }

  private idFrom(body: unknown, key: string): string | undefined {
    if (!body || typeof body !== "object") return undefined;
    const source = "user" in body ? (body as { user: unknown }).user : body;
    if (!source || typeof source !== "object") return undefined;
    const value = (source as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
  }

  /** Never let a credential reach a table retained for seven years. */
  private scrub(body: unknown): Record<string, unknown> | undefined {
    if (!body || typeof body !== "object") return undefined;

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      out[key] = SENSITIVE_FIELDS.has(key) ? "[redacted]" : value;
    }
    return out;
  }
}
