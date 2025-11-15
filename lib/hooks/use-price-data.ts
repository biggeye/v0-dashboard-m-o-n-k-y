"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function usePriceData(symbol: string | null, refreshInterval = 5000) {
  const { data, error, isLoading, mutate } = useSWR(
    symbol ? `/api/v1/crypto/price?symbol=${symbol}` : null,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 1000,
      fallbackData: { data: [] },
    }
  )

  return {
    prices: data?.data || [],
    isLoading,
    error,
    mutate,
  }
}

export function useCryptoPrices(symbols: string[] | null, refreshInterval = 5000) {
  const symbolsKey = symbols ? symbols.join(",") : null

  const { data, error, isLoading, mutate } = useSWR(
    symbolsKey,
    async () => {
      if (!symbols || symbols.length === 0) return []
      
      // For market overview, we only need the latest price per symbol
      const results = await Promise.all(
        symbols.map((symbol) =>
          fetch(`/api/v1/crypto/price?symbol=${symbol}&latest=true`)
            .then((res) => res.json())
            .then((json) => {
              // Return the latest price data with symbol attached
              const latest = json.data?.[0]
              return latest ? { ...latest, symbol } : null
            })
            .catch(() => null)
        )
      )
      
      // Filter out null results and return one price per symbol
      return results.filter((r) => r !== null)
    },
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 1000,
      fallbackData: [],
    }
  )

  return {
    prices: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Hook for fetching price history for chart with intelligent refresh intervals
export function usePriceHistory(symbol: string | null, timeframe: string = "1h") {
  // Calculate refresh interval based on timeframe
  // Shorter timeframes need more frequent updates, longer timeframes can be less frequent
  const getRefreshInterval = (tf: string): number => {
    switch (tf.toLowerCase()) {
      case "1m":
      case "5m":
        return 5000 // 5 seconds for minute-level views
      case "15m":
      case "30m":
        return 10000 // 10 seconds for sub-hourly views
      case "1h":
        return 30000 // 30 seconds for hourly views
      case "4h":
        return 60000 // 1 minute for 4-hour views
      case "1d":
      case "1w":
      case "1mo":
        return 300000 // 5 minutes for daily/weekly/monthly views
      default:
        return 10000
    }
  }

  const refreshInterval = getRefreshInterval(timeframe)
  
  const { data, error, isLoading, mutate } = useSWR(
    symbol ? `/api/v1/crypto/price?symbol=${symbol}&timeframe=${timeframe}` : null,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: Math.min(refreshInterval / 2, 5000), // Prevent duplicate requests
      fallbackData: { data: [] },
      // Keep previous data while loading new timeframe
      keepPreviousData: true,
    }
  )

  // Check if backfilling is happening (indicated by a special response field)
  const isBackfilling = data?.backfilling === true

  return {
    history: data?.data || [],
    isLoading,
    error,
    mutate,
    isBackfilling: isBackfilling || false,
  }
}

// Hook for portfolio value tracking
export function usePortfolioValue() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/portfolio/value",
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      fallbackData: { data: { totalValue: 0, totalPnL: 0, totalPnLPercent: 0 } },
    }
  )

  return {
    value: data?.data || { totalValue: 0, totalPnL: 0, totalPnLPercent: 0 },
    isLoading,
    error,
    mutate,
  }
}
