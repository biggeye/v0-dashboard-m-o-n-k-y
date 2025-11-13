export const SWR_CONFIG = {
  refreshInterval: 5000, // Refresh every 5 seconds
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 1000, // Prevent duplicate requests
  focusThrottleInterval: 60000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
}

export const PRICE_DATA_SWR_CONFIG = {
  ...SWR_CONFIG,
  refreshInterval: 3000, // Faster refresh for price data
}

export const PORTFOLIO_SWR_CONFIG = {
  ...SWR_CONFIG,
  refreshInterval: 30000, // Slower refresh for portfolio
}

export const STRATEGY_SWR_CONFIG = {
  ...SWR_CONFIG,
  refreshInterval: 60000, // Very slow refresh for strategies
}
