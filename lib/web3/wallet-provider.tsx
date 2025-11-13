"use client"

// Web3 Wallet Provider Component
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { WalletType, ChainConfig } from "@/lib/types/exchange"

interface WalletContextType {
  address: string | null
  chainId: number | null
  isConnected: boolean
  balance: string | null
  connectWallet: (walletType: WalletType) => Promise<void>
  disconnectWallet: () => void
  switchChain: (chainId: number) => Promise<void>
  sendTransaction: (to: string, amount: string) => Promise<string>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [provider, setProvider] = useState<any>(null)

  const isConnected = !!address

  useEffect(() => {
    // Check if already connected on mount
    checkConnection()

    // Listen for account and chain changes
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)
    }

    return () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [])

  useEffect(() => {
    if (address && provider) {
      fetchBalance()
    }
  }, [address, chainId, provider])

  async function checkConnection() {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          setAddress(accounts[0])
          const chain = await window.ethereum.request({ method: "eth_chainId" })
          setChainId(Number.parseInt(chain, 16))
          setProvider(window.ethereum)
        }
      } catch (error) {
        console.error("[v0] Error checking wallet connection:", error)
      }
    }
  }

  async function connectWallet(walletType: WalletType) {
    try {
      if (walletType === "metamask" || walletType === "coinbase_wallet") {
        if (typeof window !== "undefined" && window.ethereum) {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          })

          const chain = await window.ethereum.request({ method: "eth_chainId" })

          setAddress(accounts[0])
          setChainId(Number.parseInt(chain, 16))
          setProvider(window.ethereum)

          // Save to database
          await saveWalletConnection(accounts[0], Number.parseInt(chain, 16), walletType)
        } else {
          throw new Error("MetaMask or Web3 wallet not detected")
        }
      } else if (walletType === "walletconnect") {
        // WalletConnect implementation would go here
        throw new Error("WalletConnect integration coming soon")
      }
    } catch (error) {
      console.error("[v0] Error connecting wallet:", error)
      throw error
    }
  }

  async function disconnectWallet() {
    setAddress(null)
    setChainId(null)
    setBalance(null)
    setProvider(null)
  }

  async function switchChain(targetChainId: number) {
    if (!provider) throw new Error("No wallet connected")

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      })
    } catch (switchError: any) {
      // Chain not added to wallet, add it
      if (switchError.code === 4902) {
        const chainConfig = getChainConfig(targetChainId)
        if (chainConfig) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: chainConfig.name,
                nativeCurrency: chainConfig.nativeCurrency,
                rpcUrls: [chainConfig.rpcUrl],
                blockExplorerUrls: [chainConfig.blockExplorerUrl],
              },
            ],
          })
        }
      } else {
        throw switchError
      }
    }
  }

  async function sendTransaction(to: string, amount: string): Promise<string> {
    if (!provider || !address) throw new Error("No wallet connected")

    const transactionParameters = {
      from: address,
      to,
      value: `0x${(Number.parseFloat(amount) * 1e18).toString(16)}`, // Convert to wei
    }

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [transactionParameters],
    })

    return txHash
  }

  async function fetchBalance() {
    if (!provider || !address) return

    try {
      const balanceHex = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })
      const balanceWei = Number.parseInt(balanceHex, 16)
      const balanceEth = (balanceWei / 1e18).toFixed(6)
      setBalance(balanceEth)
    } catch (error) {
      console.error("[v0] Error fetching balance:", error)
    }
  }

  async function saveWalletConnection(walletAddress: string, chain: number, walletType: WalletType) {
    try {
      const chainConfig = getChainConfig(chain)
      await fetch("/api/wallets/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          chainId: chain,
          chainName: chainConfig?.name || "Unknown",
          walletType,
        }),
      })
    } catch (error) {
      console.error("[v0] Error saving wallet connection:", error)
    }
  }

  function handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      disconnectWallet()
    } else {
      setAddress(accounts[0])
    }
  }

  function handleChainChanged(chainHex: string) {
    setChainId(Number.parseInt(chainHex, 16))
  }

  function getChainConfig(chainId: number): ChainConfig | null {
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

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected,
        balance,
        connectWallet,
        disconnectWallet,
        switchChain,
        sendTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}
