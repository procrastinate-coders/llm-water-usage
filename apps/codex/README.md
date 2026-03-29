# llm-water-codex

> Analyze OpenAI Codex CLI token usage, costs, and water consumption.

Built by **[Procrastinate Coder](https://github.com/uditgarg)** · Part of the [llm-water-tracker](https://github.com/uditgarg/llm-water-tracker) family.

> ⚠️ **Beta:** Codex CLI support is experimental. Expect breaking changes until the upstream Codex tooling stabilizes.

## Quick Start

```bash
npx llm-water-codex@latest --help
npx llm-water-codex@latest daily
npx llm-water-codex@latest monthly
```

### Shell Alias (recommended)

```bash
# bash/zsh
alias water-codex='npx llm-water-codex@latest'

# Then:
water-codex daily
water-codex monthly --json
```

## Usage

```bash
# Daily usage with water consumption
npx llm-water-codex daily

# Date range
npx llm-water-codex daily --since 20250911 --until 20250917

# JSON output
npx llm-water-codex daily --json

# Monthly report
npx llm-water-codex monthly

# Session report
npx llm-water-codex sessions
```

## Environment Variables

- `CODEX_HOME` — override Codex sessions directory (default: `~/.codex`)
- `LOG_LEVEL` — log verbosity (0 silent … 5 trace)

## Features

- 💧 **Water columns**: Liters and gallons per day/month/session
- 💵 **Offline-first pricing** cache with automatic LiteLLM refresh
- 🤖 **Per-model aggregation** including cached token accounting
- 📄 **JSON output** for scripting

## License

[MIT](../../LICENSE) © [Procrastinate Coder](https://github.com/uditgarg)
