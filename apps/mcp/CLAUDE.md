# CLAUDE.md - apps/mcp

MCP (Model Context Protocol) server for llm-water-tracker.

## Package Overview

**Name**: `@llm-water-tracker/mcp`
**Description**: MCP server exposing LLM usage and water consumption data
**Type**: MCP server with CLI and library exports

## Development Commands

- `pnpm run test` - Run all tests
- `pnpm run format` - Format and auto-fix with ESLint
- `pnpm typecheck` - TypeScript type check
- `pnpm run build` - Build with tsdown
- `pnpm run prerelease` - lint + typecheck + build

## Usage

```bash
pnpm dlx @llm-water-tracker/mcp@latest -- --help
pnpm dlx @llm-water-tracker/mcp@latest -- --type http --port 8080
```

## Architecture

**Key Modules:**

- `src/index.ts` — Main MCP server implementation
- `src/cli.ts` — CLI entry point
- `src/command.ts` — Command handling and routing
- `src/tracker.ts` — llm-water-tracker binary resolution

**MCP Tools Provided:**

- `daily` — Daily usage reports with water consumption
- `session` — Session-based usage reports
- `monthly` — Monthly usage reports
- `blocks` — 5-hour billing blocks reports

**Transport Support:**

- HTTP transport (configurable port/host)
- stdio transport

## Code Style

- No `console.log` — use logger
- `.ts` extensions for local imports
- `@praha/byethrow Result` type preferred
- NEVER use `await import()` dynamic imports

**Post-Change Workflow — run in parallel:**

- `pnpm run format`
- `pnpm typecheck`
- `pnpm run test`

## Package Exports

- `.` — Main MCP server
- `./cli` — CLI entry point
- `./command` — Command handling utilities
