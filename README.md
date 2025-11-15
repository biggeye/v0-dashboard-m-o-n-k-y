# Bagman
**Version: 0.7.5b**  
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
- **Frontend:** Next.js + React + SWR + Framer Motion  
- **DB:** Structured with strong constraints, RLS, and tables for orders, executions, strategies, risk limits, connections, price history, tokens, user assets  
- **LLM Agents:** Modular tool registry with validation, metadata, and handler separation  
- **Exchange Layer:** Provider → API family → environment → factory → client
- **Domain Organization:** Domain-driven design with dedicated namespaces for exchanges, LLM, Web3, visualization, providers

### 2.1 Domain Architecture

The codebase follows a **domain-driven design** pattern with clear separation of concerns:

```
lib/
├── exchanges/          # Exchange integration layer
├── llm/               # LLM agent system (tools, handlers, executor)
├── web3/              # Web3 wallet integration
│   ├── wallets/       # Wallet connection & management
│   ├── transactions/  # Transaction operations
│   └── assets/        # ERC20 token discovery & management
├── visualization/     # Chart visualization system
│   ├── store/         # React context for state
│   ├── generators.ts  # Overlay generation functions
│   └── service.ts     # Transformation layer
├── providers/         # External data provider integrations
│   └── finnhub.ts     # Finnhub price data provider
└── services/          # Business logic services
    ├── price-service.ts
    ├── token-service.ts
    └── token-price-service.ts
```

This organization ensures:
- **Clear boundaries** between domains
- **Predictable file locations** for maintainability
- **Reusable components** across the platform
- **Type safety** throughout with TypeScript

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

## 5. Price Tracking & Token Management

### 5.1 Price Data Infrastructure

- **Provider Integration:** Finnhub API for real-time and historical price data
- **Storage:** Normalized price history with 5-minute interval rounding
- **Gap Detection:** Automatic detection of missing price intervals
- **Backfilling:** Intelligent backfilling with subscription-gated historical data
- **Timeframe Support:** 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1mo

### 5.2 Token Management

- **Token Index:** Master registry of trackable tokens
- **User Assets:** User-selected tokens with activation workflow
- **Discovery System:** Automatic ERC20 token discovery from connected wallets
- **Admin Approval:** Workflow for approving discovered tokens
- **Price Collection:** Automated price tracking for active tokens

### 5.3 Progressive Loading

- **Smart Strategy:** Progressive loading for large datasets (daily/weekly/monthly views)
- **Bottleneck Management:** Request throttling, data size safety checks, duplicate prevention
- **Performance:** Optimized for both real-time minute views and historical monthly views

## 6. Web3 Wallet Integration

### 6.1 Domain Structure

The Web3 system is organized into three domains:

- **Wallets** (`lib/web3/wallets/`): Connection management, chain switching, MetaMask/Coinbase Wallet support
- **Transactions** (`lib/web3/transactions/`): Transaction sending, gas estimation, receipt handling
- **Assets** (`lib/web3/assets/`): ERC20 token discovery, user asset management, activation workflow

### 6.2 Features

- **Multi-Chain Support:** Ethereum, BNB Chain, Polygon, Arbitrum, Optimism
- **Token Discovery:** Automatic ERC20 token detection from wallet balances
- **Asset Management:** User-selected tokens with price chart integration
- **Admin Workflow:** Approval system for discovered tokens
- **Price Integration:** Discovered tokens automatically tracked in price system

## 7. Visualization System

### 7.1 Architecture

The visualization system (`lib/visualization/`) provides:

- **State Management:** React context for chart overlay state
- **Generators:** Factory functions for creating overlays (SMA, EMA, Bollinger Bands, entry/exit markers)
- **Service Layer:** Transformation from handler responses to visualizations
- **Integration:** Seamless integration with LLM agent responses

### 7.2 Features

- **Indicator Overlays:** SMA, EMA, Bollinger Bands with full array calculation
- **Strategy Visualization:** Complete strategy overlays with entry/exit points
- **LLM Integration:** Automatic visualization from agent tool responses
- **Chart Integration:** Real-time overlay management on price charts

