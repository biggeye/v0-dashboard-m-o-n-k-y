/**
 * Asset Discovery Service
 * Discovers ERC20 tokens in a wallet using direct RPC calls
 */

import { getChainConfig } from "../wallets/chain-config"
import { COMMON_TOKENS } from "@/lib/data/static-metadata"

export interface DiscoveredToken {
  contractAddress: string
  symbol: string
  name: string
  decimals: number
  balance: string
  balanceFormatted: string
}

// ERC20 ABI for balanceOf, symbol, decimals, name
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
]

/**
 * Encode function call data for ERC20 contract
 */
function encodeFunctionCall(functionName: string, params: any[] = []): string {
  // Simple keccak256 hash of function signature (first 4 bytes)
  const functionSignatures: Record<string, string> = {
    balanceOf: "0x70a08231", // balanceOf(address)
    symbol: "0x95d89b41", // symbol()
    decimals: "0x313ce567", // decimals()
    name: "0x06fdde03", // name()
  }

  const functionSelector = functionSignatures[functionName]
  if (!functionSelector) {
    throw new Error(`Unknown function: ${functionName}`)
  }

  if (functionName === "balanceOf" && params.length > 0) {
    // Pad address to 32 bytes (remove 0x, pad to 64 chars, add 0x)
    const address = params[0].replace("0x", "").padStart(64, "0")
    return functionSelector + address
  }

  return functionSelector
}

/**
 * Call a contract function via RPC
 */
async function callContract(
  rpcUrl: string,
  contractAddress: string,
  data: string
): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        {
          to: contractAddress,
          data: data,
        },
        "latest",
      ],
      id: 1,
    }),
  })

  const result = await response.json()
  if (result.error) {
    throw new Error(result.error.message || "RPC call failed")
  }

  return result.result || "0x0"
}

/**
 * Decode string from hex (for symbol, name)
 */
function decodeString(hex: string): string {
  if (!hex || hex === "0x" || hex === "0x0") {
    return ""
  }

  // Remove 0x prefix and function selector (first 64 chars = 32 bytes)
  const data = hex.slice(66) // Skip 0x and first 32 bytes (offset/length)
  if (!data) {
    return ""
  }

  // Extract length (first 32 bytes after offset)
  const lengthHex = data.slice(0, 64)
  const length = Number.parseInt(lengthHex, 16)

  if (length === 0) {
    return ""
  }

  // Extract string data (after length)
  const stringHex = data.slice(64, 64 + length * 2)
  // Convert hex to string (browser-compatible)
  let result = ""
  for (let i = 0; i < stringHex.length; i += 2) {
    const charCode = Number.parseInt(stringHex.substr(i, 2), 16)
    if (charCode > 0) {
      result += String.fromCharCode(charCode)
    }
  }
  return result.replace(/\0/g, "")
}

/**
 * Decode uint256 from hex (for balance, decimals)
 */
function decodeUint256(hex: string): bigint {
  if (!hex || hex === "0x" || hex === "0x0") {
    return BigInt(0)
  }
  return BigInt(hex)
}

/**
 * Discover ERC20 tokens in a wallet
 */
export async function discoverWalletTokens(
  walletAddress: string,
  chainId: number
): Promise<DiscoveredToken[]> {
  const chainConfig = getChainConfig(chainId)
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chainId}`)
  }

  const commonTokens = COMMON_TOKENS[chainId] || []
  const discoveredTokens: DiscoveredToken[] = []

  // Check common tokens
  for (const token of commonTokens) {
    try {
      // Get balance
      const balanceData = encodeFunctionCall("balanceOf", [walletAddress])
      const balanceHex = await callContract(chainConfig.rpcUrl, token.address, balanceData)
      const balance = decodeUint256(balanceHex)

      // Only include tokens with non-zero balance
      if (balance > BigInt(0)) {
        const balanceFormatted = (Number(balance) / Math.pow(10, token.decimals)).toFixed(6)
        discoveredTokens.push({
          contractAddress: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance: balance.toString(),
          balanceFormatted,
        })
      }
    } catch (error) {
      // Skip tokens that fail (might not exist on this chain or contract error)
      console.warn(`[v0] Failed to check token ${token.symbol} at ${token.address}:`, error)
    }
  }

  return discoveredTokens
}

/**
 * Get token metadata from contract (symbol, name, decimals)
 */
export async function getTokenMetadata(
  contractAddress: string,
  chainId: number
): Promise<{ symbol: string; name: string; decimals: number } | null> {
  const chainConfig = getChainConfig(chainId)
  if (!chainConfig) {
    return null
  }

  try {
    const symbolData = encodeFunctionCall("symbol")
    const nameData = encodeFunctionCall("name")
    const decimalsData = encodeFunctionCall("decimals")

    const [symbolHex, nameHex, decimalsHex] = await Promise.all([
      callContract(chainConfig.rpcUrl, contractAddress, symbolData),
      callContract(chainConfig.rpcUrl, contractAddress, nameData),
      callContract(chainConfig.rpcUrl, contractAddress, decimalsData),
    ])

    const symbol = decodeString(symbolHex)
    const name = decodeString(nameHex)
    const decimals = Number(decodeUint256(decimalsHex))

    if (!symbol) {
      return null
    }

    return { symbol, name, decimals }
  } catch (error) {
    console.error(`[v0] Failed to get token metadata for ${contractAddress}:`, error)
    return null
  }
}

