/**
 * Asset Discovery Service
 * Discovers ERC20 tokens in a wallet using direct RPC calls
 */

import { getChainConfig } from "../wallets/chain-config"

export interface DiscoveredToken {
  contractAddress: string
  symbol: string
  name: string
  decimals: number
  balance: string
  balanceFormatted: string
}

// Common ERC20 token contracts by chain
const COMMON_TOKENS: Record<number, Array<{ address: string; symbol: string; name: string; decimals: number }>> = {
  // Ethereum Mainnet
  1: [
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8 },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  ],
  // BNB Smart Chain
  56: [
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18 },
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18 },
    { address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH", name: "Ethereum Token", decimals: 18 },
  ],
  // Polygon
  137: [
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8 },
  ],
  // Arbitrum
  42161: [
    { address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  ],
  // Optimism
  10: [
    { address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  ],
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

