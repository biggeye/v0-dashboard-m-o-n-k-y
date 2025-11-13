# Cryptocurrency Trading Algorithm Dashboard

## Project Overview

This is a comprehensive Next.js-based crypto trading dashboard with real-time price data integration, technical indicator analysis, and AI-powered LLM agent integration for intelligent trading insights.

### Key Features

- **Real-time Price Data**: Integrates with Finnhub API for cryptocurrency price feeds
- **Technical Indicators**: SMA, EMA, RSI, MACD, Bollinger Bands, ATR calculations
- **LLM Agent Integration**: AI assistants with tool calling capabilities for analysis
- **Portfolio Management**: Track holdings and calculate portfolio metrics
- **Strategy Builder**: Create and manage trading strategies with multiple indicators
- **Price Alerts**: Set up notifications for price thresholds
- **Secure Authentication**: Supabase-based user management with Row Level Security

## Architecture

### Technology Stack

- **Frontend**: Next.js 14, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Server Components
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Real-time Data**: Finnhub API
- **LLM Integration**: Compatible with OpenAI, Anthropic, and other providers
- **Data Fetching**: SWR for client-side caching

### Database Schema

\`\`\`
- price_history: Stores cryptocurrency price data (public, no user_id)
- trading_strategies: User trading strategies with indicators
- portfolio_holdings: User cryptocurrency holdings
- price_alerts: Price threshold alerts for users
- user_profiles: User profile data linked to auth.users
\`\`\`

## Setup Instructions

### 1. Install Dependencies

The project uses automatic dependency detection in the v0 "Next.js" runtime. Key packages include:
- `@supabase/ssr` for database access
- `recharts` for charting
- `lucide-react` for icons
- `swr` for data fetching

### 2. Configure Environment Variables

Required variables (set in Vercel project or .env.local):

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

### 3. Initialize Database

The SQL scripts in `/scripts` set up:

**scripts/001_create_crypto_tables.sql**:
- `price_history` table with indexes
- `trading_strategies` with user reference
- `portfolio_holdings` for tracking
- `price_alerts` for notifications

**scripts/002_create_user_profiles.sql**:
- `user_profiles` table linked to auth.users
- Auto-create trigger on signup

**How to run**: Execute these scripts in Supabase SQL Editor or use the scripts UI in v0.

### 4. Middleware Configuration

The `middleware.ts` file handles:
- Token refresh and session management
- Route protection for authenticated pages
- Automatic redirection to login for protected routes

## API Endpoints

### Price Data
- `GET /api/crypto/price?symbol=BTC` - Fetch price history for a symbol
- `POST /api/crypto/price` - Store new price data

### Technical Indicators
- `POST /api/crypto/indicators` - Calculate indicators
  - Supported: `sma`, `ema`, `rsi`, `macd`, `bollinger`, `atr`

### Portfolio Management
- `GET /api/portfolio/holdings` - List user holdings
- `POST /api/portfolio/holdings` - Add/update holding
- `DELETE /api/portfolio/holdings/[id]` - Remove holding

### Trading Strategies
- `GET /api/strategies` - List user strategies
- `POST /api/strategies` - Create new strategy
- `PATCH /api/strategies/[id]` - Update strategy
- `DELETE /api/strategies/[id]` - Delete strategy

### LLM Integration
- `POST /api/llm/analyze` - Execute LLM tools
  - Tools: `crypto_analysis`, `calculate_indicator`, `portfolio_analysis`, `manage_strategy`, `manage_alerts`

## Component Structure

### Dashboard Components

**`components/crypto/price-chart.tsx`**
- Area chart displaying price trends
- Real-time price updates with SWR
- Change percentage indicators

**`components/crypto/price-ticker.tsx`**
- Market overview with multiple symbols
- Percentage change badges
- Watchlist management

**`components/crypto/indicator-display.tsx`**
- Technical indicator calculator UI
- Dropdown selector for indicators
- Real-time calculation results

**`components/admin/portfolio-manager.tsx`**
- Add/remove cryptocurrency holdings
- Portfolio value summary
- Holdings table with performance metrics

**`components/admin/strategy-builder.tsx`**
- Create trading strategies
- Select multiple indicators
- Activate/deactivate strategies
- Strategy management

**`components/llm/agent-chat.tsx`**
- Chat interface for AI assistant
- Message history
- Tool execution feedback

## Technical Indicator Implementations

### SMA (Simple Moving Average)
- Calculates average price over period
- Category: Trend
- Default period: 20

### EMA (Exponential Moving Average)
- Weighted average giving more weight to recent prices
- Category: Trend
- Default period: 12

### RSI (Relative Strength Index)
- Momentum indicator (0-100)
- Overbought: > 70, Oversold: < 30
- Category: Momentum
- Default period: 14

### MACD (Moving Average Convergence Divergence)
- Trend-following momentum indicator
- Returns MACD line, signal line, histogram
- Category: Trend

### Bollinger Bands
- Volatility bands around moving average
- Returns upper, middle (SMA), lower bands
- Category: Volatility
- Default: period 20, std dev 2

### ATR (Average True Range)
- Volatility indicator
- Measures price range
- Category: Volatility
- Default period: 14

## LLM Agent Integration

### Tool System

Agents can call the following tools through `/api/llm/analyze`:

1. **crypto_analysis**
   - Analyzes price trends using multiple indicators
   - Types: price_trend, volatility, momentum, support_resistance, comprehensive

2. **calculate_indicator**
   - Calculates any technical indicator
   - Returns values for LLM analysis

3. **portfolio_analysis**
   - Analyzes user portfolio allocation and risk
   - Suggestions: allocation, performance, risk, rebalance

4. **manage_strategy**
   - Create/update/activate trading strategies
   - Actions: create, update, activate, deactivate, delete, list

5. **manage_alerts**
   - Create and manage price alerts
   - Actions: create, list, delete, update

### Integration Steps

1. **With OpenAI**:
   \`\`\`typescript
   import { toOpenAITools } from "@/lib/llm/agent-tools";
   const tools = toOpenAITools();
   // Pass to OpenAI function calling API
   \`\`\`

2. **With Anthropic**:
   \`\`\`typescript
   import { toAnthropicTools } from "@/lib/llm/agent-tools";
   const tools = toAnthropicTools();
   // Pass to Anthropic tools API
   \`\`\`

3. **Custom Integration**:
   \`\`\`typescript
   import { AGENT_TOOLS } from "@/lib/llm/agent-tools";
   // Access full tool definitions
   \`\`\`

## Security Considerations

### Row Level Security (RLS)
- All user data is protected with RLS policies
- Users can only access their own strategies, holdings, and alerts
- Public price_history table is readable by all authenticated users

### API Authentication
- All endpoints require authenticated user context
- Supabase client validates session via middleware
- Email confirmation required for account access

### Data Protection
- User API keys stored as hashes only
- No sensitive data in client-side state
- CSRF protection through Next.js middleware

## Scaling & Future Extensions

### Data Storage
- Price history can be archived to cold storage after retention period
- Consider time-series database (InfluxDB, TimescaleDB) for high-volume data

### Real-time Updates
- WebSocket integration for live price streaming
- Supabase Realtime for strategy updates
- Server-sent events for alert notifications

### Additional Indicators
- Ichimoku Cloud
- Stochastic Oscillator
- Volume-weighted indicators
- Custom user-defined indicators

### AI Features
- Automated backtesting with LLM analysis
- Sentiment analysis from on-chain data
- Predictive models for price movements
- Risk assessment algorithms

### Platform Expansion
- Mobile app integration
- Discord bot for alerts
- Email notifications
- Webhook integrations

## Troubleshooting

### Common Issues

1. **"RLS policy blocked"**
   - User email not confirmed after signup
   - Middleware not properly refreshing session
   - Solution: Confirm email and refresh browser

2. **No price data loading**
   - Finnhub API rate limits reached
   - Invalid symbol format
   - Solution: Check API limits, use correct symbol codes

3. **Portfolio holdings not saving**
   - User not authenticated
   - RLS policy not configured
   - Solution: Check middleware, verify RLS policies in Supabase

4. **Indicator calculation errors**
   - Insufficient price data points
   - Invalid indicator name
   - Solution: Add more data, check AVAILABLE_INDICATORS

## API Rate Limiting

- Finnhub API: Standard tier limits apply
- Database queries: Supabase default limits
- Recommendation: Implement caching and pagination for large datasets

## Support & References

- Finnhub API: https://finnhub.io/docs/api
- Supabase Documentation: https://supabase.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Technical Analysis: https://en.wikipedia.org/wiki/Technical_analysis
