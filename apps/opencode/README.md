# llm-water-opencode

> Analyze OpenCode session token usage, costs, and water consumption.

Built by **[Procrastinate Coder](https://github.com/uditgarg)** · Part of the [llm-water-tracker](https://github.com/uditgarg/llm-water-tracker) family.

## Quick Start

```bash
npx llm-water-opencode@latest --help
npx llm-water-opencode@latest daily
```

### Shell Alias (recommended)

```bash
alias water-opencode='npx llm-water-opencode@latest'
water-opencode daily
water-opencode monthly --json
```

## Usage

```bash
npx llm-water-opencode daily          # Daily usage with water
npx llm-water-opencode weekly         # Weekly report
npx llm-water-opencode monthly        # Monthly report
npx llm-water-opencode session        # Session-level report
npx llm-water-opencode daily --json   # JSON output
npx llm-water-opencode daily --compact
```

## Environment Variables

- `OPENCODE_DATA_DIR` — override OpenCode data directory (default: `~/.local/share/opencode`)
- `LOG_LEVEL` — log verbosity (0 silent … 5 trace)

## Data Location

OpenCode stores usage data in:
- `~/.local/share/opencode/storage/message/{sessionID}/msg_{messageID}.json`

## Features

- 💧 **Water columns**: Liters and gallons per day/week/month/session
- 💵 **Accurate cost calculation** from token data via LiteLLM
- 📄 **JSON output** with `--json`
- 📱 **Compact mode** with `--compact`

## License

[MIT](../../LICENSE) © [Procrastinate Coder](https://github.com/uditgarg)
