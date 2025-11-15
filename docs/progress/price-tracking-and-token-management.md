# Price Tracking & Token Management - Progress Documentation

## Overview
Implementation of comprehensive price tracking system with gap detection, backfilling capabilities, and dynamic token management for the cheksHealth platform.

## Date: 2025-11-15

---

## 1. Price Tracking Infrastructure

### Finnhub Integration
- **Status**: ✅ Complete
- **Implementation**: `lib/api/finnhub.ts`
- **Features**:
  - Real-time price fetching via `quote` endpoint
  - Historical candle data fetching (subscription-gated)
  - Retry logic with exponential backoff for rate limit handling
  - Support for BINANCE crypto symbols (e.g., `BINANCE:BTCUSDT`)

### Price Data Storage
- **Tables**: `price_history`, `token_price_history`
- **Normalization**: Timestamps rounded to 5-minute intervals by default
- **Duplicate Prevention**: Unique constraint on `(symbol, timestamp)`
- **Migration**: Cleanup migration applied to normalize existing data

---

## 2. Gap Detection & Backfilling

### Gap Detection
- **Status**: ✅ Complete
- **Implementation**: `lib/services/price-service.ts::detectGaps()`
- **Features**:
  - Detects missing intervals based on expected interval (1, 5, 15, 30, 60 minutes)
  - Configurable lookback period (default: 24 hours)
  - Identifies gaps at beginning, between points, and at end of data range
  - Uses 1.5x threshold to account for minor timing variations

### Automatic Backfilling
- **Status**: ✅ Complete (Subscription-gated)
- **Implementation**: `lib/services/price-service.ts::backfillGaps()`
- **Features**:
  - Automatic gap detection when viewing charts with timeframes
  - Synchronous backfill for small gaps (≤6-24 hours depending on interval)
  - Asynchronous backfill for large gaps
  - Chunking for gaps >24 hours to respect API limits
  - Rate limit handling with exponential backoff

### Subscription Gating
- **Environment Variable**: `FINNHUB_SUBSCRIPTION_ENABLED`
- **Default**: `false` (disabled)
- **Rationale**: Candle endpoint requires paid Finnhub subscription
- **Behavior**:
  - Gap detection still works (useful for monitoring)
  - Backfilling skipped with clear log messages
  - Manual backfill API returns 403 if subscription not enabled

---

## 3. Timeframe-Based Data Collection

