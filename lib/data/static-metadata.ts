/**
 * Static Metadata - Single Source of Truth
 * 
 * This module exports static constants that rarely change:
 * - Supported blockchain chains
 * - Available technical indicators
 * - Common ERC20 tokens by chain
 * 
 * All API routes and services should import from this module
 * to maintain a single source of truth.
 */

export interface ChainConfig {
  chainId: number
  name: string
  rpcUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  blockExplorerUrl: string
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrl: "https://etherscan.io",
  },
  56: {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    blockExplorerUrl: "https://bscscan.com",
  },
  137: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    blockExplorerUrl: "https://polygonscan.com",
  },
  42161: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrl: "https://arbiscan.io",
  },
  10: {
    chainId: 10,
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrl: "https://optimistic.etherscan.io",
  },
}

export interface IndicatorConfig {
  name: string
  description: string
  parameters: Record<string, number>
  category: "trend" | "momentum" | "volatility" | "support_resistance"
}

export const AVAILABLE_INDICATORS: Record<string, IndicatorConfig> = {
  sma: {
    name: "Simple Moving Average",
    description: "Average price over a period",
    parameters: { period: 20 },
    category: "trend",
  },
  ema: {
    name: "Exponential Moving Average",
    description: "Weighted average giving more weight to recent prices",
    parameters: { period: 12 },
    category: "trend",
  },
  rsi: {
    name: "Relative Strength Index",
    description: "Momentum indicator measuring overbought/oversold conditions",
    parameters: { period: 14 },
    category: "momentum",
  },
  macd: {
    name: "MACD",
    description: "Trend-following momentum indicator",
    parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    category: "trend",
  },
  bollinger: {
    name: "Bollinger Bands",
    description: "Volatility bands around a moving average",
    parameters: { period: 20, stdDev: 2 },
    category: "volatility",
  },
  atr: {
    name: "Average True Range",
    description: "Volatility indicator measuring price range",
    parameters: { period: 14 },
    category: "volatility",
  },
}

export interface CommonToken {
  address: string
  symbol: string
  name: string
  decimals: number
}

export const COMMON_TOKENS: Record<number, CommonToken[]> = {
  // Ethereum Mainnet
  1: [
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8 },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  ],
  // BNB Smart Chain
  56: [
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18 },
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18 },
    { address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH", name: "Ethereum Token", decimals: 18 },
  ],
  // Polygon
  137: [
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8 },
  ],
  // Arbitrum
  42161: [
    { address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  ],
  // Optimism
  10: [
    { address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  ],
}

