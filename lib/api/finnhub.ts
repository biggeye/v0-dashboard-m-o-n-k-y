// Finnhub API integration for real-time cryptocurrency data
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

export async function fetchCryptoPrice(symbol: string, apiKey: string) {
  try {
    const response = await fetch(`${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${apiKey}`)

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      symbol,
      price: data.c || 0,
      change24h: data.dp || 0,
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
