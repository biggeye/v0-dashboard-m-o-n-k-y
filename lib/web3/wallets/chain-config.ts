import type { ChainConfig } from "@/lib/types/exchange"
import { SUPPORTED_CHAINS } from "@/lib/data/static-metadata"

export function getChainConfig(chainId: number): ChainConfig | null {
  return SUPPORTED_CHAINS[chainId] || null
}

