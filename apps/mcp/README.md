# @llm-water-tracker/mcp

> MCP (Model Context Protocol) server for llm-water-tracker — exposes usage and water data to Claude Desktop and other MCP clients.

Built by **[Procrastinate Coder](https://github.com/procrastinate-coders)** · Part of the [llm-water-tracker](https://github.com/procrastinate-coders/llm-water-usage) family.

## Quick Start

```bash
# Using npx
npx @llm-water-tracker/mcp@latest

# Start with HTTP transport
npx @llm-water-tracker/mcp@latest -- --type http --port 8080
```

## Claude Desktop Integration

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "llm-water-tracker": {
      "command": "npx",
      "args": ["@llm-water-tracker/mcp@latest"],
      "type": "stdio"
    }
  }
}
```

## Claude Code Integration

```sh
claude mcp add llm-water-tracker npx -- @llm-water-tracker/mcp@latest
```

## MCP Tools

- `daily` — Daily usage reports with water consumption
- `monthly` — Monthly aggregated reports
- `session` — Session-based usage reports
- `blocks` — 5-hour billing block reports

## License

[MIT](../../LICENSE) © [Procrastinate Coder](https://github.com/procrastinate-coders)
