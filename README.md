# Caraoke

Caraoke lets two people in distinct cars sing the same song together — across distance,
hands-free, connection over competition.

## Monorepo layout

This is a [pnpm workspace](https://pnpm.io/workspaces) orchestrated with
[Turborepo](https://turbo.build/).

| Path               | Package            | Purpose                                                        |
| ------------------ | ------------------ | -------------------------------------------------------------- |
| `apps/mobile`      | `@caraoke/mobile`  | Expo SDK 56 (React Native 0.85) app, Expo Router.              |
| `services/api`     | `@caraoke/api`     | Core API — modular monolith (Express + TypeScript).            |
| `services/spotify-mcp` | `@caraoke/spotify-mcp` | Spotify MCP server (streamable-http) — playback control. |
| `packages/shared`  | `@caraoke/shared`  | Shared TypeScript types + Zod schemas (the source of truth).   |
| `packages/config`  | `@caraoke/config`  | Shared ESLint, Prettier, and TypeScript presets.               |

See `.ralph/specs/planning-artifacts/architecture.md` for the full target structure.

## Prerequisites

- Node.js >= 22
- pnpm >= 10 (`corepack enable`)

## Common commands

```bash
pnpm install        # install the whole workspace
pnpm build          # build every package (Turborepo, respects dep graph)
pnpm dev            # run dev tasks (api watch + expo start)
pnpm lint           # ESLint across the workspace
pnpm typecheck      # TypeScript (strict) across the workspace
pnpm test           # unit tests across the workspace
```

The CI gate (`.github/workflows/ci.yml`) blocks merges on **lint + typecheck + test**.
