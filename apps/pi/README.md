# llm-water-pi

> Analyze Pi-agent session token usage, costs, and water consumption.

Built by **[Procrastinate Coder](https://github.com/procrastinate-coders)** · Part of the [llm-water-tracker](https://github.com/procrastinate-coders/llm-water-usage) family.

## Quick Start

```bash
npx llm-water-pi@latest --help
npx llm-water-pi@latest daily
```

### Shell Alias (recommended)

```bash
alias water-pi='npx llm-water-pi@latest'
water-pi daily
water-pi monthly --json
```

## Usage

```bash
npx llm-water-pi daily                          # Daily usage with water
npx llm-water-pi monthly                        # Monthly report
npx llm-water-pi session                        # Session-level report
npx llm-water-pi daily --json                   # JSON output
npx llm-water-pi daily --pi-path /path/to/sessions  # Custom path
npx llm-water-pi daily --since 2025-12-01 --until 2025-12-19
```

## Environment Variables

- `PI_AGENT_DIR` — override pi-agent sessions directory (default: `~/.pi/agent/sessions`)
- `LOG_LEVEL` — log verbosity (0 silent … 5 trace)

## What is Pi-agent?

[Pi-agent](https://github.com/badlogic/pi-mono) is an alternative Claude coding agent. It stores usage data in JSONL format similar to Claude Code.

## Data Source

| Directory | Default Path |
|-----------|-------------|
| Pi-agent sessions | `~/.pi/agent/sessions/` |

## Features

- 💧 **Water columns**: Liters and gallons per day/month/session
- 💵 **Accurate cost calculation** via LiteLLM
- 📄 **JSON output** with `--json`
- 📱 **Compact mode** with `--compact`

## License

[MIT](../../LICENSE) © [Procrastinate Coder](https://github.com/procrastinate-coders)
