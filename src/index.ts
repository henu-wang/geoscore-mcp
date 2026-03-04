#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = "https://api.geoscoreai.com";

// =====================================================
// Tool Definitions (expanded from 3 to 8)
// =====================================================

const tools: Tool[] = [
  {
    name: "geo_scan",
    description:
      "Scan a website for AI search (GEO) readiness. Returns a score (0-100), grade (A-F), and 11 technical checks covering robots.txt, llms.txt, structured data, meta tags, content structure, sitemap, HTTP headers, content quality, internal linking, AI crawl access, and citation value. Each check includes specific issues found and actionable fix suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "Domain to scan (e.g. 'example.com')",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "geo_deep_scan",
    description:
      "Deep scan a domain with full pro-level analysis. Returns everything from geo_scan plus: complete implementation markdown, AI-generated llms.txt, Schema.org JSON-LD fixes, meta tag optimizations, GEO value model with business insights, human-readable report, and 14-day sprint plan. Requires an API key with Pro plan or higher.",
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "Domain to deep scan (e.g. 'example.com')",
        },
        api_key: {
          type: "string",
          description: "GEOScore API key (Pro plan required). Get one at https://geoscoreai.com/api-keys",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "geo_generate_fix",
    description:
      "Generate ready-to-use fix code for a specific GEO issue. Scans the domain and generates the fix file content that can be directly written to the project. Fix types: 'llms_txt' (generate llms.txt file), 'schema' (JSON-LD structured data), 'meta' (meta tag improvements), 'robots' (AI-friendly robots.txt), 'sitemap' (XML sitemap guide).",
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "Domain to generate fix for (e.g. 'example.com')",
        },
        fix_type: {
          type: "string",
          enum: ["llms_txt", "schema", "meta", "robots", "sitemap"],
          description: "Type of fix to generate",
        },
        api_key: {
          type: "string",
          description: "GEOScore API key. Get one at https://geoscoreai.com/api-keys",
        },
      },
      required: ["domain", "fix_type"],
    },
  },
  {
    name: "geo_get_profile",
    description:
      "Get a domain's GEO score history and profile. Returns the latest score, best score, total scan count, first/last scanned dates, and site metadata. Useful for tracking improvements over time.",
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "Domain to look up (e.g. 'example.com')",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "geo_compare",
    description:
      "Compare two domains' GEO readiness scores side by side. Returns both domain profiles with scores, grades, and metadata for direct comparison. Useful for competitive analysis.",
    inputSchema: {
      type: "object",
      properties: {
        domain1: {
          type: "string",
          description: "First domain (e.g. 'example.com')",
        },
        domain2: {
          type: "string",
          description: "Second domain (e.g. 'competitor.com')",
        },
      },
      required: ["domain1", "domain2"],
    },
  },
  {
    name: "geo_check_visibility",
    description:
      "Check if a domain is being cited by AI search engines (ChatGPT, Perplexity, Claude). Tests brand-related queries against multiple AI engines and reports citation status. Requires Pro API key.",
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "Domain to check visibility for",
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Custom search queries to test. If empty, auto-generates brand queries.",
        },
        api_key: {
          type: "string",
          description: "GEOScore API key (Pro plan required)",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "geo_get_report",
    description:
      "Retrieve a previously saved GEO scan report by its report ID. Returns the full report data including domain, score, grade, and all check details.",
    inputSchema: {
      type: "object",
      properties: {
        report_id: {
          type: "string",
          description: "The unique report ID (e.g. 'abc123')",
        },
      },
      required: ["report_id"],
    },
  },
  {
    name: "geo_create_api_key",
    description:
      "Create a free GEOScore API key for programmatic access. Free keys allow 10 scans/day. Returns the API key that can be used with other geo_ tools.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "A name for this API key (e.g. 'my-project')",
        },
      },
    },
  },
];

// =====================================================
// API Helpers
// =====================================================

function getHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function apiPost(
  path: string,
  body: Record<string, unknown>,
  apiKey?: string
): Promise<unknown> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GEOScore API error ${response.status}: ${text}`);
  }
  return response.json();
}

async function apiGet(path: string, apiKey?: string): Promise<unknown> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: getHeaders(apiKey),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GEOScore API error ${response.status}: ${text}`);
  }
  return response.json();
}

// =====================================================
// Response Formatters
// =====================================================

function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

interface CheckItem {
  name: string;
  score: number;
  max_score: number;
  status: string;
  issues?: string[];
  suggestions?: string[];
}

interface ScanResponse {
  code?: number;
  data?: {
    domain: string;
    score: number;
    grade: string;
    checks: CheckItem[];
    markdown?: string;
    llms_txt?: string;
    schema_fixes?: Array<{ page_url: string; schema_type: string; code: string; reason: string }>;
    meta_fixes?: Array<{ page_url: string; title?: string; description?: string }>;
    geo_insights?: Record<string, unknown>;
    human_report?: Record<string, unknown>;
  };
  message?: string;
}

function formatScanResult(raw: unknown): string {
  const res = raw as ScanResponse;
  if (res.code && res.code !== 200) {
    return `Error: ${res.message || "Scan failed"}`;
  }

  const data = res.data || (raw as ScanResponse["data"]);
  if (!data) {
    return `Error: No scan data returned`;
  }

  const lines: string[] = [];
  lines.push(`# GEO Scan Report: ${data.domain}`);
  lines.push(`**Score: ${data.score}/100 (Grade: ${data.grade})**`);
  lines.push("");

  if (data.checks && Array.isArray(data.checks)) {
    lines.push("## Check Results");
    lines.push("");
    for (const check of data.checks) {
      const icon = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
      lines.push(`### [${icon}] ${check.name} (${check.score}/${check.max_score})`);
      if (check.issues && check.issues.length > 0) {
        lines.push("Issues:");
        for (const issue of check.issues) {
          lines.push(`  - ${issue}`);
        }
      }
      if (check.suggestions && check.suggestions.length > 0) {
        lines.push("Suggestions:");
        for (const suggestion of check.suggestions) {
          lines.push(`  - ${suggestion}`);
        }
      }
      lines.push("");
    }
  }

  // Include generated content if available (deep scan)
  if (data.llms_txt) {
    lines.push("## Generated llms.txt");
    lines.push("```");
    lines.push(data.llms_txt);
    lines.push("```");
    lines.push("");
  }

  if (data.schema_fixes && data.schema_fixes.length > 0) {
    lines.push("## Schema.org Fixes");
    for (const fix of data.schema_fixes) {
      lines.push(`### ${fix.page_url} (${fix.schema_type})`);
      lines.push(`Reason: ${fix.reason}`);
      lines.push("```json");
      lines.push(fix.code);
      lines.push("```");
      lines.push("");
    }
  }

  if (data.markdown) {
    lines.push("## Full Implementation Report");
    lines.push(data.markdown);
    lines.push("");
  }

  lines.push(`> Full report: https://geoscoreai.com/site/${encodeURIComponent(data.domain)}`);
  return lines.join("\n");
}

interface FixResponse {
  code?: number;
  data?: {
    domain: string;
    fix_type: string;
    file_name: string;
    content: string;
    guide: string;
  };
  message?: string;
}

function formatFixResult(raw: unknown): string {
  const res = raw as FixResponse;
  if (res.code && res.code !== 200) {
    return `Error: ${res.message || "Fix generation failed"}`;
  }

  const data = res.data || (raw as FixResponse["data"]);
  if (!data) {
    return "Error: No fix data returned";
  }

  const lines: string[] = [];
  lines.push(`# GEO Fix: ${data.fix_type} for ${data.domain}`);
  lines.push("");
  lines.push(`## File: ${data.file_name}`);
  lines.push("");
  lines.push("```");
  lines.push(data.content);
  lines.push("```");
  lines.push("");
  lines.push("## Implementation Guide");
  lines.push(data.guide);

  return lines.join("\n");
}

