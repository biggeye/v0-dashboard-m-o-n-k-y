"use client"

import { createContext, useContext } from "react"
import type { WalletType, ChainConfig } from "@/lib/types/exchange"

export interface WalletContextType {
  address: string | null
  chainId: number | null
  isConnected: boolean
  balance: string | null
  connectWallet: (walletType: WalletType) => Promise<void>
  disconnectWallet: () => void
  switchChain: (chainId: number) => Promise<void>
  sendTransaction: (to: string, amount: string) => Promise<string>
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

