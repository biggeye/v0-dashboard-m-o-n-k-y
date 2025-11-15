// Finnhub API integration for real-time cryptocurrency data
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

export async function fetchCryptoPrice(symbol: string, apiKey: string) {
  try {
    // Finnhub uses BINANCE: prefix for crypto symbols (e.g., BINANCE:BTCUSDT)
    // For crypto, we need to use the crypto/candle endpoint or quote with exchange prefix
    // Let's try the quote endpoint with BINANCE prefix first
    const cryptoSymbol = symbol.includes(":") ? symbol : `BINANCE:${symbol}USDT`
    
    const response = await fetch(`${FINNHUB_BASE_URL}/quote?symbol=${cryptoSymbol}&token=${apiKey}`)

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`)
    }

    const data = await response.json()

    // Check if we got valid data (Finnhub returns {c: 0, d: null, ...} for invalid symbols)
    if (!data.c || data.c === 0) {
      // Fallback: try CoinGecko or return error
      console.warn(`Finnhub returned invalid price for ${symbol}, trying alternative...`)
      throw new Error(`Invalid price data for ${symbol}`)
    }

    return {
      symbol,
      price: data.c || 0, // Current price
      change24h: data.dp || 0, // Percent change
      high52w: data.h52 || 0,
      low52w: data.l52 || 0,
      marketCap: data.marketCapital || undefined,
      volume24h: data.volume || undefined,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error)
    throw error
  }
}

export async function fetchCryptoProfile(symbol: string, apiKey: string) {
  try {
    const response = await fetch(`${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${apiKey}`)

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      name: data.name || symbol,
      description: data.description || "",
      logo: data.logo || "",
      website: data.weburl || "",
      industry: data.finnhubIndustry || "",
    }
  } catch (error) {
    console.error(`Failed to fetch profile for ${symbol}:`, error)
    throw error
  }
}

/**
 * Fetch historical candle data from Finnhub for backfilling gaps
 * @param symbol - Crypto symbol (e.g., "BTC", "ETH")
 * @param resolution - Candle resolution: 1, 5, 15, 30, 60, D, W, M
 * @param from - Unix timestamp (seconds) for start time
 * @param to - Unix timestamp (seconds) for end time
 * @param apiKey - Finnhub API key
 * @param retries - Number of retry attempts (default: 3)
 */
export async function fetchCryptoCandles(
  symbol: string,
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M",
  from: number,
  to: number,
  apiKey: string,
  retries: number = 3
): Promise<Array<{ symbol: string; timestamp: string; price: number; open: number; high: number; low: number; volume: number }>> {
  const cryptoSymbol = symbol.includes(":") ? symbol : `BINANCE:${symbol}USDT`
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Exponential backoff: wait longer between retries
      if (attempt > 0) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10 seconds
        console.log(`Retrying fetchCryptoCandles for ${symbol} (attempt ${attempt + 1}/${retries + 1}) after ${delayMs}ms`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
      
      const response = await fetch(
        `${FINNHUB_BASE_URL}/crypto/candle?symbol=${cryptoSymbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`
      )

      // Handle rate limiting (403) and other errors
      if (response.status === 403) {
        // If we've exhausted retries, throw a specific rate limit error
        if (attempt === retries) {
          throw new Error(`Finnhub rate limit exceeded for ${symbol}. Please wait before retrying.`)
        }
        // Otherwise, continue to retry with exponential backoff
        continue
      }

      if (!response.ok) {
        // For other errors, check if we should retry
        if (response.status >= 500 && attempt < retries) {
          // Server errors - retry
          continue
        }
        throw new Error(`Finnhub API error: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()

      // Check for rate limit in response body
      if (data.error && data.error.includes("limit")) {
        if (attempt === retries) {
          throw new Error(`Finnhub rate limit: ${data.error}`)
        }
        continue
      }

      // Finnhub candle response format: {s: 'ok', t: [timestamps], o: [opens], h: [highs], l: [lows], c: [closes], v: [volumes]}
      if (data.s !== "ok" || !data.t || data.t.length === 0) {
        // If no data but status is ok, might be valid (no trades in period)
        if (data.s === "ok" && (!data.t || data.t.length === 0)) {
          return []
        }
        throw new Error(`Invalid candle data for ${symbol}: ${JSON.stringify(data)}`)
      }

      // Convert candle data to our format
      const candles = data.t.map((timestamp: number, index: number) => ({
        symbol,
        timestamp: new Date(timestamp * 1000).toISOString(),
        price: data.c[index] || 0, // Close price
        open: data.o[index] || 0,
        high: data.h[index] || 0,
        low: data.l[index] || 0,
        volume: data.v[index] || 0,
      }))

      return candles
    } catch (error) {
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        console.error(`Failed to fetch candles for ${symbol} after ${retries + 1} attempts:`, error)
        throw error
      }
      // Otherwise, log and continue to retry
      console.warn(`Attempt ${attempt + 1} failed for ${symbol}, retrying...`, error)
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error(`Failed to fetch candles for ${symbol} after all retries`)
}

