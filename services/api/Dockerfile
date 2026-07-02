# Caraoke core API — container image for ECS Express Mode (ca-central-1).
# Multi-stage build from the pnpm monorepo root.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @caraoke/api... build
# tsc doesn't emit non-TS assets — copy the SQL migrations next to the compiled runner so the
# migrate task (node dist/db/migrate.js) can find dist/db/migrations/*.sql.
RUN cp -r services/api/src/db/migrations services/api/dist/db/migrations
# pnpm v10 only deploys injected workspaces by default; --legacy keeps the pre-v10 behavior.
RUN pnpm --filter @caraoke/api deploy --prod --legacy /app

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
CMD ["node", "dist/main.js"]
