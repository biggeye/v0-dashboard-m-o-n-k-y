# Crypto Trading Dashboard - Deployment Guide

## Overview

This comprehensive Next.js crypto trading platform integrates with multiple exchanges (Kraken, Binance US, Coinbase), DeFi wallets (MetaMask, WalletConnect), and provides real-time trading capabilities with technical analysis tools.

## Prerequisites

1. **Supabase Account**: Sign up at https://supabase.com
2. **Exchange API Keys** (optional): From Kraken, Binance US, or Coinbase
3. **Vercel Account** (recommended): For deployment

## Database Setup

### Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Create a new project
3. Save your project URL and API keys

### Step 2: Run Database Scripts

Execute the SQL scripts in order via Supabase SQL Editor:

1. **scripts/001_reset_and_create_enhanced_schema.sql**
   - Creates all tables with RLS policies
   - Sets up triggers and indexes
   - Configures authentication flow

2. **scripts/002_seed_sample_data.sql**
   - Seeds sample price history data
   - Allows testing without external APIs

### Step 3: Verify Tables

Check that these tables exist:
- user_profiles
- exchange_connections
- wallet_connections
- price_history
- trading_orders
- transactions
- portfolio_holdings
- trading_strategies
- price_alerts
- dashboard_stats

## Environment Variables

Create a `.env.local` file or configure in Vercel:

\`\`\`env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Development (Optional - for local testing)
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000

# Finnhub API (Optional - for real-time price data)
FINNHUB_API_KEY=your_finnhub_api_key

# OpenAI/Grok (Optional - for LLM agent features)
OPENAI_API_KEY=your_openai_api_key
XAI_API_KEY=your_grok_api_key
\`\`\`

## Local Development

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Run Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Access Dashboard**
   - Open http://localhost:3000
   - Create an account (email confirmation required)
   - Navigate to different sections

## Deployment to Vercel

### Option 1: GitHub Integration (Recommended)

1. Push code to GitHub repository
2. Go to https://vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables in Vercel dashboard
6. Deploy

### Option 2: Vercel CLI

\`\`\`bash
npm install -g vercel
vercel login
vercel
\`\`\`

## Feature Configuration

### 1. Exchange Integration

**To enable trading on exchanges:**

1. Create API keys on each exchange:
   - **Kraken**: Account → Settings → API
   - **Binance US**: Account → API Management
   - **Coinbase**: Settings → API Keys

2. Configure permissions:
   - Read: ✅ (Required)
   - Trade: ✅ (For order placement)
   - Withdraw: ❌ (Not recommended)

3. In the dashboard:
   - Go to Trading page
   - Click "Exchanges"
   - Select exchange and enter API credentials
   - Test connection

### 2. DeFi Wallet Integration

**To connect Web3 wallets:**

1. Install MetaMask or preferred wallet extension
2. In the dashboard, click "Connect Wallet"
3. Select wallet type
4. Approve connection in wallet popup
5. Switch networks as needed (ETH, BSC, Polygon, etc.)

### 3. Real-Time Price Data

**Using Finnhub API:**

1. Sign up at https://finnhub.io
2. Get free API key
3. Add `FINNHUB_API_KEY` to environment variables
4. Restart application

**Alternative: Use seeded data**
- Sample data is already provided
- Good for testing without external APIs

### 4. LLM Agent Tools

**For AI-powered trading analysis:**

1. Get API key from OpenAI or xAI (Grok)
2. Add to environment variables
3. Access via `/api/llm/analyze` endpoint
4. Use in custom trading strategies

## Security Best Practices

### 1. API Key Encryption

The system encrypts exchange API keys before storage. For production:

\`\`\`typescript
// lib/exchanges/exchange-factory.ts
// Replace base64 encoding with proper encryption
import crypto from 'crypto'

export function encryptApiKey(apiKey: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const iv = crypto.randomBytes(16)
  
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}
\`\`\`

### 2. RLS Policies

All tables have Row Level Security enabled. Users can only access their own data.

### 3. Rate Limiting

Consider adding rate limiting for API routes:

\`\`\`typescript
// middleware.ts
import { rateLimit } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const rateLimitResult = await rateLimit(ip)
  
  if (!rateLimitResult.success) {
    return new NextResponse('Too many requests', { status: 429 })
  }
  
  // ... existing middleware
}
\`\`\`

## Monitoring & Maintenance

### 1. Database Monitoring

Check Supabase dashboard for:
- Active connections
- Slow queries
- Storage usage
- RLS policy performance

### 2. Error Tracking

Use Vercel Analytics or Sentry:

\`\`\`typescript
// Add to app/layout.tsx
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
})
\`\`\`

### 3. Logs

Access logs in Vercel dashboard:
- Runtime logs
- Build logs
- Function logs

## Troubleshooting

### Issue: "Unauthorized" errors

**Solution**: Ensure:
1. User is logged in
2. Email is confirmed
3. Supabase session is valid

### Issue: Exchange connection fails

**Solution**:
1. Verify API keys are correct
2. Check API key permissions
3. Ensure IP whitelist includes Vercel IPs
4. Test with exchange API playground

### Issue: No price data showing

**Solution**:
1. Run seed data script
2. Check Finnhub API key
3. Verify network connectivity
4. Check browser console for errors

### Issue: Wallet won't connect

**Solution**:
1. Ensure wallet extension is installed
2. Check if site is on HTTPS
3. Try different browser
4. Clear site data and reconnect

## Scaling Considerations

### 1. Database Performance

- Add indexes for frequently queried columns
- Use Supabase connection pooling
- Consider read replicas for high traffic

### 2. API Rate Limits

- Cache price data with SWR
- Implement request batching
- Use WebSockets for real-time updates

### 3. Storage

- Archive old price history data
- Compress transaction records
- Use Vercel Blob for large files

## Support & Resources

- **Documentation**: See CRYPTO_DASHBOARD_GUIDE.md
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs

## License

MIT License - See LICENSE file for details
