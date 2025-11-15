"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { UserAsset } from "./asset-service"

export interface AssetContextType {
  assets: UserAsset[]
  isLoading: boolean
  error: Error | null
  refreshAssets: () => Promise<void>
}

const AssetContext = createContext<AssetContextType | undefined>(undefined)

export function AssetProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<UserAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refreshAssets = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/v1/assets/user")
      if (!response.ok) {
        throw new Error("Failed to fetch assets")
      }
      const data = await response.json()
      setAssets(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      console.error("[v0] Error fetching assets:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshAssets()
  }, [])

  return (
    <AssetContext.Provider value={{ assets, isLoading, error, refreshAssets }}>
      {children}
    </AssetContext.Provider>
  )
}

export function useAssets() {
  const context = useContext(AssetContext)
  if (context === undefined) {
    throw new Error("useAssets must be used within an AssetProvider")
  }
  return context
}

