"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function usePriceData(symbol: string | null, refreshInterval = 5000) {
  const { data, error, isLoading, mutate } = useSWR(symbol ? `/api/crypto/price?symbol=${symbol}` : null, fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
    dedupingInterval: 1000,
  })

  return {
    prices: data?.data || [],
    isLoading,
    error,
    mutate,
  }
}

export function useCryptoPrices(symbols: string[] | null) {
  const promises = symbols?.map((symbol) => fetch(`/api/crypto/price?symbol=${symbol}`).then((res) => res.json())) || []

  const { data, error, isLoading, mutate } = useSWR(
    symbols ? symbols.join(",") : null,
    async () => {
      const results = await Promise.all(promises)
      return results.flatMap((r) => r.data)
    },
    { refreshInterval: 5000 },
  )

  return {
    prices: data || [],
    isLoading,
    error,
    mutate,
  }
}