interface ProfileResponse {
  code?: number;
  data?: {
    domain: string;
    latest_score: number;
    grade: string;
    best_score: number;
    scan_count: number;
    first_scanned: string;
    last_scanned: string;
    meta_title?: string;
    meta_description?: string;
  };
  message?: string;
}

function formatProfileResult(raw: unknown): string {
  const res = raw as ProfileResponse;
  if (res.code && res.code !== 200) {
    return `Error: ${res.message || "Profile lookup failed"}`;
  }

  const data = res.data || (raw as ProfileResponse["data"]);
  if (!data) {
    return "Error: No profile data found for this domain.";
  }

  const lines: string[] = [];
  lines.push(`# GEO Profile: ${data.domain}`);
  lines.push("");
  lines.push(`- **Latest Score**: ${data.latest_score}/100 (${data.grade})`);
  lines.push(`- **Best Score**: ${data.best_score}/100`);
  lines.push(`- **Total Scans**: ${data.scan_count}`);
  lines.push(`- **First Scanned**: ${data.first_scanned}`);
  lines.push(`- **Last Scanned**: ${data.last_scanned}`);
  if (data.meta_title) lines.push(`- **Title**: ${data.meta_title}`);
  if (data.meta_description) lines.push(`- **Description**: ${data.meta_description}`);
  lines.push("");
  lines.push(`> View full profile: https://geoscoreai.com/site/${encodeURIComponent(data.domain)}`);

  return lines.join("\n");
}

interface CompareResponse {
  code?: number;
  data?: {
    domain1: ProfileResponse["data"];
    domain2: ProfileResponse["data"];
  };
  message?: string;
}

function formatCompareResult(raw: unknown): string {
  const res = raw as CompareResponse;
  if (res.code && res.code !== 200) {
    return `Error: ${res.message || "Comparison failed"}`;
  }

  const data = res.data || (raw as CompareResponse["data"]);
  if (!data || !data.domain1 || !data.domain2) {
    return "Error: Could not compare these domains.";
  }

  const d1 = data.domain1;
  const d2 = data.domain2;

  const lines: string[] = [];
  lines.push(`# GEO Comparison: ${d1.domain} vs ${d2.domain}`);
  lines.push("");
  lines.push(`| Metric | ${d1.domain} | ${d2.domain} |`);
  lines.push(`|--------|${"-".repeat(d1.domain.length + 2)}|${"-".repeat(d2.domain.length + 2)}|`);
  lines.push(`| Latest Score | ${d1.latest_score}/100 (${d1.grade}) | ${d2.latest_score}/100 (${d2.grade}) |`);
  lines.push(`| Best Score | ${d1.best_score}/100 | ${d2.best_score}/100 |`);
  lines.push(`| Total Scans | ${d1.scan_count} | ${d2.scan_count} |`);
  lines.push(`| Last Scanned | ${d1.last_scanned} | ${d2.last_scanned} |`);
  lines.push("");

  const diff = d1.latest_score - d2.latest_score;
  if (diff > 0) {
    lines.push(`**${d1.domain}** leads by ${diff} points.`);
  } else if (diff < 0) {
    lines.push(`**${d2.domain}** leads by ${Math.abs(diff)} points.`);
  } else {
    lines.push("Both domains have the same score.");
  }
  lines.push("");
  lines.push(`> Compare online: https://geoscoreai.com/site/${encodeURIComponent(d1.domain)}/vs/${encodeURIComponent(d2.domain)}`);

  return lines.join("\n");
}

interface VisibilityResponse {
  code?: number;
  data?: {
    domain: string;
    citations: Array<{
      query: string;
      engine: string;
      cited: boolean;
      position: number;
      snippet: string;
    }>;
    summary: string;
  };
  message?: string;
}

