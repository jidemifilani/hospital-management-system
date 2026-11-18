FROM node:20-alpine AS base
# openssl is what Prisma's query engine links against on musl. Without it the
# engine is downloaded, the build succeeds, and the API dies on its first
# query.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN npm install -g pnpm turbo

FROM base AS pruner
COPY . .
# The workspace is named @hms/api, not api. With the wrong name turbo prunes
# nothing and exits non-zero, which is why this image had never been built.
RUN turbo prune @hms/api --docker

FROM base AS installer
# The whole pruned workspace, not just its package.json files: the @hms/*
# packages are compiled from source here, and `turbo prune` carries no root
# files beyond the manifests, so tsconfig.base.json -- which every package's
# tsconfig extends -- has to come from the context.
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
COPY tsconfig.base.json ./

# npm must not build the @hms/* packages; turbo must.
#
# npm runs each workspace's prepare script during install and does not order
# them by dependency: @hms/utils compiles against @hms/types and was built
# first, failing on TS2307. --ignore-scripts does not help, because npm
# treats a workspace's prepare as building a local dependency rather than as
# a lifecycle script, and runs it anyway.
#
# So the prepare scripts are dropped from the manifests here, and the next
# stage builds the packages with turbo, which does order them --
# dependsOn: ["^build"] is exactly that. Scripts stay enabled for everything
# else, so native modules such as bcrypt still compile.
RUN node -e 'const fs = require("fs"); for (const d of fs.readdirSync("packages")) { const f = "packages/" + d + "/package.json"; const j = JSON.parse(fs.readFileSync(f, "utf8")); if (j.scripts) delete j.scripts.prepare; fs.writeFileSync(f, JSON.stringify(j, null, 2)); }'

RUN npm ci

FROM installer AS builder

# The Prisma client is generated code, and `nest build` does not generate it.
# @prisma/client's own postinstall does not either: it looks for the schema
# beside the root package.json, and in this workspace it lives under
# apps/api. Without this the image compiles against the ungenerated stub and
# every query fails at runtime.
# The installed binary, not npx: npx falls back to downloading from the
# registry when it cannot find one, so a missing dev dependency shows up as
# a network error in the middle of a build rather than as what it is.
RUN ./node_modules/.bin/prisma generate --schema apps/api/prisma/schema.prisma

RUN npx turbo build --filter=@hms/api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Uploaded documents are written here, and in production they are patient
# records. Created in the image, owned by the user that runs the API, so that
# the volume mounted over it inherits that ownership -- a volume created empty
# belongs to root, and the API cannot write to it.
#
# It must be a volume. Without one the files live in the container's writable
# layer and the next redeploy destroys them.
RUN mkdir -p /app/storage/documents && chown -R nestjs:nodejs /app/storage
ENV FILE_STORAGE_ROOT=/app/storage/documents

USER nestjs
EXPOSE 4000
CMD ["node", "dist/main.js"]
