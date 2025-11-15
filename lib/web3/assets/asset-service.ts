/**
 * Asset Service
 * Manages user asset selections and discovered token storage
 */

import { createClient } from "@/lib/supabase/server"
import { discoverWalletTokens, getTokenMetadata, type DiscoveredToken } from "./asset-discovery"

export interface UserAsset {
  id: string
  userId: string
  tokenId: string
  isActive: boolean
  addedVia: "manual" | "wallet_discovery" | "admin"
  walletConnectionId?: string
  discoveredAt?: string
  activatedAt: string
  token: {
    id: string
    symbol: string
    name: string
    contractAddress?: string
    chainId?: number
    decimals?: number
    discoveryStatus: string
  }
}

/**
 * Discover tokens in a wallet and store them in token_index with discovered_pending status
 */
export async function discoverAndStoreTokens(
  walletAddress: string,
  chainId: number,
  userId: string,
  walletConnectionId?: string
): Promise<{ discovered: number; errors: number }> {
  const supabase = await createClient()

  try {
    const discoveredTokens = await discoverWalletTokens(walletAddress, chainId)
    let discovered = 0
    let errors = 0

    for (const token of discoveredTokens) {
      try {
        // Check if token already exists in token_index
        const { data: existing } = await supabase
          .from("token_index")
          .select("id, discovery_status")
          .eq("contract_address", token.contractAddress.toLowerCase())
          .eq("chain_id", chainId)
          .single()

        if (existing) {
          // Update discovery status if it's not already approved/active
          if (existing.discovery_status === "manual" || existing.discovery_status === "discovered_pending") {
            await supabase
              .from("token_index")
              .update({
                discovery_status: "discovered_pending",
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id)
          }
        } else {
          // Insert new token with discovered_pending status
          const { error: insertError } = await supabase.from("token_index").insert({
            symbol: token.symbol.toUpperCase(),
            name: token.name,
            finnhub_symbol: `BINANCE:${token.symbol}USDT`, // Default, may need adjustment
            contract_address: token.contractAddress.toLowerCase(),
            chain_id: chainId,
            decimals: token.decimals,
            discovery_status: "discovered_pending",
            is_user_added: true,
            added_by_user_id: userId,
            is_active: false, // Not active until approved
            is_validated: false,
            metadata: {
              balance: token.balance,
              balanceFormatted: token.balanceFormatted,
              discoveredFrom: walletAddress,
            },
          })

          if (insertError) {
            console.error(`[v0] Error storing token ${token.symbol}:`, insertError)
            errors++
            continue
          }
        }

        discovered++
      } catch (error) {
        console.error(`[v0] Error processing token ${token.symbol}:`, error)
        errors++
      }
    }

    return { discovered, errors }
  } catch (error) {
    console.error("[v0] Error discovering tokens:", error)
    throw error
  }
}

/**
 * Get all active assets for a user
 */
export async function getUserAssets(userId: string): Promise<UserAsset[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_assets")
    .select(
      `
      *,
      token:token_index (
        id,
        symbol,
        name,
        contract_address,
        chain_id,
        decimals,
        discovery_status
      )
    `
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("activated_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching user assets:", error)
    throw error
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    tokenId: item.token_id,
    isActive: item.is_active,
    addedVia: item.added_via,
    walletConnectionId: item.wallet_connection_id,
    discoveredAt: item.discovered_at,
    activatedAt: item.activated_at,
    token: {
      id: item.token.id,
      symbol: item.token.symbol,
      name: item.token.name,
      contractAddress: item.token.contract_address,
      chainId: item.token.chain_id,
      decimals: item.token.decimals,
      discoveryStatus: item.token.discovery_status,
    },
  }))
}

/**
 * Activate a discovered token for a user (add to user_assets)
 */
export async function activateAsset(
  userId: string,
  tokenId: string,
  walletConnectionId?: string
): Promise<UserAsset> {
  const supabase = await createClient()

  // Check if token exists and is approved
  const { data: token, error: tokenError } = await supabase
    .from("token_index")
    .select("*")
    .eq("id", tokenId)
    .single()

  if (tokenError || !token) {
    throw new Error("Token not found")
  }

  // Check if already in user_assets
  const { data: existing } = await supabase
    .from("user_assets")
    .select("*")
    .eq("user_id", userId)
    .eq("token_id", tokenId)
    .single()

  if (existing) {
    // Update to active
    const { data: updated, error: updateError } = await supabase
      .from("user_assets")
      .update({
        is_active: true,
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select(
        `
        *,
        token:token_index (
          id,
          symbol,
          name,
          contract_address,
          chain_id,
          decimals,
          discovery_status
        )
      `
      )
      .single()

    if (updateError) throw updateError

    return {
      id: updated.id,
      userId: updated.user_id,
      tokenId: updated.token_id,
      isActive: updated.is_active,
      addedVia: updated.added_via,
      walletConnectionId: updated.wallet_connection_id,
      discoveredAt: updated.discovered_at,
      activatedAt: updated.activated_at,
      token: {
        id: updated.token.id,
        symbol: updated.token.symbol,
        name: updated.token.name,
        contractAddress: updated.token.contract_address,
        chainId: updated.token.chain_id,
        decimals: updated.token.decimals,
        discoveryStatus: updated.token.discovery_status,
      },
    }
  }

  // Create new user_asset
  const { data: newAsset, error: insertError } = await supabase
    .from("user_assets")
    .insert({
      user_id: userId,
      token_id: tokenId,
      is_active: true,
      added_via: token.discovery_status === "discovered_approved" ? "wallet_discovery" : "manual",
      wallet_connection_id: walletConnectionId,
      discovered_at: token.discovery_status?.startsWith("discovered") ? new Date().toISOString() : null,
      activated_at: new Date().toISOString(),
    })
    .select(
      `
      *,
      token:token_index (
        id,
        symbol,
        name,
        contract_address,
        chain_id,
        decimals,
        discovery_status
      )
    `
    )
    .single()

  if (insertError) throw insertError

  return {
    id: newAsset.id,
    userId: newAsset.user_id,
    tokenId: newAsset.token_id,
    isActive: newAsset.is_active,
    addedVia: newAsset.added_via,
    walletConnectionId: newAsset.wallet_connection_id,
    discoveredAt: newAsset.discovered_at,
    activatedAt: newAsset.activated_at,
    token: {
      id: newAsset.token.id,
      symbol: newAsset.token.symbol,
      name: newAsset.token.name,
      contractAddress: newAsset.token.contract_address,
      chainId: newAsset.token.chain_id,
      decimals: newAsset.token.decimals,
      discoveryStatus: newAsset.token.discovery_status,
    },
  }
}

/**
 * Add asset to user (manual addition)
 */
export async function addAssetToUser(
  userId: string,
  tokenId: string,
  source: "manual" | "wallet_discovery" = "manual"
): Promise<UserAsset> {
  return activateAsset(userId, tokenId)
}

/**
 * Remove/deactivate asset from user
 */
export async function removeAssetFromUser(userId: string, tokenId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("user_assets")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("token_id", tokenId)

  if (error) {
    throw error
  }
}

/**
 * Get discovered tokens pending approval for a user
 */
export async function getPendingDiscoveredTokens(userId: string): Promise<any[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("token_index")
    .select("*")
    .eq("added_by_user_id", userId)
    .eq("discovery_status", "discovered_pending")
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

