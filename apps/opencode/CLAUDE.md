# CLAUDE.md - apps/opencode

CLI for OpenCode usage tracking with water consumption.

## Package Overview

**Name**: `llm-water-opencode`
**Description**: Track OpenCode session token usage, costs, and water consumption

## Log Sources

- OpenCode sessions: `${OPENCODE_DATA_DIR:-~/.local/share/opencode}/storage/message/`
- Each message is an individual JSON file (not JSONL)
- Message structure: `tokens.input`, `tokens.output`, `tokens.cache.read`, `tokens.cache.write`

## Token Fields

- `input` — total input tokens
- `output` — output tokens
- `cache.read` — cached input tokens (0.1× water multiplier)
- `cache.write` — cache creation tokens
- `cost` — pre-calculated cost (may be present)

## Development Commands

- `pnpm run test` - Run all tests
- `pnpm run format` - Format and auto-fix with ESLint
- `pnpm typecheck` - TypeScript type check
- `pnpm run build` - Build with tsdown

## CLI Usage

- Reuse `@llm-water-tracker/terminal` and `@llm-water-tracker/internal` wherever possible
- All runtime deps in `devDependencies` (bundled CLI)
- Entry point uses Gunshi framework
- `OPENCODE_DATA_DIR` env var for data directory override

## Testing

- `fs-fixture` with `using` for cleanup
- `if (import.meta.vitest != null)` blocks
- Vitest globals enabled — use `describe`, `it`, `expect` directly without imports

**Post-Change Workflow — run in parallel:**

- `pnpm run format`
- `pnpm typecheck`
- `pnpm run test`
