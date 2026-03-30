# llm-water-tracker

> Analyze Claude Code token usage, costs, and water consumption from local JSONL files.

Built by **[Procrastinate Coder](https://github.com/procrastinate-coders)** · Part of the [llm-water-tracker](https://github.com/procrastinate-coders/llm-water-usage) family.

## Quick Start

```bash
# No install needed
npx llm-water-tracker@latest
npx llm-water-tracker@latest daily
npx llm-water-tracker@latest monthly
npx llm-water-tracker@latest session
npx llm-water-tracker@latest blocks
npx llm-water-tracker@latest statusline
```

## Usage

```bash
# Daily usage with water consumption
npx llm-water-tracker daily

# Monthly report
npx llm-water-tracker monthly

# Session-based usage
npx llm-water-tracker session

# 5-hour billing blocks
npx llm-water-tracker blocks --recent
npx llm-water-tracker blocks --active

# Filters
npx llm-water-tracker daily --since 20250525 --until 20250530
npx llm-water-tracker daily --json
npx llm-water-tracker daily --breakdown
npx llm-water-tracker daily --timezone UTC

# Project grouping
npx llm-water-tracker daily --instances
npx llm-water-tracker daily --project myproject

# Compact mode
npx llm-water-tracker --compact
```

## Features

- 💧 **Water columns**: Liters and gallons per day/month/session/block
- 📊 **Daily / Monthly / Session / Blocks** reports
- 💰 **USD cost tracking** via LiteLLM pricing
- 🔄 **Cache token support** with 0.1× water multiplier for cache reads
- 📄 **JSON output** with `--json`
- 🌐 **Offline mode** with `--offline`
- ⚙️ **Config file**: `~/.llm-water-tracker.json`

## Data Source

Reads JSONL files from:
- `~/.config/claude/projects/` (new default)
- `~/.claude/projects/` (legacy)

Set `CLAUDE_CONFIG_DIR` to override.

## License

[MIT](../../LICENSE) © [Procrastinate Coder](https://github.com/procrastinate-coders)
