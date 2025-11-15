/**
 * Utility functions for handling timeframes and intervals
 */

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w" | "1mo"

/**
 * Map timeframe to appropriate interval minutes for data collection
 * Shorter timeframes need finer granularity, longer timeframes can use coarser data
 */
export function timeframeToIntervalMinutes(timeframe: string): number {
  const normalized = timeframe.toLowerCase()
  
  switch (normalized) {
    case "1m":
      return 1 // 1-minute candles for 1-minute view
    case "5m":
      return 1 // 1-minute candles for 5-minute view (can aggregate)
    case "15m":
      return 5 // 5-minute candles for 15-minute view
    case "30m":
      return 5 // 5-minute candles for 30-minute view
    case "1h":
      return 5 // 5-minute candles for hourly view
    case "4h":
      return 15 // 15-minute candles for 4-hour view
    case "1d":
      return 60 // 1-hour candles for daily view
    case "1w":
      return 60 // 1-hour candles for weekly view (can aggregate)
    case "1mo":
    case "1month":
      return 60 // 1-hour candles for monthly view
    default:
      // Default to 5 minutes for unknown timeframes
      return 5
  }
}

/**
 * Map timeframe to lookback period in hours
 * Determines how far back to check for gaps
 */
export function timeframeToLookbackHours(timeframe: string): number {
  const normalized = timeframe.toLowerCase()
  
  switch (normalized) {
    case "1m":
      return 1 // 1 hour lookback for 1-minute view
    case "5m":
      return 2 // 2 hours lookback for 5-minute view
    case "15m":
      return 6 // 6 hours lookback for 15-minute view
    case "30m":
      return 12 // 12 hours lookback for 30-minute view
    case "1h":
      return 24 // 24 hours lookback for hourly view
    case "4h":
      return 48 // 48 hours (2 days) lookback for 4-hour view
    case "1d":
      return 168 // 7 days lookback for daily view
    case "1w":
      return 720 // 30 days lookback for weekly view
    case "1mo":
    case "1month":
      return 2160 // 90 days lookback for monthly view
    default:
      // Default to 24 hours for unknown timeframes
      return 24
  }
}

/**
 * Get the expected number of data points for a timeframe
 * Used to determine if we have enough data or if there are gaps
 */
export function timeframeToExpectedPoints(timeframe: string): number {
  const normalized = timeframe.toLowerCase()
  const intervalMinutes = timeframeToIntervalMinutes(timeframe)
  const lookbackHours = timeframeToLookbackHours(timeframe)
  
  // Calculate expected points: (lookback hours * 60) / interval minutes
  return Math.floor((lookbackHours * 60) / intervalMinutes)
}

/**
 * Parse timeframe string and return interval and lookback
 */
export function parseTimeframe(timeframe: string): {
  intervalMinutes: number
  lookbackHours: number
  expectedPoints: number
} {
  return {
    intervalMinutes: timeframeToIntervalMinutes(timeframe),
    lookbackHours: timeframeToLookbackHours(timeframe),
    expectedPoints: timeframeToExpectedPoints(timeframe),
  }
}