### Timeframe Utilities
- **Status**: ✅ Complete
- **Implementation**: `lib/utils/timeframe.ts`
- **Supported Timeframes**: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`, `1mo`
- **Features**:
  - Maps timeframes to appropriate data intervals
  - Calculates optimal lookback periods
  - Determines expected data points for validation

### Dynamic Limit Calculation
- **Status**: ✅ Complete (User enhancement)
- **Implementation**: `app/api/v1/crypto/price/route.ts`
- **Features**:
  - Calculates optimal data limits based on timeframe
  - Prevents data bottlenecks with capped maximums
  - Supports pagination via `before` timestamp parameter
  - Returns backfilling status in API response

---

## 4. Token Management System

### Database Schema
- **Status**: ✅ Complete
- **Tables Created**:
  - `token_index`: Master registry of trackable tokens
  - `token_price_history`: Price data for tokens
- **Migration**: `create_token_index_and_price_history_tables`

### Token Index Features
- User-added tokens with validation
- Finnhub symbol format tracking
- Active/inactive status management
- Validation status tracking
- Last price check timestamp

### API Endpoints
- **Status**: ✅ Complete
- **Endpoints**:
  - `POST /api/v1/tokens` - Add new token (validates against Finnhub)
  - `GET /api/v1/tokens` - List tokens (`?userOnly=true` for user tokens)
  - `DELETE /api/v1/tokens?symbol=XXX` - Remove user token
  - `POST /api/v1/tokens/collect-prices` - Manually trigger price collection

### Token Services
- **Status**: ✅ Complete
- **Implementation**: 
  - `lib/services/token-service.ts` - Token management
  - `lib/services/token-price-service.ts` - Price collection
- **Features**:
  - Automatic validation against Finnhub before adding
  - Batch price collection for all active tokens
  - Separate price history table for better organization

---

## 5. Data Quality Improvements

### Timestamp Normalization
- **Status**: ✅ Complete
- **Migration Applied**: `cleanup_price_history_duplicates_and_normalize_timestamps`
- **Results**:
  - All timestamps rounded to 5-minute boundaries
  - Duplicate entries removed (14 duplicates removed from BTC)
  - Consistent intervals (5, 10, 15 minutes instead of microsecond differences)

### Error Handling
- **Status**: ✅ Complete
- **Improvements**:
  - Retry logic with exponential backoff (3 attempts)
  - Rate limit detection and graceful handling
  - Clear error messages for subscription requirements
  - Continues processing other symbols/gaps on errors

---

## 6. API Enhancements

### Price API Route
- **Status**: ✅ Enhanced
- **New Features**:
  - Timeframe-based filtering
  - Automatic gap detection and backfilling
  - Pagination support (`before` parameter)
  - Dynamic limit calculation
  - Backfilling status in response

### Backfill API Route
- **Status**: ✅ Complete
- **Endpoints**:
  - `POST /api/v1/crypto/price/backfill` - Manual backfill trigger
  - `GET /api/v1/crypto/price/backfill` - Check for gaps without backfilling

---

## 7. Chart Integration

### Price Chart Component
- **Status**: ✅ Enhanced
- **Implementation**: `components/crypto/price-chart.tsx`
- **Features**:
  - Optional `timeframe` prop support
  - Automatic gap detection when timeframe provided
  - Uses `usePriceHistory` hook for timeframe-based data
  - Falls back to `usePriceData` for real-time view

---

## 8. Chart Tooling & Progressive Loading

### Date: 2025-01-XX

### Time Range Controls
- **Status**: ✅ Complete
- **Implementation**: `components/crypto/price-chart.tsx`
- **Features**:
  - Timeframe selector dropdown (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1mo)
  - Manual refresh button with loading state
  - Dynamic X-axis formatting based on selected timeframe
  - Backfilling status indicator
  - Real-time price and percentage change display

### Intelligent Interval-Based Backfilling
- **Status**: ✅ Complete
- **Implementation**: `app/api/v1/crypto/price/route.ts`
- **Features**:
  - Backfill uses interval appropriate to selected timeframe
  - Shorter timeframes (1m, 5m) use 1-minute intervals
  - Longer timeframes (1d, 1w) use 60-minute intervals
  - Adaptive sync/async thresholds based on interval size
  - Interval-aware gap detection and backfilling

### Progressive Loading System
- **Status**: ✅ Complete
- **Implementation**: 
  - `lib/hooks/use-progressive-price-history.ts` - Progressive loading hook
  - `lib/utils/data-management.ts` - Bottleneck management utilities
- **Features**:
  - **Smart Strategy Selection**: 
    - Daily/weekly/monthly views use progressive loading
    - Shorter timeframes (1m-4h) use standard loading
  - **Chunked Data Loading**:
    - Initial load: Most recent data (chunk size: 100-1000 points based on timeframe)
    - Manual pagination: "Load older data" button for historical data
    - Auto-loading: Automatically loads more if dataset is small and safe
    - Cursor-based pagination using timestamps
  - **Bottleneck Management**:
    - Request throttling (1s minimum between requests)
    - Data size safety checks before loading more
    - Duplicate prevention (merges new data, avoids duplicates)
    - Memory-aware: Estimates data size and prevents excessive loading

### Data Bottleneck Management
- **Status**: ✅ Complete
- **Implementation**: `lib/utils/data-management.ts`
- **Features**:
  - **Request Management**:
    - Dynamic refresh intervals (5s for minute views, 5min for monthly views)
    - Request deduplication via SWR's `dedupingInterval`
    - `keepPreviousData` to prevent flicker during timeframe changes
  - **Data Size Control**:
    - Optimal limit calculation based on timeframe and expected points
    - Max limits per timeframe to prevent excessive transfers:
      - 1m/5m: 500 points max
      - 15m/30m: 1000 points max
      - 1h+: 2000 points max
  - **Rate Limiting**:
    - Request caching with TTL (5 seconds)
    - Rate limiter utility for API call management
    - Progressive loading helpers for chunked data
    - Data size estimation and safety checks

### Enhanced Hooks
- **Status**: ✅ Complete
- **Implementation**: `lib/hooks/use-price-data.ts`
- **Features**:
  - Intelligent refresh intervals based on timeframe
  - Backfilling status tracking
  - Progressive loading support
  - Request deduplication and caching

### API Enhancements
- **Status**: ✅ Complete
- **Implementation**: `app/api/v1/crypto/price/route.ts`
- **New Features**:
  - `before` query parameter for cursor-based pagination
  - Dynamic limit calculation based on timeframe
  - Interval-aware backfilling thresholds
  - Backfilling status in response payload

### Technical Decisions

#### Why Progressive Loading?
- **Memory Efficiency**: Large historical datasets (years of data) would overwhelm client memory
- **Performance**: Loading 10,000+ points at once causes UI lag and slow rendering
- **User Experience**: Users typically view recent data first, older data on demand
- **API Efficiency**: Reduces initial load time and bandwidth usage

#### Why Different Strategies Per Timeframe?
- **Short Timeframes (1m-4h)**: 
  - Small datasets (hundreds of points)
  - Real-time updates needed
  - Standard loading is fast and simple
- **Long Timeframes (1d-1mo)**:
  - Large datasets (thousands of points)
  - Less frequent updates acceptable
  - Progressive loading prevents bottlenecks

#### Bottleneck Prevention Strategy
1. **Adaptive Refresh Rates**: Longer timeframes refresh less frequently
2. **Smart Data Limits**: Fetches only what's needed for the view
3. **Interval-Aware Backfilling**: Uses correct granularity for timeframe
4. **Request Deduplication**: Prevents duplicate API calls
5. **Progressive Loading**: Ready for very large datasets

---

## Technical Decisions

### Why Separate Tables?
- **`token_index` + `token_price_history`** vs existing `price_history`:
  - Better organization for user-added tokens
  - Validation and metadata tracking
  - Scalability for dynamic token addition
  - Maintains backward compatibility with existing `price_history`

### Why Subscription Gating?
- Finnhub free tier doesn't support `crypto/candle` endpoint
- Prevents 403 errors and API abuse
- Clear upgrade path for users with paid subscriptions
- Gap detection still works for monitoring purposes

### Why Timestamp Rounding?
- Prevents duplicate entries with microsecond differences
- Ensures consistent intervals for accurate averages
- Makes gap detection more reliable
- Aligns with typical charting requirements (5-minute granularity)

---

## Environment Variables

```env
# Required for price data
FINNHUB_API_KEY=your_finnhub_api_key

