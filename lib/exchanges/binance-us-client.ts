// Binance US Exchange API Client
import crypto from "crypto"

export class BinanceUSClient {
  private apiKey: string
  private apiSecret: string
  private baseUrl = "https://api.binance.us"

  constructor(apiKey: string, apiSecret: string, isTestnet = false) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    if (isTestnet) {
      this.baseUrl = "https://testnet.binance.vision" // Binance testnet
    }
  }

  private generateSignature(queryString: string): string {
    return crypto.createHmac("sha256", this.apiSecret).update(queryString).digest("hex")
  }

  private async request(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "GET",
    params: Record<string, unknown> = {},
    requiresSignature = false,
  ) {
    let queryString = new URLSearchParams(params as Record<string, string>).toString()

    if (requiresSignature) {
      const timestamp = Date.now().toString()
      queryString = queryString ? `${queryString}&timestamp=${timestamp}` : `timestamp=${timestamp}`
      const signature = this.generateSignature(queryString)
      queryString += `&signature=${signature}`
    }

    const url = `${this.baseUrl}${endpoint}${queryString ? "?" + queryString : ""}`

    const response = await fetch(url, {
      method,
      headers: {
        "X-MBX-APIKEY": this.apiKey,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (data.code && data.code < 0) {
      throw new Error(`Binance US API Error: ${data.msg}`)
    }

    return data
  }

  async getBalance() {
    const result = await this.request("/api/v3/account", "GET", {}, true)
    return result.balances
      .filter((b: any) => Number.parseFloat(b.free) > 0 || Number.parseFloat(b.locked) > 0)
      .map((b: any) => ({
        currency: b.asset,
        available: Number.parseFloat(b.free),
        locked: Number.parseFloat(b.locked),
        total: Number.parseFloat(b.free) + Number.parseFloat(b.locked),
      }))
  }

  async getTicker(symbol: string) {
    const ticker24h = await this.request("/api/v3/ticker/24hr", "GET", { symbol })

    return {
      symbol,
      lastPrice: Number.parseFloat(ticker24h.lastPrice),
      change24h: Number.parseFloat(ticker24h.priceChangePercent),
      high24h: Number.parseFloat(ticker24h.highPrice),
      low24h: Number.parseFloat(ticker24h.lowPrice),
      volume24h: Number.parseFloat(ticker24h.volume),
      timestamp: new Date(ticker24h.closeTime).toISOString(),
    }
  }

  async createOrder(params: {
    symbol: string
    side: "BUY" | "SELL"
    type: "MARKET" | "LIMIT"
    quantity: number
    price?: number
  }) {
    const orderParams: Record<string, unknown> = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity.toString(),
    }

    if (params.type === "LIMIT") {
      if (!params.price) throw new Error("Price required for limit orders")
      orderParams.price = params.price.toString()
      orderParams.timeInForce = "GTC" // Good Till Cancelled
    }

    const result = await this.request("/api/v3/order", "POST", orderParams, true)

    return {
      orderId: result.orderId.toString(),
      clientOrderId: result.clientOrderId,
      status: result.status,
      executedQty: Number.parseFloat(result.executedQty),
      cummulativeQuoteQty: Number.parseFloat(result.cummulativeQuoteQty),
    }
  }

  async cancelOrder(symbol: string, orderId: string) {
    const result = await this.request("/api/v3/order", "DELETE", { symbol, orderId }, true)
    return result
  }

  async getOrderStatus(symbol: string, orderId: string) {
    const result = await this.request("/api/v3/order", "GET", { symbol, orderId }, true)

    return {
      orderId: result.orderId.toString(),
      status: result.status,
      symbol: result.symbol,
      side: result.side,
      price: Number.parseFloat(result.price),
      quantity: Number.parseFloat(result.origQty),
      executedQty: Number.parseFloat(result.executedQty),
      cummulativeQuoteQty: Number.parseFloat(result.cummulativeQuoteQty),
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request("/api/v3/ping")
      return true
    } catch (error) {
      console.error("[v0] Binance US connection test failed:", error)
      return false
    }
  }
}