## 8. Trading Page Architecture

### 8.1 Hook-Based Data Management

The trading page leverages centralized hooks for data fetching:

- `usePriceHistory()` - Chart and indicator data with intelligent refresh
- `useCryptoPrices()` - Watchlist price management
- `usePortfolioValue()` - Real-time portfolio tracking
- `useChartVisualization()` - Chart overlays from LLM agent

### 8.2 Features

- **Timeframe Selector:** Synchronized across chart and indicators
- **Portfolio Display:** Real-time value and PnL tracking
- **AI Assistant:** Integrated chat interface for analysis
- **Watchlist Management:** Dynamic symbol management with quick actions

## 9. Development & Migration Status

### Completed Migrations

- ✅ **LLM Tool Structure:** Migrated from monolithic `agent-tools.ts` to modular registry pattern
- ✅ **Tool Registry:** Centralized tool-to-handler mapping with validation
- ✅ **Handler Extraction:** All handlers moved to dedicated files
- ✅ **Metadata System:** All tools annotated with category, tags, examples
- ✅ **Visualization Domain:** Refactored into dedicated namespace with integrated generators
- ✅ **Web3 Domain:** Separated into wallets, transactions, and assets domains
- ✅ **Provider Namespace:** Established `lib/providers/` for external data integrations
- ✅ **Price Tracking:** Comprehensive system with gap detection and backfilling
- ✅ **Token Management:** User asset system with discovery and approval workflow
- ✅ **Trading Page:** Streamlined with hook-based data management
- ✅ **Type Safety:** Fixed ExchangeConnection types and server-only import issues
- ✅ **Build Fixes:** Resolved dynamic route and motion import issues

### In Progress / Planned

- 🔄 **Price Context Implementation:** Full DB storage and embedding generation
- 📋 **Rate Limiting:** Per-tool rate limits using metadata
- 📋 **Auth Enforcement:** Automatic auth checks using `requiresAuth` flag
- 📋 **Conversation Persistence:** Store chat history in database
- 📋 **Chat Interface Enhancements:** Fullscreen toggle, tools visibility, chart controls

---

## 10. Getting Started

### Prerequisites

- Node.js 18+
- Supabase project with database schema
- OpenAI API key (for LLM features)
- Exchange API credentials (for trading features)

### Environment Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# LLM (Required for agent features)
OPENAI_API_KEY=your_openai_key

# Price Data (Required for price tracking)
FINNHUB_API_KEY=your_finnhub_api_key

# Price Backfilling (Optional - requires paid Finnhub subscription)
FINNHUB_SUBSCRIPTION_ENABLED=false
```

### Installation

```bash
npm install
npm run dev
```

---

## 11. Safety & Security

- **RLS (Row Level Security):** All database tables enforce user-scoped access
- **Read/Write Separation:** LLM tools are read-only by default; write operations require explicit auth
- **Input Validation:** All tool inputs are validated against JSON Schema
- **Environment Isolation:** Exchange connections support sandbox/simulation modes

---

## 12. Technical Implementation Details

### 12.1 Type Safety

- **TypeScript:** Full type coverage with strict mode
- **Type Definitions:** Centralized in `lib/types/`
- **Server/Client Separation:** Explicit `server-only` markers for server-side code
- **Barrel Exports:** Type-only exports to prevent server code in client bundles

### 12.2 Build Configuration

- **Dynamic Routes:** API routes using authentication marked as `force-dynamic`
- **Static Generation:** Properly configured for pages that can be pre-rendered
- **Import Patterns:** Standardized animation library imports (framer-motion)

### 12.3 Code Quality

- **Domain-Driven Design:** Clear domain boundaries and separation of concerns
- **Single Responsibility:** Each module has a focused purpose
- **DRY Principle:** Eliminated duplicate code through shared services and hooks
- **Consistent Patterns:** Predictable file structure and naming conventions

## 13. License

[Add your license information here]
