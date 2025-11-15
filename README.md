# Bagman
**Version: 0.7.0b**  
*A unified overview of architecture, database rules, exchange integrations, deployment, and safety.*

---

## 1. Project Overview

This platform is a multi-provider crypto trading system combining:

- **Exchange integrations** (Coinbase, Kraken, Binance, Bybit, Simulation)  
- **Agent-safe order execution pipeline**  
- **LLM-powered analysis agents** with tool-based execution  
- **Technical indicators & portfolio analytics**  
- **Web3 wallet integration**  
- **Supabase-backed storage with full RLS isolation**

It supports both *manual* trading workflows and *agentic* LLM-driven strategies, with strict safeguards around live execution.

---

## 2. Architecture Summary

At a high level:

- **Backend:** Next.js API routes + Supabase/Postgres  
- **Frontend:** Next.js + React + SWR  
- **DB:** Structured with strong constraints, RLS, and tables for orders, executions, strategies, risk limits, connections  
- **LLM Agents:** Modular tool registry with validation, metadata, and handler separation  
- **Exchange Layer:** Provider → API family → environment → factory → client

---

## 3. LLM Agent Architecture

The LLM agent system uses a **modular, registry-based architecture** for tool execution.

### 3.1 Structure

```
lib/llm/
├── agent/
│   ├── executor.ts              # ToolRegistry class & ExecutionContext
│   └── tools/
│       ├── registry.ts          # buildToolRegistry() - wires tools to handlers
│       ├── types.ts             # LLMToolDefinition, validation helpers
│       ├── index.ts             # Central export (AGENT_TOOLS)
│       └── crypto/
│           ├── core.tools.ts    # 5 core crypto tools
│           └── price-context.tools.ts  # 2 price context tools
├── handlers/                    # Tool execution handlers
│   ├── cryptoAnalysis.ts
│   ├── indicatorCalculation.ts
│   ├── portfolioAnalysis.ts
│   ├── strategyManagement.ts
│   ├── priceAlerts.ts
│   └── priceContext.ts
└── agent-tools.ts               # ⚠️ DEPRECATED (legacy, can be removed)

app/api/v1/llm/
└── analyze/route.ts             # Main chat endpoint using registry
```

### 3.2 Tool Registry Pattern

Tools are registered via `buildToolRegistry()` which:
- Maps tool definitions to their execution handlers
- Provides automatic input validation (JSON Schema via Ajv)
- Supports metadata (category, tags, examples, auth requirements)
- Enables easy tool discovery and filtering

### 3.3 Available Tools

**Core Crypto Tools (5):**
1. `crypto_analysis` - Analyzes cryptocurrency price data using technical indicators
2. `calculate_indicator` - Calculate technical indicators on price data
3. `portfolio_analysis` - Analyze user's cryptocurrency portfolio (requires auth)
4. `manage_strategy` - Create, update, or check status of trading strategies (requires auth)
5. `manage_alerts` - Create and manage price alerts (requires auth)

**Price Context Tools (2):**
6. `ensure_price_context_for_question` - Prepare summarized price-history context
7. `search_price_windows` - Search within prepared price context for regimes/patterns

### 3.4 Data Flow

```
User Input (components/llm/agent-chat.tsx)
    ↓
POST /api/v1/llm/analyze
    ↓
OpenAI API (with tool definitions)
    ↓
Tool Registry (buildToolRegistry)
    ↓
Input Validation (JSON Schema)
    ↓
Handler Execution (lib/llm/handlers/*)
    ↓
Response with visualization
    ↓
Chart Visualization Context
```

### 3.5 Key Features

- **Input Validation:** Automatic JSON Schema validation before execution
- **Metadata-Driven:** Tools include category, tags, examples, auth requirements
- **Type Safety:** Full TypeScript support throughout
- **Modular Handlers:** Each tool has a dedicated handler file
- **Visualization Support:** Tools can return chart overlay data
- **Multi-Provider:** Supports both OpenAI and Anthropic tool formats

---

## 4. Exchange Model (Provider / API Family / Environment)

The platform models exchanges using **three orthogonal dimensions**.

### 4.1 Provider

The exchange provider (e.g., Coinbase, Kraken, Binance, Bybit).

### 4.2 API Family

The API type/version (e.g., REST, WebSocket, FIX).

### 4.3 Environment

The execution environment (e.g., `production`, `sandbox`, `simulation`).

This three-dimensional model allows flexible exchange integration while maintaining clear separation of concerns.

---

## 5. Development & Migration Status

### Completed Migrations

- ✅ **LLM Tool Structure:** Migrated from monolithic `agent-tools.ts` to modular registry pattern
- ✅ **Tool Registry:** Centralized tool-to-handler mapping with validation
- ✅ **Handler Extraction:** All handlers moved to dedicated files
- ✅ **Metadata System:** All tools annotated with category, tags, examples

### In Progress / Planned

- 🔄 **Price Context Implementation:** Full DB storage and embedding generation
- 📋 **Rate Limiting:** Per-tool rate limits using metadata
- 📋 **Auth Enforcement:** Automatic auth checks using `requiresAuth` flag
- 📋 **Conversation Persistence:** Store chat history in database

### Documentation

Active documentation and migration progress is tracked in:
- `docs/progress/` - Refactors, migrations, and incremental improvements

---

## 6. Getting Started

### Prerequisites

- Node.js 18+
- Supabase project with database schema
- OpenAI API key (for LLM features)
- Exchange API credentials (for trading features)

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
```

### Installation

```bash
npm install
npm run dev
```

---

## 7. Safety & Security

- **RLS (Row Level Security):** All database tables enforce user-scoped access
- **Read/Write Separation:** LLM tools are read-only by default; write operations require explicit auth
- **Input Validation:** All tool inputs are validated against JSON Schema
- **Environment Isolation:** Exchange connections support sandbox/simulation modes

---

## 8. License

[Add your license information here]
