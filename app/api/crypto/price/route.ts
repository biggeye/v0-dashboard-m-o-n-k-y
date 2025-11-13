import { createClient } from "@/lib/supabase/server"
import { storePriceData } from "@/lib/services/price-service"
import { fetchCryptoPrice } from "@/lib/api/finnhub"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const symbol = request.nextUrl.searchParams.get("symbol")
    if (!symbol) {
      return NextResponse.json({ error: "Symbol parameter required" }, { status: 400 })
    }

    // Fetch from price_history table
    const { data, error } = await supabase
      .from("price_history")
      .select("*")
      .eq("symbol", symbol)
      .order("timestamp", { ascending: false })
      .limit(100)

    if (error) {
      throw error
    }

    // If no data in DB, fetch from Finnhub and store it
    if (!data || data.length === 0) {
      const finnhubApiKey = process.env.FINNHUB_API_KEY
      if (finnhubApiKey) {
        try {
          const finnhubData = await fetchCryptoPrice(symbol, finnhubApiKey)
          
          // Store the fetched price
          await storePriceData(symbol, finnhubData.price, {
            marketCap: finnhubData.marketCap,
            volume24h: finnhubData.volume24h,
            change24h: finnhubData.change24h,
          })

          // Return the newly stored data
          const { data: newData } = await supabase
            .from("price_history")
            .select("*")
            .eq("symbol", symbol)
            .order("timestamp", { ascending: false })
            .limit(100)

          return NextResponse.json({ data: newData || [] })
        } catch (finnhubError) {
          console.error("Finnhub fetch error:", finnhubError)
          // Continue to return empty array if Finnhub fails
        }
      }
    } else {
      // Check if latest price is stale (older than 5 minutes) and refresh from Finnhub
      const latestPrice = data[0]
      const latestTimestamp = new Date(latestPrice.timestamp)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

      if (latestTimestamp < fiveMinutesAgo) {
        const finnhubApiKey = process.env.FINNHUB_API_KEY
        if (finnhubApiKey) {
          try {
            const finnhubData = await fetchCryptoPrice(symbol, finnhubApiKey)
            
            // Store the fresh price
            await storePriceData(symbol, finnhubData.price, {
              marketCap: finnhubData.marketCap,
              volume24h: finnhubData.volume24h,
              change24h: finnhubData.change24h,
            })
          } catch (finnhubError) {
            console.error("Finnhub refresh error:", finnhubError)
            // Continue with existing data if refresh fails
          }
        }
      }
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Price API error:", error)
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { symbol, price, marketCap, volume24h, change24h } = body

    if (!symbol || price === undefined) {
      return NextResponse.json({ error: "Symbol and price are required" }, { status: 400 })
    }

    const result = await storePriceData(symbol, price, {
      marketCap,
      volume24h,
      change24h,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("Price API error:", error)
    return NextResponse.json({ error: "Failed to store price" }, { status: 500 })
  }
}
