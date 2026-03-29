# CLAUDE.md - apps/pi

CLI for Pi-agent usage tracking with water consumption.

## Package Overview

**Name**: `llm-water-pi`
**Description**: Track Pi-agent session token usage, costs, and water consumption

## Development Commands

- `pnpm run test` - Run all tests
- `pnpm run format` - Format and auto-fix with ESLint
- `pnpm typecheck` - TypeScript type check
- `pnpm run build` - Build with tsdown
- `pnpm run prerelease` - lint + typecheck + build

## Usage

```bash
llm-water-pi daily
llm-water-pi monthly
llm-water-pi session
llm-water-pi daily --json
llm-water-pi daily --pi-path /path/to/sessions
```

## Architecture

**Data Source:** `~/.pi/agent/sessions/`

**Key Modules:**

- `src/index.ts` — CLI entry point (Gunshi-based)
- `src/data-loader.ts` — Loads and aggregates pi-agent JSONL data
- `src/_pi-agent.ts` — Pi-agent data parsing and transformation
- `src/commands/` — Subcommands: daily, monthly, session

## Dependencies

All runtime deps in `devDependencies` (bundled CLI):
- `@llm-water-tracker/terminal` — Shared terminal utilities
- `@llm-water-tracker/internal` — Shared internal utilities incl. water calculator
- `gunshi` — CLI framework
- `valibot` — Schema validation
- `tinyglobby` — File globbing

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PI_AGENT_DIR` | Custom path to pi-agent sessions directory |
| `LOG_LEVEL` | Log verbosity (0 silent … 5 trace) |

## Testing

- In-source testing with `if (import.meta.vitest != null)` blocks
- Vitest globals: use `describe`, `it`, `expect` directly — NO imports
- NEVER use `await import()` dynamic imports
- Mock data via `fs-fixture`

**Post-Change Workflow — run in parallel:**

- `pnpm run format`
- `pnpm typecheck`
- `pnpm run test`

## Package Exports

- `.` — Main CLI entry point
