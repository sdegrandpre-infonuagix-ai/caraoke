# Caraoke Spotify MCP server — container image for ECS Express Mode (ca-central-1).
# Multi-stage build from the pnpm monorepo root.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @caraoke/spotify-mcp... build
RUN pnpm --filter @caraoke/spotify-mcp deploy --prod /app

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3001
CMD ["node", "dist/main.js"]
