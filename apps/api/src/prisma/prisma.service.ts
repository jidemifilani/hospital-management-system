import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { loadKey } from "../common/crypto/field-cipher";
import {
  assertNotQueriedOnCiphertext,
  decryptResult,
  encryptData,
} from "../common/crypto/encrypted-fields";

/** Actions whose result is one or more rows of `params.model`. */
const RETURNS_ROWS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "create",
  "update",
  "upsert",
  "delete",
]);

/** Actions carrying row data to be written. */
const WRITES_ROWS = new Set(["create", "createMany", "update", "updateMany", "upsert"]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly encryptionKey: Buffer;

  constructor() {
    super({
      log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "error" },
        { emit: "event", level: "warn" },
      ],
    });

    // Loaded here so a missing or malformed key stops the process at startup.
    // Deferring it would mean the API comes up, serves reads, and only fails
    // when the first patient is saved — by which point it is a live outage
    // rather than a failed deploy.
    this.encryptionKey = loadKey(process.env.FIELD_ENCRYPTION_KEY);

    this.installFieldEncryption();
  }

  /**
   * Encryption sits in middleware rather than in the services that own each
   * table, because a service is something a future call site can forget to go
   * through. Everything Prisma runs passes here, including rows reached
   * through `include` from an unrelated module, so a column listed in
   * ENCRYPTED_FIELDS cannot be written in the clear by any route.
   *
   * `$use` is deprecated in favour of `$extends`, but an extension returns a
   * new client type and PrismaService is injected by its own class in around
   * forty providers. Middleware applies to this instance and leaves that alone.
   */
  private installFieldEncryption() {
    this.$use(async (params, next) => {
      assertNotQueriedOnCiphertext(params.model, params.args);

      if (params.args && WRITES_ROWS.has(params.action)) {
        if (params.action === "upsert") {
          encryptData(params.model, params.args.create, this.encryptionKey);
          encryptData(params.model, params.args.update, this.encryptionKey);
        } else {
          encryptData(params.model, params.args.data, this.encryptionKey);
        }
      }

      const result = await next(params);

      if (RETURNS_ROWS.has(params.action)) {
        decryptResult(params.model, result, this.encryptionKey);
      }
      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Database connected");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("cleanDatabase is not allowed in production");
    }
    const tablenames = await this.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;
    for (const { tablename } of tablenames) {
      if (tablename !== "_prisma_migrations") {
        await this.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      }
    }
  }
}
