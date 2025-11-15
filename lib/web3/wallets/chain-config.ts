import type { ChainConfig } from "@/lib/types/exchange"

export function getChainConfig(chainId: number): ChainConfig | null {
  const chains: Record<number, ChainConfig> = {
    1: {
      chainId: 1,
      name: "Ethereum Mainnet",
      rpcUrl: "https://eth.llamarpc.com",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      blockExplorerUrl: "https://etherscan.io",
    },
    56: {
      chainId: 56,
      name: "BNB Smart Chain",
      rpcUrl: "https://bsc-dataseed.binance.org",
      nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
      blockExplorerUrl: "https://bscscan.com",
    },
    137: {
      chainId: 137,
      name: "Polygon",
      rpcUrl: "https://polygon-rpc.com",
      nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
      blockExplorerUrl: "https://polygonscan.com",
    },
    42161: {
      chainId: 42161,
      name: "Arbitrum One",
      rpcUrl: "https://arb1.arbitrum.io/rpc",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      blockExplorerUrl: "https://arbiscan.io",
    },
    10: {
      chainId: 10,
      name: "Optimism",
      rpcUrl: "https://mainnet.optimism.io",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      blockExplorerUrl: "https://optimistic.etherscan.io",
    },
  }
  return chains[chainId] || null
}

