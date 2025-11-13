"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { useWallet } from "@/lib/web3/wallet-provider"
import { Wallet, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const WALLET_OPTIONS = [
  { type: "metamask" as const, name: "MetaMask", icon: "🦊" },
  { type: "coinbase_wallet" as const, name: "Coinbase Wallet", icon: "🔵" },
  { type: "walletconnect" as const, name: "WalletConnect", icon: "🔗" },
  { type: "trust_wallet" as const, name: "Trust Wallet", icon: "🛡️" },
]

const CHAIN_OPTIONS = [
  { chainId: 1, name: "Ethereum", icon: "⟠" },
  { chainId: 56, name: "BSC", icon: "🟡" },
  { chainId: 137, name: "Polygon", icon: "🟣" },
  { chainId: 42161, name: "Arbitrum", icon: "🔵" },
  { chainId: 10, name: "Optimism", icon: "🔴" },
]

export function WalletConnectButton() {
  const { address, chainId, balance, isConnected, connectWallet, disconnectWallet, switchChain } = useWallet()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConnect = async (walletType: (typeof WALLET_OPTIONS)[0]["type"]) => {
    setLoading(true)
    try {
      await connectWallet(walletType)
      setOpen(false)
    } catch (error: any) {
      console.error("[v0] Wallet connection error:", error)
      alert(error.message || "Failed to connect wallet")
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchChain = async (targetChainId: number) => {
    setLoading(true)
    try {
      await switchChain(targetChainId)
    } catch (error: any) {
      console.error("[v0] Chain switch error:", error)
      alert(error.message || "Failed to switch chain")
    } finally {
      setLoading(false)
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const currentChain = CHAIN_OPTIONS.find((c) => c.chainId === chainId)

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              {currentChain?.icon} {currentChain?.name || "Unknown Chain"}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Switch Network</DialogTitle>
              <DialogDescription>Select a blockchain network</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              {CHAIN_OPTIONS.map((chain) => (
                <Card
                  key={chain.chainId}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    chainId === chain.chainId ? "border-primary" : ""
                  }`}
                  onClick={() => handleSwitchChain(chain.chainId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{chain.icon}</span>
                      <span className="font-semibold">{chain.name}</span>
                    </div>
                    {chainId === chain.chainId && <Badge>Connected</Badge>}
                  </div>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="default" size="sm" className="gap-2">
          <Wallet className="w-4 h-4" />
          {formatAddress(address)}
          {balance && <span className="text-xs">({Number.parseFloat(balance).toFixed(4)} ETH)</span>}
        </Button>

        <Button variant="ghost" size="sm" onClick={disconnectWallet}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Your Wallet</DialogTitle>
          <DialogDescription>Choose a wallet to connect to the platform</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {WALLET_OPTIONS.map((wallet) => (
            <Card
              key={wallet.type}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleConnect(wallet.type)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{wallet.icon}</span>
                <div>
                  <p className="font-semibold">{wallet.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {wallet.type === "walletconnect" ? "Coming soon" : "Connect with browser extension"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {loading && <div className="text-center text-sm text-muted-foreground">Connecting...</div>}
      </DialogContent>
    </Dialog>
  )
}