function formatVisibilityResult(raw: unknown): string {
  const res = raw as VisibilityResponse;
  if (res.code && res.code !== 200) {
    return `Error: ${res.message || "Visibility check failed"}`;
  }

  const data = res.data || (raw as VisibilityResponse["data"]);
  if (!data) {
    return "Error: No visibility data returned";
  }

  const lines: string[] = [];
  lines.push(`# AI Visibility Report: ${data.domain}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(data.summary);
  lines.push("");

  if (data.citations && data.citations.length > 0) {
    lines.push("## Citation Results");
    lines.push("");
    lines.push("| Query | Engine | Cited | Position |");
    lines.push("|-------|--------|-------|----------|");
    for (const c of data.citations) {
      lines.push(`| ${c.query} | ${c.engine} | ${c.cited ? "Yes" : "No"} | ${c.position || "N/A"} |`);
    }
  }

  return lines.join("\n");
}

interface ApiKeyResponse {
  code?: number;
  data?: {
    api_key: string;
    name: string;
    plan: string;
    daily_limit: number;
    monthly_limit: number;
  };
  message?: string;
}

function formatApiKeyResult(raw: unknown): string {
  const res = raw as ApiKeyResponse;
  if (res.code && res.code !== 200) {
    return `Error: ${res.message || "API key creation failed"}`;
  }

  const data = res.data || (raw as ApiKeyResponse["data"]);
  if (!data) {
    return "Error: Failed to create API key";
  }

  const lines: string[] = [];
  lines.push("# GEOScore API Key Created");
  lines.push("");
  lines.push(`**API Key**: \`${data.api_key}\``);
  lines.push(`**Name**: ${data.name}`);
  lines.push(`**Plan**: ${data.plan}`);
  lines.push(`**Daily Limit**: ${data.daily_limit} calls`);
  lines.push(`**Monthly Limit**: ${data.monthly_limit} calls`);
  lines.push("");
  lines.push("Save this API key securely. Use it with `geo_deep_scan`, `geo_generate_fix`, and `geo_check_visibility` tools.");
  lines.push("");
  lines.push("To use in MCP config, set the GEOSCORE_API_KEY environment variable.");

  return lines.join("\n");
}

// =====================================================
// Tool Handler
// =====================================================

