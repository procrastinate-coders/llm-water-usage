# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project

**llm-water-tracker** — Track token usage AND water consumption across all LLM coding tools.
Built by Procrastinate Coder. Forked and extended from ccusage.

## Monorepo Structure

- **`apps/claude/`** — Main CLI for Claude Code usage (`llm-water-tracker`)
- **`apps/codex/`** — OpenAI Codex usage CLI (`llm-water-codex`)
- **`apps/opencode/`** — OpenCode usage CLI (`llm-water-opencode`)
- **`apps/pi/`** — Pi-agent usage CLI (`llm-water-pi`)
- **`apps/amp/`** — Amp usage CLI (`llm-water-amp`)
- **`apps/mcp/`** — MCP server (`@llm-water-tracker/mcp`)
- **`packages/terminal/`** — Shared terminal/table utilities (`@llm-water-tracker/terminal`)
- **`packages/internal/`** — Shared internals incl. water calculator (`@llm-water-tracker/internal`)

Each package has its own CLAUDE.md. Always check the relevant one when working within that package.

### Apps Are Bundled

All projects under `apps/` ship as bundled CLIs. List runtime deps in `devDependencies` so the bundler owns them.

## Development Commands

**Testing and Quality:**

- `pnpm run test` - Run all tests (vitest, watch mode disabled)
- `pnpm run format` - Format code with ESLint (writes changes)
- `pnpm typecheck` - Type check with TypeScript

**Build and Release:**

- `pnpm run build` - Build all packages with tsdown
- `pnpm run release` - Full release workflow (lint + typecheck + test + build + version bump)

**Development Usage (apps/claude):**

- `pnpm run start daily` - Daily usage report
- `pnpm run start monthly` - Monthly aggregated report
- `pnpm run start session` - Session-based usage report
- `pnpm run start blocks` - 5-hour billing blocks report
- `pnpm run start statusline` - Compact status line (Beta)
- Add `--json` for JSON output
- Add `--mode <auto|calculate|display>` for cost calculation control
- Add `--offline` for offline water rates

**MCP Server:**

- `pnpm dlx @llm-water-tracker/mcp@latest -- --help`
- `pnpm dlx @llm-water-tracker/mcp@latest -- --type http --port 8080`

**Cost Calculation Modes:**

- `auto` (default) - Use pre-calculated costUSD when available, otherwise calculate from tokens
- `calculate` - Always calculate costs from token counts
- `display` - Always use pre-calculated costUSD values

**Environment Variables:**

- `LOG_LEVEL` - Logging verbosity (0=silent … 5=trace)
- `CLAUDE_CONFIG_DIR` - Custom Claude data directory path(s), comma-separated

**Multiple Claude Data Directories:**

- Default: searches both `~/.config/claude/projects/` and `~/.claude/projects/`
- Override: `export CLAUDE_CONFIG_DIR="/path/to/claude"`

## Architecture Overview

**Core Data Flow (apps/claude):**

1. **Data Loading** (`data-loader.ts`) — Parses JSONL files from Claude data directories
2. **Token Aggregation** (`calculate-cost.ts`) — Aggregates token counts and costs
3. **Water Calculation** (`@llm-water-tracker/internal/water-calculator`) — Converts tokens to ml/L/gal
4. **Command Execution** (`commands/`) — CLI subcommands orchestrating data + presentation
5. **CLI Entry** (`index.ts`) — Gunshi-based CLI with subcommand routing

**Water Rates:**

- Fetched from `water-rates.json` in the repo root (GitHub raw URL)
- Cached at `~/.config/llm-water-tracker/rates-cache.json` (24h TTL)
- Falls back to hardcoded defaults if offline/failed
- `--offline` flag skips fetch

## Git Commit Conventions

Follow Conventional Commits with package/area scope:

```
<type>(<scope>): <subject>
```

Scopes: `claude`, `codex`, `opencode`, `pi`, `amp`, `mcp`, `terminal`, `internal`

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`

Examples:
```
feat(claude): add water columns to daily report
fix(mcp): resolve connection timeout issues
feat(internal): add water-calculator module
chore: update dependencies
```

## Code Style Notes

- ESLint with tab indentation and double quotes
- TypeScript strict mode, bundler module resolution
- No `console.log` — use `logger.ts`
- Import `.ts` extensions for local imports: `import { foo } from './utils.ts'`
- Prefer `@praha/byethrow Result` type over try-catch
- Only export what's used by other modules
- All runtime deps in `devDependencies` (bundled apps)

**Post-Code Change Workflow — always run in parallel:**

- `pnpm run format`
- `pnpm typecheck`
- `pnpm run test`

## Testing

- In-source testing: `if (import.meta.vitest != null)` blocks
- Vitest globals enabled: use `describe`, `it`, `expect` directly — NO imports
- NEVER use `await import()` dynamic imports anywhere
- Mock data via `fs-fixture` with `createFixture()`
- Use Claude 4 models in tests: `claude-sonnet-4-20250514`, `claude-opus-4-20250514`

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless absolutely necessary.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files.
Dependencies should always be added as devDependencies unless explicitly requested.
