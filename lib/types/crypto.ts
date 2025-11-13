export interface PriceData {
  id: string
  symbol: string
  price: number
  marketCap?: number
  volume24h?: number
  change24h?: number
  timestamp: string
  createdAt: string
  updatedAt: string
}

export interface TradingStrategy {
  id: string
  userId: string
  name: string
  description?: string
  symbol: string
  entryCondition: Record<string, unknown>
  exitCondition: Record<string, unknown>
  indicators: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PortfolioHolding {
  id: string
  userId: string
  symbol: string
  quantity: number
  averageBuyPrice: number
  createdAt: string
  updatedAt: string
}

export interface PriceAlert {
  id: string
  userId: string
  symbol: string
  condition: "above" | "below"
  priceThreshold: number
  isTriggered: boolean
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  preferredSymbols: string[]
  apiKeyHash?: string
  createdAt: string
  updatedAt: string
}