# Optional: Enable historical backfilling (requires paid subscription)
FINNHUB_SUBSCRIPTION_ENABLED=false
```

---

## Future Enhancements

### Potential Improvements
1. **Scheduled Price Collection**: Cron job for automatic price collection
2. **Multi-Source Support**: Fallback to CoinGecko or other providers
3. **Data Aggregation**: Pre-calculated hourly/daily aggregates for faster queries
4. **WebSocket Integration**: Real-time price streaming for active traders
5. **Price Alerts**: Integration with token price history for alert triggers

### Migration Path
- Consider migrating existing `price_history` data to `token_price_history`
- Add default tokens to `token_index` on system initialization
- Implement data retention policies for old price data

---

## Testing Notes

### Verified Functionality
- ✅ Gap detection works correctly
- ✅ Timestamp normalization prevents duplicates
- ✅ Subscription gating prevents 403 errors
- ✅ Token validation against Finnhub
- ✅ Dynamic limit calculation prevents bottlenecks

### Known Limitations
- Candle endpoint requires paid Finnhub subscription
- Rate limits: 60 calls/minute on free tier
- Large gaps (>24 hours) require chunking and may take time

---

## Related Files

### Core Services
- `lib/services/price-service.ts` - Price data management
- `lib/services/token-service.ts` - Token management
- `lib/services/token-price-service.ts` - Token price collection

### API Routes
- `app/api/v1/crypto/price/route.ts` - Price data API
- `app/api/v1/crypto/price/backfill/route.ts` - Backfill API
- `app/api/v1/tokens/route.ts` - Token management API
- `app/api/v1/tokens/collect-prices/route.ts` - Price collection API

### Utilities
- `lib/utils/timeframe.ts` - Timeframe parsing and mapping
- `lib/utils/data-management.ts` - Data bottleneck management utilities
- `lib/api/finnhub.ts` - Finnhub API integration

### Components
- `components/crypto/price-chart.tsx` - Price chart with timeframe support and progressive loading

### Hooks
- `lib/hooks/use-price-data.ts` - Price data hooks with intelligent refresh
- `lib/hooks/use-progressive-price-history.ts` - Progressive loading hook for large datasets

---

## Summary

The price tracking system is now production-ready with:
- ✅ Robust gap detection and backfilling
- ✅ Dynamic token management
- ✅ Subscription-gated historical data
- ✅ Normalized, duplicate-free data
- ✅ Scalable architecture for future growth
- ✅ **Chart tooling with time range controls**
- ✅ **Progressive loading for large datasets**
- ✅ **Intelligent data bottleneck management**

All changes maintain backward compatibility while adding powerful new capabilities for users with paid subscriptions. The system now efficiently handles everything from real-time minute-level views to historical monthly views spanning years of data.

