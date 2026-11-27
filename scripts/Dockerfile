# The backup sidecar.
#
# Separate from the API image on purpose: it needs the postgres client tools,
# which the API has no use for, and it must keep running when the API is being
# redeployed. It carries no application code and never opens a port.
FROM node:20-alpine

# pg_dump, pg_restore and psql, plus the AWS CLI for copying finished
# backups off the machine.
#
# Version 17, not 16: pg_dump refuses to dump a server newer than itself, and
# a managed Postgres is on 17 — Neon creates projects on it by default. A
# 17 client still dumps a 16 server, so this is the safe direction to be
# wrong in.
RUN apk add --no-cache postgresql17-client aws-cli

WORKDIR /app

# The scripts use node builtins only, so there is nothing to install.
COPY scripts ./scripts

# Backups are written here; compose mounts a volume over it.
RUN mkdir -p /backups
ENV BACKUP_DIR=/backups

# Empty on purpose: the client tools are on PATH in this image, so the scripts
# must run them directly rather than reaching back into a docker container.
ENV PG_DOCKER_CONTAINER=""

CMD ["node", "scripts/backup-scheduler.js"]
