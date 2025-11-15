export { AssetProvider, useAssets } from "./asset-context"
export type { AssetContextType } from "./asset-context"
// Only export types from asset-service to avoid pulling in server-only code
export type { UserAsset } from "./asset-service"
// Service functions should be imported directly from asset-service in server contexts only
export * from "./asset-discovery"

