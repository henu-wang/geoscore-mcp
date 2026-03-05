# GEOScore MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![Website](https://img.shields.io/badge/Website-geoscoreai.com-10B981)](https://geoscoreai.com)

An MCP server for [GEOScore](https://geoscoreai.com) - the AI search optimization platform. Scan any website for GEO (Generative Engine Optimization) readiness and get actionable fixes.

> **GEO** = making your website visible to AI search engines like ChatGPT, Perplexity, Claude, and Gemini.

## What is GEO?

GEO (Generative Engine Optimization) is the practice of optimizing websites to be discovered and cited by AI search engines like ChatGPT, Perplexity, and Claude.

## Features

### Tools (8 tools)

| Tool | Description | Auth Required |
|------|-------------|--------------|
| `geo_scan` | Scan a domain for AI search readiness (score, grade, 11 checks) | No |
| `geo_deep_scan` | Full pro analysis with implementation report | API Key (Pro) |
| `geo_generate_fix` | Generate fix code (llms.txt, schema, meta, robots, sitemap) | API Key |
| `geo_get_profile` | Get domain score history and profile | No |
| `geo_compare` | Compare two domains side by side | No |
| `geo_check_visibility` | Check AI search engine citations | API Key (Pro) |
| `geo_get_report` | Retrieve a saved scan report | No |
| `geo_create_api_key` | Create a free API key | No |

### Resources

- `geoscore://guides/what-is-geo` - Introduction to GEO
- `geoscore://guides/llms-txt` - How to create llms.txt
- `geoscore://guides/schema-for-ai` - Schema.org for AI search
- `geoscore://guides/robots-for-ai` - robots.txt for AI crawlers

### Prompts

- `geo-optimize` - Complete scan -> analyze -> fix -> apply workflow
- `geo-audit` - Comprehensive GEO audit with prioritized recommendations
- `geo-compare` - Competitive GEO analysis between two domains

## Installation

### npm (global)

```bash
npm install -g geoscore-mcp
```

### Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "geoscore": {
      "command": "npx",
      "args": ["-y", "geoscore-mcp"],
      "env": {
        "GEOSCORE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor

Add to Cursor Settings > MCP Servers:

```json
{
  "geoscore": {
    "command": "npx",
    "args": ["-y", "geoscore-mcp"],
    "env": {
      "GEOSCORE_API_KEY": "your-api-key-here"
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "geoscore": {
      "command": "npx",
      "args": ["-y", "geoscore-mcp"]
    }
  }
}
```

## Getting an API Key

Use the `geo_create_api_key` tool or visit https://geoscoreai.com/api-keys.

Free keys include 10 scans/day. Pro keys unlock deep scans, fix generation, and visibility checks.

## Usage Examples

### Quick scan
```
"Scan example.com for AI search readiness"
-> Agent calls geo_scan
```

### Full optimization workflow
```
"Optimize my website for AI search engines"
-> Agent uses geo-optimize prompt
-> Scans -> Identifies issues -> Generates fixes -> Applies to project
```

### Competitive analysis
```
"Compare my GEO score against competitor.com"
-> Agent calls geo_compare
```

### Generate specific fix
```
"Generate an llms.txt file for my site"
-> Agent calls geo_generate_fix with fix_type="llms_txt"
-> Writes the file to project root
```

## API

Base URL: `https://api.geoscoreai.com`

Full OpenAPI spec: https://geoscoreai.com/openapi.json

## License

MIT
