/**
 * Data bottleneck management utilities
 * 
 * These utilities help manage data fetching to prevent:
 * - Excessive API calls
 * - Large payload sizes
 * - Memory issues
 * - Rate limiting
 */

import type { Timeframe } from "./timeframe"
import { parseTimeframe } from "./timeframe"

/**
 * Request deduplication cache
 * Tracks in-flight requests to prevent duplicate API calls
 */
const requestCache = new Map<string, Promise<any>>()
const CACHE_TTL = 5000 // 5 seconds

/**
 * Get or create a cached request
 * Prevents duplicate requests for the same data within the TTL window
 */
export function getCachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = requestCache.get(key)
  
  if (cached) {
    return cached
  }
  
  const promise = fetcher().finally(() => {
    // Remove from cache after TTL
    setTimeout(() => {
      requestCache.delete(key)
    }, CACHE_TTL)
  })
  
  requestCache.set(key, promise)
  return promise
}

/**
 * Calculate optimal data limit based on timeframe and viewport
 * Prevents fetching excessive data that won't be displayed
 */
export function calculateOptimalLimit(
  timeframe: Timeframe,
  viewportWidth?: number
): number {
  const parsed = parseTimeframe(timeframe)
  const expectedPoints = parsed.expectedPoints
  
  // Estimate visible data points based on viewport width
  // Assume ~4px per data point minimum for readability
  const estimatedVisiblePoints = viewportWidth 
    ? Math.floor(viewportWidth / 4) 
    : 200 // Default estimate
  
  // Fetch slightly more than visible to allow for scrolling/zooming
  const calculated = Math.ceil(expectedPoints * 1.2)
  
  // But don't fetch more than we can reasonably display
  const maxReasonable = Math.max(estimatedVisiblePoints * 2, 500)
  
  return Math.min(calculated, maxReasonable)
}

/**
 * Determine if a data fetch should be throttled
 * Returns true if the request should be delayed
 */
export function shouldThrottleRequest(
  lastRequestTime: number,
  timeframe: Timeframe
): boolean {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  // Minimum intervals between requests based on timeframe
  const minIntervals: Record<Timeframe, number> = {
    "1m": 2000,   // 2 seconds for 1-minute views
    "5m": 3000,   // 3 seconds for 5-minute views
    "15m": 5000,  // 5 seconds for 15-minute views
    "30m": 10000, // 10 seconds for 30-minute views
    "1h": 15000,  // 15 seconds for hourly views
    "4h": 30000,  // 30 seconds for 4-hour views
    "1d": 60000,  // 1 minute for daily views
    "1w": 120000, // 2 minutes for weekly views
    "1mo": 300000, // 5 minutes for monthly views
  }
  
  const minInterval = minIntervals[timeframe] || 10000
  return timeSinceLastRequest < minInterval
}

/**
 * Progressive data loading strategy
 * Determines if we should load data incrementally or all at once
 */
export function shouldUseProgressiveLoading(
  timeframe: Timeframe,
  dataPointCount: number
): boolean {
  // For very large datasets, use progressive loading
  const threshold = 1000
  
  // Longer timeframes with many points benefit from progressive loading
  if (dataPointCount > threshold) {
    const longTimeframes: Timeframe[] = ["1d", "1w", "1mo"]
    return longTimeframes.includes(timeframe)
  }
  
  return false
}

/**
 * Calculate chunk size for progressive loading
 */
export function getChunkSize(timeframe: Timeframe): number {
  const chunkSizes: Record<Timeframe, number> = {
    "1m": 100,
    "5m": 200,
    "15m": 300,
    "30m": 400,
    "1h": 500,
    "4h": 500,
    "1d": 1000,
    "1w": 1000,
    "1mo": 1000,
  }
  
  return chunkSizes[timeframe] || 500
}

/**
 * Estimate memory usage for a dataset
 * Returns size in bytes (rough estimate)
 */
export function estimateDataSize(pointCount: number): number {
  // Rough estimate: each price point is ~200 bytes (JSON overhead, timestamps, etc.)
  return pointCount * 200
}

/**
 * Check if estimated data size is within safe limits
 */
export function isDataSizeSafe(pointCount: number, maxSizeMB: number = 10): boolean {
  const estimatedBytes = estimateDataSize(pointCount)
  const maxBytes = maxSizeMB * 1024 * 1024
  return estimatedBytes < maxBytes
}

/**
 * Rate limiting helper
 * Tracks request counts and enforces rate limits
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  /**
   * Check if a request should be allowed
   * @param key - Unique identifier for the rate limit bucket
   * @param maxRequests - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   */
  canMakeRequest(
    key: string,
    maxRequests: number = 60,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove requests outside the window
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < windowMs
    )
    
    if (recentRequests.length >= maxRequests) {
      return false
    }
    
    // Add current request
    recentRequests.push(now)
    this.requests.set(key, recentRequests)
    
    return true
  }
  
  /**
   * Get time until next request is allowed
   */
  getTimeUntilNextRequest(
    key: string,
    maxRequests: number = 60,
    windowMs: number = 60000
  ): number {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < windowMs
    )
    
    if (recentRequests.length < maxRequests) {
      return 0
    }
    
    // Find oldest request in window
    const oldestRequest = Math.min(...recentRequests)
    return windowMs - (now - oldestRequest)
  }
}

export const rateLimiter = new RateLimiter()

