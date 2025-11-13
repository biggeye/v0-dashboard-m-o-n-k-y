"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function usePriceData(symbol: string | null, refreshInterval = 5000) {
  const { data, error, isLoading, mutate } = useSWR(
    symbol ? `/api/crypto/price?symbol=${symbol}` : null,
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
      
      const results = await Promise.all(
        symbols.map((symbol) =>
          fetch(`/api/crypto/price?symbol=${symbol}`)
            .then((res) => res.json())
            .catch(() => ({ data: [] }))
        )
      )
      
      return results.flatMap((r) => r.data || [])
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

// Hook for fetching price history for chart
export function usePriceHistory(symbol: string | null, timeframe: string = "1h") {
  const { data, error, isLoading, mutate } = useSWR(
    symbol ? `/api/crypto/price?symbol=${symbol}&timeframe=${timeframe}` : null,
    fetcher,
    {
      refreshInterval: 10000,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      fallbackData: { data: [] },
    }
  )

  return {
    history: data?.data || [],
    isLoading,
    error,
    mutate,
  }
}

// Hook for portfolio value tracking
export function usePortfolioValue() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/portfolio/value",
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
