# CLAUDE.md - apps/claude

Main CLI for Claude Code usage tracking with water consumption.

## Package Overview

**Name**: `llm-water-tracker`
**Description**: Track Claude Code token usage, costs, and water consumption
**Type**: CLI tool and library with TypeScript exports

## Development Commands

- `pnpm run test` - Run all tests
- `pnpm run format` - Format and auto-fix with ESLint
- `pnpm typecheck` - TypeScript type check
- `pnpm run build` - Build with tsdown (includes schema generation)
- `pnpm run generate:schema` - Generate JSON schema for config
- `pnpm run prerelease` - lint + typecheck + build

**Development Usage:**

- `pnpm run start daily` — Daily usage with water columns
- `pnpm run start monthly` — Monthly report
- `pnpm run start session` — Session-based report
- `pnpm run start blocks` — 5-hour billing blocks
- `pnpm run start statusline` — Compact status line (Beta)
- Add `--json` for JSON output
- Add `--mode <auto|calculate|display>` for cost control
- Add `--offline` to use cached water rates

## Architecture

**Key Modules:**

- `src/index.ts` — CLI entry point (Gunshi-based command routing)
- `src/data-loader.ts` — Parses JSONL files from Claude data directories
- `src/calculate-cost.ts` — Token aggregation and cost calculation
- `src/commands/` — Subcommands: daily, monthly, session, blocks, statusline
- `src/logger.ts` — Logging utilities (use instead of console.log)

**Data Flow:**

1. Load JSONL from `~/.config/claude/projects/` and `~/.claude/projects/`
2. Aggregate usage by time periods or sessions
3. Calculate costs via LiteLLM pricing
4. Calculate water via `@llm-water-tracker/internal/water-calculator`
5. Output formatted tables or JSON

## Environment Variables

- `LOG_LEVEL` — Logging verbosity (0=silent … 5=trace)
- `CLAUDE_CONFIG_DIR` — Custom Claude data directory paths (comma-separated)

## Code Style

- No `console.log` — use `logger.ts`
- `.ts` extensions for local imports
- `@praha/byethrow Result` type preferred over try-catch
- Only export what's used by other modules
- All runtime deps in `devDependencies`

**Post-Change Workflow — run in parallel:**

- `pnpm run format`
- `pnpm typecheck`
- `pnpm run test`

## Testing

- In-source testing with `if (import.meta.vitest != null)` blocks
- Vitest globals: use `describe`, `it`, `expect` directly — NO imports
- NEVER use `await import()` dynamic imports
- Mock data via `fs-fixture` with `createFixture()`
- Use Claude 4 models: `claude-sonnet-4-20250514`, `claude-opus-4-20250514`

## Package Exports

- `.` — Main CLI entry point
- `./calculate-cost` — Cost calculation utilities
- `./data-loader` — Data loading functions
- `./debug` — Debug utilities
- `./logger` — Logging utilities
- `./pricing-fetcher` — LiteLLM pricing integration
