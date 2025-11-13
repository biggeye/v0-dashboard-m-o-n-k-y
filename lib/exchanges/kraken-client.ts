// Kraken Exchange API Client
import crypto from "crypto"

export class KrakenClient {
  private apiKey: string
  private apiSecret: string
  private baseUrl = "https://api.kraken.com"

  constructor(apiKey: string, apiSecret: string, isTestnet = false) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    if (isTestnet) {
      this.baseUrl = "https://api.demo-futures.kraken.com" // Kraken demo environment
    }
  }

  private generateSignature(path: string, nonce: string, postData: string): string {
    const message = postData + nonce + postData
    const secret = Buffer.from(this.apiSecret, "base64")
    const hash = crypto
      .createHash("sha256")
      .update(nonce + message)
      .digest()
    const hmac = crypto
      .createHmac("sha512", secret)
      .update(path + hash)
      .digest("base64")
    return hmac
  }

  private async request(endpoint: string, method: "GET" | "POST" = "POST", params: Record<string, unknown> = {}) {
    const path = `/0/private/${endpoint}`
    const nonce = Date.now().toString()
    const postData = new URLSearchParams({ nonce, ...params } as Record<string, string>).toString()

    const signature = this.generateSignature(path, nonce, postData)

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "API-Key": this.apiKey,
        "API-Sign": signature,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: method === "POST" ? postData : undefined,
    })

    const data = await response.json()

    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API Error: ${data.error.join(", ")}`)
    }

    return data.result
  }

  async getBalance() {
    const result = await this.request("Balance")
    return Object.entries(result).map(([currency, balance]) => ({
      currency,
      available: Number.parseFloat(balance as string),
      locked: 0, // Kraken doesn't separate locked balance in this endpoint
      total: Number.parseFloat(balance as string),
    }))
  }

  async getTicker(pair: string) {
    const response = await fetch(`${this.baseUrl}/0/public/Ticker?pair=${pair}`)
    const data = await response.json()

    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API Error: ${data.error.join(", ")}`)
    }

    const pairData = Object.values(data.result)[0] as any

    return {
      symbol: pair,
      lastPrice: Number.parseFloat(pairData.c[0]),
      change24h: Number.parseFloat(pairData.p[1]), // Today's price change percentage
      high24h: Number.parseFloat(pairData.h[1]),
      low24h: Number.parseFloat(pairData.l[1]),
      volume24h: Number.parseFloat(pairData.v[1]),
      timestamp: new Date().toISOString(),
    }
  }

  async createOrder(params: {
    pair: string
    type: "buy" | "sell"
    ordertype: "market" | "limit"
    volume: number
    price?: number
  }) {
    const orderParams: Record<string, unknown> = {
      pair: params.pair,
      type: params.type,
      ordertype: params.ordertype,
      volume: params.volume.toString(),
    }

    if (params.price) {
      orderParams.price = params.price.toString()
    }

    const result = await this.request("AddOrder", "POST", orderParams)
    return {
      orderId: result.txid[0],
      description: result.descr,
    }
  }

  async cancelOrder(orderId: string) {
    const result = await this.request("CancelOrder", "POST", { txid: orderId })
    return result
  }

  async getOrderStatus(orderId: string) {
    const result = await this.request("QueryOrders", "POST", { txid: orderId })
    const order = result[orderId]

    return {
      orderId,
      status: order.status,
      volume: Number.parseFloat(order.vol),
      volumeExecuted: Number.parseFloat(order.vol_exec),
      price: Number.parseFloat(order.price),
      cost: Number.parseFloat(order.cost),
      fee: Number.parseFloat(order.fee),
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getBalance()
      return true
    } catch (error) {
      console.error("[v0] Kraken connection test failed:", error)
      return false
    }
  }
}
