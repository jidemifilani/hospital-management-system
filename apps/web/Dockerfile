FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS pruner
COPY . .
RUN npm install -g turbo
# @hms/web, not web — the short name prunes nothing and fails the build.
RUN turbo prune @hms/web --docker

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
ENV NEXT_TELEMETRY_DISABLED=1

# next.config.mjs only asks for a standalone build when this is set, and the
# runner stage copies .next/standalone -- so without it the COPY below finds
# nothing.
ENV DOCKER_BUILD=1

# NEXT_PUBLIC_* is compiled into the browser bundle by `next build`; it is not
# read when the server starts. Supplying it only to the running container left
# every browser calling whatever had been baked in at build time, which was
# http://localhost:4000 -- an app that works on the server and nowhere else.
#
# No default value: a build without one would produce exactly that bundle and
# report success, so the build fails instead.
ARG NEXT_PUBLIC_API_URL
RUN test -n "$NEXT_PUBLIC_API_URL" || (echo "NEXT_PUBLIC_API_URL build arg is required: it is compiled into the browser bundle" && exit 1)
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npx turbo build --filter=@hms/web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone output does not include public/, so it is copied separately.
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
