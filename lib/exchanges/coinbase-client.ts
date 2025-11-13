// Coinbase Exchange API Client
import crypto from "crypto"

export class CoinbaseClient {
  private apiKey: string
  private apiSecret: string
  private apiPassphrase: string
  private baseUrl = "https://api.coinbase.com"
  private isPro: boolean

  constructor(apiKey: string, apiSecret: string, apiPassphrase = "", isTestnet = false, usePro = false) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.apiPassphrase = apiPassphrase
    this.isPro = usePro

    if (usePro) {
      this.baseUrl = isTestnet ? "https://api-public.sandbox.pro.coinbase.com" : "https://api.pro.coinbase.com"
    } else {
      this.baseUrl = "https://api.coinbase.com"
    }
  }

  private generateSignature(timestamp: string, method: string, requestPath: string, body = ""): string {
    const message = timestamp + method + requestPath + body
    const hmac = crypto.createHmac("sha256", Buffer.from(this.apiSecret, "base64"))
    return hmac.update(message).digest("base64")
  }

  private async request(endpoint: string, method: "GET" | "POST" | "DELETE" = "GET", body?: Record<string, unknown>) {
    const timestamp = Date.now() / 1000
    const requestPath = endpoint
    const bodyString = body ? JSON.stringify(body) : ""
    const signature = this.generateSignature(timestamp.toString(), method, requestPath, bodyString)

    const headers: Record<string, string> = {
      "CB-ACCESS-KEY": this.apiKey,
      "CB-ACCESS-SIGN": signature,
      "CB-ACCESS-TIMESTAMP": timestamp.toString(),
      "Content-Type": "application/json",
    }

    if (this.isPro && this.apiPassphrase) {
      headers["CB-ACCESS-PASSPHRASE"] = this.apiPassphrase
    }

    const response = await fetch(`${this.baseUrl}${requestPath}`, {
      method,
      headers,
      body: body ? bodyString : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Coinbase API Error: ${data.message || response.statusText}`)
    }

    return data
  }

  async getBalance() {
    if (this.isPro) {
      const accounts = await this.request("/accounts")
      return accounts.map((account: any) => ({
        currency: account.currency,
        available: Number.parseFloat(account.available),
        locked: Number.parseFloat(account.hold),
        total: Number.parseFloat(account.balance),
      }))
    } else {
      const response = await this.request("/v2/accounts")
      return response.data
        .filter((account: any) => Number.parseFloat(account.balance.amount) > 0)
        .map((account: any) => ({
          currency: account.currency,
          available: Number.parseFloat(account.balance.amount),
          locked: 0,
          total: Number.parseFloat(account.balance.amount),
        }))
    }
  }

  async getTicker(productId: string) {
    if (this.isPro) {
      const ticker = await this.request(`/products/${productId}/ticker`)
      const stats = await this.request(`/products/${productId}/stats`)

      return {
        symbol: productId,
        lastPrice: Number.parseFloat(ticker.price),
        change24h:
          ((Number.parseFloat(ticker.price) - Number.parseFloat(stats.open)) / Number.parseFloat(stats.open)) * 100,
        high24h: Number.parseFloat(stats.high),
        low24h: Number.parseFloat(stats.low),
        volume24h: Number.parseFloat(stats.volume),
        timestamp: ticker.time,
      }
    } else {
      const response = await this.request(`/v2/prices/${productId}/spot`)
      return {
        symbol: productId,
        lastPrice: Number.parseFloat(response.data.amount),
        change24h: 0, // Not available in v2 API
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        timestamp: new Date().toISOString(),
      }
    }
  }

  async createOrder(params: {
    product_id: string
    side: "buy" | "sell"
    type: "market" | "limit"
    size: number
    price?: number
  }) {
    if (!this.isPro) {
      throw new Error("Order placement requires Coinbase Pro API")
    }

    const orderParams: Record<string, unknown> = {
      product_id: params.product_id,
      side: params.side,
      type: params.type,
      size: params.size.toString(),
    }

    if (params.type === "limit" && params.price) {
      orderParams.price = params.price.toString()
    }

    const result = await this.request("/orders", "POST", orderParams)

    return {
      orderId: result.id,
      status: result.status,
      filledSize: Number.parseFloat(result.filled_size),
      executedValue: Number.parseFloat(result.executed_value),
    }
  }

  async cancelOrder(orderId: string) {
    if (!this.isPro) {
      throw new Error("Order cancellation requires Coinbase Pro API")
    }

    const result = await this.request(`/orders/${orderId}`, "DELETE")
    return result
  }

  async getOrderStatus(orderId: string) {
    if (!this.isPro) {
      throw new Error("Order status requires Coinbase Pro API")
    }

    const result = await this.request(`/orders/${orderId}`)

    return {
      orderId: result.id,
      status: result.status,
      productId: result.product_id,
      side: result.side,
      price: Number.parseFloat(result.price),
      size: Number.parseFloat(result.size),
      filledSize: Number.parseFloat(result.filled_size),
      executedValue: Number.parseFloat(result.executed_value),
      fillFees: Number.parseFloat(result.fill_fees),
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getBalance()
      return true
    } catch (error) {
      console.error("[v0] Coinbase connection test failed:", error)
      return false
    }
  }
}
