# llm-water-tracker

> Track token usage AND water consumption across all your AI coding tools — Claude Code, Codex, OpenCode, Pi-agent, and Amp.

Built by **[Procrastinate Coder](https://github.com/procrastinate-coders)**.

Based on research from [Making AI Less Thirsty (Ren et al., 2023)](https://arxiv.org/abs/2304.03271) — every LLM token costs water for data center cooling.

---

## The Family

| Package | Tool | Command |
|---------|------|---------|
| [`llm-water-tracker`](https://www.npmjs.com/package/llm-water-tracker) | Claude Code | `npx llm-water-tracker@latest` |
| [`llm-water-codex`](https://www.npmjs.com/package/llm-water-codex) | OpenAI Codex | `npx llm-water-codex@latest` |
| [`llm-water-opencode`](https://www.npmjs.com/package/llm-water-opencode) | OpenCode | `npx llm-water-opencode@latest` |
| [`llm-water-pi`](https://www.npmjs.com/package/llm-water-pi) | Pi-agent | `npx llm-water-pi@latest` |
| [`llm-water-amp`](https://www.npmjs.com/package/llm-water-amp) | Amp | `npx llm-water-amp@latest` |
| [`@llm-water-tracker/mcp`](https://www.npmjs.com/package/@llm-water-tracker/mcp) | MCP Server | `npx @llm-water-tracker/mcp@latest` |

---

## Quick Start (Claude Code)

```bash
npx llm-water-tracker@latest
npx llm-water-tracker@latest daily
npx llm-water-tracker@latest monthly
npx llm-water-tracker@latest session
npx llm-water-tracker@latest blocks
```

## Usage

```bash
# Basic commands
npx llm-water-tracker daily        # Daily token + water usage
npx llm-water-tracker monthly      # Monthly aggregated report
npx llm-water-tracker session      # Usage by conversation session
npx llm-water-tracker blocks       # 5-hour billing windows
npx llm-water-tracker statusline   # Compact status line for hooks (Beta)

# Filters
npx llm-water-tracker daily --since 20250525 --until 20250530
npx llm-water-tracker daily --json
npx llm-water-tracker daily --breakdown
npx llm-water-tracker daily --timezone UTC
npx llm-water-tracker daily --locale en-US

# Project analysis
npx llm-water-tracker daily --instances
npx llm-water-tracker daily --project myproject
npx llm-water-tracker --compact

# Water tracking
npx llm-water-tracker daily --offline  # Use cached water rates
```

---

## Features

- 💧 **Water Tracking**: Shows water consumption (liters + gallons) alongside token costs
- 📊 **Daily / Monthly / Session / Blocks** reports for all supported tools
- 🤖 **Multi-tool**: Claude Code, Codex (GPT), OpenCode, Pi-agent, Amp
- 💰 **Cost Tracking**: USD costs via LiteLLM pricing database
- 🔄 **Cache Token Support**: Tracks cache read/write tokens separately (0.1× water multiplier)
- 📄 **JSON Output**: Structured export with `--json`
- 🌐 **Offline Mode**: `--offline` uses cached water rates without network
- 🔌 **MCP Integration**: Query usage data from Claude Desktop
- 📱 **Smart Tables**: Auto-compact for narrow terminals
- ⚙️ **Config Files**: Set defaults with `~/.llm-water-tracker.json`

---

## Water Rates

Water consumption is estimated from [Making AI Less Thirsty (Ren et al., 2023)](https://arxiv.org/abs/2304.03271):

| Model | Multiplier |
|-------|-----------|
| Haiku / GPT-4o-mini | 0.5× |
| Sonnet / GPT-4o (baseline) | 1.0× |
| Opus / o1 / o3 | 2.0× |
| Cache read tokens | 0.1× |

Base rate: **0.01 ml/token** (~500ml per 50,000 tokens).

Rates are fetched from `water-rates.json` in this repo and cached locally for 24h. Use `--offline` to skip the fetch.

---

## Development Setup

```bash
git clone https://github.com/procrastinate-coders/llm-water-usage.git
cd llm-water-tracker
pnpm install
pnpm run build
pnpm run test
```

---

## License

[MIT](LICENSE) © [Procrastinate Coder](https://github.com/procrastinate-coders)
