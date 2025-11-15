import { createClient } from "@/lib/supabase/server"
import { fetchCryptoPrice, fetchCryptoProfile } from "@/lib/providers/finnhub"

/**
 * Validate if a token symbol is trackable on Finnhub
 * @param symbol - Token symbol (e.g., "BTC", "DOGE")
 * @param apiKey - Finnhub API key
 * @returns Validation result with finnhub_symbol if valid
 */
export async function validateTokenOnFinnhub(
  symbol: string,
  apiKey: string
): Promise<{
  isValid: boolean
  finnhubSymbol?: string
  error?: string
  name?: string
}> {
  try {
    // Try to fetch price - if it works, token is valid
    const finnhubSymbol = symbol.includes(":") ? symbol : `BINANCE:${symbol}USDT`
    const priceData = await fetchCryptoPrice(symbol, apiKey)

    return {
      isValid: true,
      finnhubSymbol,
      name: symbol, // Could be enhanced to fetch full name from Finnhub
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Token not found on Finnhub",
    }
  }
}

/**
 * Add a token to the token_index
 * @param symbol - Token symbol
 * @param userId - User ID who is adding the token
 * @param apiKey - Finnhub API key for validation
 */
export async function addTokenToIndex(
  symbol: string,
  userId: string,
  apiKey: string
): Promise<{
  success: boolean
  token?: any
  error?: string
}> {
  const supabase = await createClient()

  // Check if token already exists
  const { data: existing } = await supabase
    .from("token_index")
    .select("*")
    .eq("symbol", symbol.toUpperCase())
    .single()

  if (existing) {
    // If it exists but is inactive, reactivate it
    if (!existing.is_active) {
      const { data: updated } = await supabase
        .from("token_index")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()

      return { success: true, token: updated }
    }
    return { success: true, token: existing }
  }

  // Validate token on Finnhub
  const validation = await validateTokenOnFinnhub(symbol, apiKey)

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error || "Token not found on Finnhub",
    }
  }

  // Try to fetch description from Finnhub profile (optional, may not work for all crypto)
  let description: string | null = null
  try {
    const profile = await fetchCryptoProfile(validation.finnhubSymbol!, apiKey)
    description = profile.description || null
  } catch (error) {
    // Profile fetch is optional - don't fail if it doesn't work
    console.log(`[v0] Could not fetch profile for ${symbol}, continuing without description`)
  }

  // Insert new token
  const { data: token, error } = await supabase
    .from("token_index")
    .insert({
      symbol: symbol.toUpperCase(),
      finnhub_symbol: validation.finnhubSymbol!,
      name: validation.name || symbol.toUpperCase(),
      description: description,
      is_user_added: true,
      added_by_user_id: userId,
      is_active: true,
      is_validated: true,
      last_price_check: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  return { success: true, token }
}

/**
 * Get all active tokens from token_index
 */
export async function getActiveTokens() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("token_index")
    .select("*")
    .eq("is_active", true)
    .order("symbol", { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get tokens added by a specific user
 */
export async function getUserTokens(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("token_index")
    .select("*")
    .eq("added_by_user_id", userId)
    .eq("is_active", true)
    .order("symbol", { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Remove/deactivate a user-added token
 */
export async function removeUserToken(symbol: string, userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("token_index")
    .update({ is_active: false })
    .eq("symbol", symbol.toUpperCase())
    .eq("added_by_user_id", userId)
    .eq("is_user_added", true)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