async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const apiKey = (args.api_key as string) || process.env.GEOSCORE_API_KEY || "";

  switch (name) {
    case "geo_scan": {
      const domain = normalizeDomain(args.domain as string);
      const result = apiKey
        ? await apiPost("/api/v1/agent/scan", { domain }, apiKey)
        : await apiPost("/api/v1/geo/check", { domain });
      return formatScanResult(result);
    }

    case "geo_deep_scan": {
      const domain = normalizeDomain(args.domain as string);
      if (!apiKey) {
        return "Error: Deep scan requires an API key. Use geo_create_api_key to get one, or set GEOSCORE_API_KEY environment variable.";
      }
      const result = await apiPost("/api/v1/agent/scan/deep", { domain }, apiKey);
      return formatScanResult(result);
    }

    case "geo_generate_fix": {
      const domain = normalizeDomain(args.domain as string);
      const fixType = args.fix_type as string;
      if (!apiKey) {
        return "Error: Fix generation requires an API key. Use geo_create_api_key to get one.";
      }
      const result = await apiPost(
        "/api/v1/agent/fix/generate",
        { domain, fix_type: fixType },
        apiKey
      );
      return formatFixResult(result);
    }

    case "geo_get_profile": {
      const domain = normalizeDomain(args.domain as string);
      const result = await apiGet(`/api/v1/geo/site/${encodeURIComponent(domain)}`);
      return formatProfileResult(result);
    }

    case "geo_compare": {
      const d1 = normalizeDomain(args.domain1 as string);
      const d2 = normalizeDomain(args.domain2 as string);
      const result = await apiGet(
        `/api/v1/geo/site/${encodeURIComponent(d1)}/vs/${encodeURIComponent(d2)}`
      );
      return formatCompareResult(result);
    }

    case "geo_check_visibility": {
      const domain = normalizeDomain(args.domain as string);
      if (!apiKey) {
        return "Error: Visibility check requires a Pro API key. Use geo_create_api_key first.";
      }
      const queries = (args.queries as string[]) || [];
      const result = await apiPost(
        "/api/v1/agent/visibility/check",
        { domain, queries },
        apiKey
      );
      return formatVisibilityResult(result);
    }

    case "geo_get_report": {
      const reportId = args.report_id as string;
      const result = await apiGet(`/api/v1/geo/report/get?report_id=${encodeURIComponent(reportId)}`);
      return formatScanResult(result);
    }

    case "geo_create_api_key": {
      const name = (args.name as string) || "mcp-client";
      const result = await apiPost("/api/v1/agent/keys/create", { name });
      return formatApiKeyResult(result);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// =====================================================
// MCP Resources
// =====================================================

const GEO_GUIDES: Record<string, { name: string; description: string; content: string }> = {
  "what-is-geo": {
    name: "What is GEO?",
    description: "Introduction to Generative Engine Optimization",
    content: `# What is GEO (Generative Engine Optimization)?

GEO is the practice of optimizing websites to be discovered, understood, and cited by AI search engines like ChatGPT, Perplexity, Claude, and Google AI Overviews.

## Why GEO Matters
- AI search engines are replacing traditional search for many queries
- If your content isn't AI-friendly, it won't be cited in AI responses
- GEO complements traditional SEO, it doesn't replace it

## Key GEO Signals
1. **robots.txt** - Allow AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
2. **llms.txt** - Machine-readable site description for LLMs
3. **Structured Data** - Schema.org JSON-LD for entity understanding
4. **Content Quality** - Authoritative, citable, well-structured content
5. **Meta Tags** - Clear titles and descriptions for AI extraction

## Getting Started
Use GEOScore to scan your site and identify specific improvements.`,
  },
  "llms-txt": {
    name: "llms.txt Guide",
    description: "How to create an effective llms.txt file",
    content: `# llms.txt Guide

llms.txt is a file placed at your website root that helps LLMs understand your site.

## Format (llmstxt.org standard)
\`\`\`
# Site Name
> One-line description of your site

## Section
- [Page Title](URL): Brief description
\`\`\`

## Best Practices
1. Keep it under 500 lines
2. List your most important pages first
3. Use clear, descriptive link text
4. Update when you add/remove important pages
5. Include API docs if you have them

## Example
\`\`\`
# Acme Corp
> Enterprise cloud infrastructure platform

## Products
- [Compute Engine](https://acme.com/compute): Scalable virtual machines
- [Object Storage](https://acme.com/storage): S3-compatible storage

## Documentation
- [Getting Started](https://acme.com/docs/start): Quick start guide
- [API Reference](https://acme.com/docs/api): REST API documentation
\`\`\``,
  },
  "schema-for-ai": {
    name: "Schema.org for AI",
    description: "Using structured data to improve AI discoverability",
    content: `# Schema.org Structured Data for AI Search

## Why Structured Data Matters for GEO
AI engines use Schema.org markup to understand entities, relationships, and facts on your pages.

## Most Impactful Schema Types
1. **Organization** - Company info, logo, social profiles
2. **WebSite** - Site-level search action
3. **Article/BlogPosting** - Content with author, date, publisher
4. **FAQPage** - Q&A content (highly citable by AI)
5. **HowTo** - Step-by-step instructions
6. **Product** - Product details, pricing, reviews

## Implementation
Add JSON-LD in your page \`<head>\`:
\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is GEO?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "GEO is Generative Engine Optimization..."
    }
  }]
}
</script>
\`\`\``,
  },
  "robots-for-ai": {
    name: "robots.txt for AI Crawlers",
    description: "Configure robots.txt to allow AI search engine access",
    content: `# robots.txt for AI Crawlers

## AI Crawler User Agents
- GPTBot (OpenAI/ChatGPT)
- ChatGPT-User (ChatGPT browsing)
- Google-Extended (Google AI)
- PerplexityBot (Perplexity)
- ClaudeBot (Anthropic/Claude)
- Applebot-Extended (Apple Intelligence)
- cohere-ai (Cohere)

## Recommended robots.txt
\`\`\`
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://yoursite.com/sitemap.xml
\`\`\`

## Common Mistakes
- Blocking all bots with \`Disallow: /\`
- Not listing AI-specific user agents
- Missing Sitemap directive`,
  },
};

// =====================================================
// MCP Prompts
// =====================================================

const PROMPTS = {
  "geo-optimize": {
    name: "geo-optimize",
    description:
      "Complete GEO optimization workflow: scan a domain, analyze issues, generate fixes, and apply them to the project.",
    arguments: [
      {
        name: "domain",
        description: "The domain to optimize (e.g. 'example.com')",
        required: true,
      },
    ],
  },
  "geo-audit": {
    name: "geo-audit",
    description:
      "Perform a comprehensive GEO audit and generate a report with prioritized recommendations.",
    arguments: [
      {
        name: "domain",
        description: "The domain to audit",
        required: true,
      },
    ],
  },
  "geo-compare": {
    name: "geo-compare",
    description: "Compare your site's GEO readiness against a competitor.",
    arguments: [
      {
        name: "your_domain",
        description: "Your domain",
        required: true,
      },
      {
        name: "competitor_domain",
        description: "Competitor's domain",
        required: true,
      },
    ],
  },
};

// =====================================================
// MCP Server Setup
// =====================================================

const server = new Server(
  {
    name: "geoscore-mcp",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, args as Record<string, unknown>);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

// Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: Object.entries(GEO_GUIDES).map(([key, guide]) => ({
    uri: `geoscore://guides/${key}`,
    name: guide.name,
    description: guide.description,
    mimeType: "text/markdown",
  })),
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const match = uri.match(/^geoscore:\/\/guides\/(.+)$/);
  if (!match || !GEO_GUIDES[match[1]]) {
    throw new Error(`Resource not found: ${uri}`);
  }
  const guide = GEO_GUIDES[match[1]];
  return {
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: guide.content,
      },
    ],
  };
});

// Prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: Object.values(PROMPTS),
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "geo-optimize": {
      const domain = args?.domain || "example.com";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `I want to optimize my website ${domain} for AI search engines (GEO optimization). Please follow this workflow:

1. **Scan**: Use geo_scan to analyze ${domain} and identify all GEO issues
2. **Prioritize**: Review the results and identify the top 3 most impactful fixes
3. **Generate Fixes**: For each priority issue, use geo_generate_fix to create the fix code:
   - If robots.txt needs fixing: fix_type="robots"
   - If llms.txt is missing: fix_type="llms_txt"
   - If Schema.org is missing: fix_type="schema"
   - If meta tags need work: fix_type="meta"
4. **Apply**: Write the generated fix files to my project
5. **Verify**: Explain what was changed and what the expected score improvement is

Start by scanning ${domain} now.`,
            },
          },
        ],
      };
    }

    case "geo-audit": {
      const domain = args?.domain || "example.com";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Perform a comprehensive GEO audit for ${domain}:

1. Use geo_scan to get the current GEO readiness score
2. Analyze each of the 11 checks and categorize issues by severity
3. Create a prioritized action plan with estimated impact
4. For the top 3 issues, provide specific implementation guidance
5. Summarize findings in a clear report format

Begin the audit now.`,
            },
          },
        ],
      };
    }

    case "geo-compare": {
      const yourDomain = args?.your_domain || "example.com";
      const competitorDomain = args?.competitor_domain || "competitor.com";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Compare GEO readiness between my site (${yourDomain}) and competitor (${competitorDomain}):

1. Use geo_compare to get side-by-side scores
2. Use geo_scan on both domains for detailed check-level comparison
3. Identify where the competitor is stronger and where I have advantages
4. Recommend specific actions to close gaps and build on strengths
5. Prioritize by impact and effort

Start the comparison now.`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// =====================================================
// Main
// =====================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
