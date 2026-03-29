# CLAUDE.md - apps/codex

CLI for OpenAI Codex usage tracking with water consumption.

## Package Overview

**Name**: `llm-water-codex`
**Description**: Track OpenAI Codex CLI token usage, costs, and water consumption

## Log Sources

- Codex sessions: `${CODEX_HOME:-~/.codex}/sessions/`
- Each JSONL line is an `event_msg` with `payload.type === "token_count"`
- `payload.info.total_token_usage` holds cumulative totals; `payload.info.last_token_usage` is the delta

## Token Fields

- `input_tokens` — total input tokens
- `cached_input_tokens` — cached portion (prompt-caching)
- `output_tokens` — completion tokens (includes reasoning)
- `reasoning_output_tokens` — breakdown for reasoning (informational only)
- `total_tokens` — cumulative total

## Development Commands

- `pnpm run test` - Run all tests
- `pnpm run format` - Format and auto-fix with ESLint
- `pnpm typecheck` - TypeScript type check
- `pnpm run build` - Build with tsdown

## CLI Usage

- `daily` subcommand only for now
- `CODEX_HOME` env var for session directory override
- `--json` for structured output
- `--offline` to force embedded pricing snapshot

## Code Style

- All runtime deps in `devDependencies` (bundled CLI)
- `.ts` extensions for local imports
- NEVER use `await import()` dynamic imports

**Post-Change Workflow — run in parallel:**

- `pnpm run format`
- `pnpm typecheck`
- `pnpm run test`
