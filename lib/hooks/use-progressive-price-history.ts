"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import { shouldUseProgressiveLoading, getChunkSize, isDataSizeSafe } from "@/lib/utils/data-management"
import type { Timeframe } from "@/lib/utils/timeframe"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface UseProgressivePriceHistoryOptions {
  symbol: string | null
  timeframe: Timeframe
  enabled?: boolean
}

interface PriceDataPoint {
  timestamp: string
  price: number
  [key: string]: any
}

export function useProgressivePriceHistory({
  symbol,
  timeframe,
  enabled = true,
}: UseProgressivePriceHistoryOptions) {
  const [allData, setAllData] = useState<PriceDataPoint[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [oldestTimestamp, setOldestTimestamp] = useState<string | null>(null)
  const lastRequestTimeRef = useRef<number>(0)

  // Determine if we should use progressive loading
  const useProgressive = shouldUseProgressiveLoading(timeframe, allData.length)
  const chunkSize = getChunkSize(timeframe)

  // Initial load - fetch most recent data
  const { data: initialData, error, isLoading, mutate } = useSWR(
    enabled && symbol ? `/api/v1/crypto/price?symbol=${symbol}&timeframe=${timeframe}&limit=${chunkSize}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      fallbackData: { data: [] },
      onSuccess: (data) => {
        if (data?.data && Array.isArray(data.data)) {
          const sorted = [...data.data].sort((a: any, b: any) => {
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          })
          setAllData(sorted)
          
          // Set oldest timestamp for pagination
          if (sorted.length > 0) {
            setOldestTimestamp(sorted[0].timestamp)
          }
          
          // Check if we have more data to load
          // If we got less than requested, we're at the end
          setHasMore(data.data.length >= chunkSize)
        }
      },
    }
  )

  // Load more data (older data)
  const loadMore = useCallback(async () => {
    if (!symbol || !oldestTimestamp || isLoadingMore || !hasMore || !enabled) {
      return
    }

    // Throttle requests
    const now = Date.now()
    if (now - lastRequestTimeRef.current < 1000) {
      return
    }
    lastRequestTimeRef.current = now

    setIsLoadingMore(true)
    try {
      const response = await fetch(
        `/api/v1/crypto/price?symbol=${symbol}&timeframe=${timeframe}&limit=${chunkSize}&before=${oldestTimestamp}`
      )
      const result = await response.json()

      if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
        const sorted = [...result.data].sort((a: any, b: any) => {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        })

        // Merge with existing data, avoiding duplicates
        setAllData((prev) => {
          const existingTimestamps = new Set(prev.map((p) => p.timestamp))
          const newData = sorted.filter((p: any) => !existingTimestamps.has(p.timestamp))
          
          if (newData.length === 0) {
            setHasMore(false)
            return prev
          }

          // Combine and sort
          const combined = [...newData, ...prev].sort((a: any, b: any) => {
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          })

          // Update oldest timestamp
          if (combined.length > 0) {
            setOldestTimestamp(combined[0].timestamp)
          }

          // Check if we have more
          setHasMore(newData.length >= chunkSize)

          return combined
        })
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error("Error loading more price data:", err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [symbol, timeframe, oldestTimestamp, isLoadingMore, hasMore, enabled, chunkSize])

  // Auto-load more if we're using progressive loading and data is small
  useEffect(() => {
    if (useProgressive && allData.length > 0 && allData.length < chunkSize * 2 && hasMore && !isLoadingMore) {
      // Check if data size is safe before loading more
      if (isDataSizeSafe(allData.length + chunkSize)) {
        loadMore()
      }
    }
  }, [useProgressive, allData.length, chunkSize, hasMore, isLoadingMore, loadMore])

  // Reset when symbol or timeframe changes
  useEffect(() => {
    setAllData([])
    setOldestTimestamp(null)
    setHasMore(true)
    setIsLoadingMore(false)
  }, [symbol, timeframe])

  const isBackfilling = initialData?.backfilling === true

  return {
    history: allData,
    isLoading,
    isLoadingMore,
    error,
    mutate,
    isBackfilling: isBackfilling || false,
    loadMore,
    hasMore,
    useProgressive,
  }
}

