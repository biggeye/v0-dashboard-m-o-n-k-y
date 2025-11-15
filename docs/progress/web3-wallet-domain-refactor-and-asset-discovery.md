# Web3 Wallet Domain Refactor & Asset Discovery - Progress Documentation

## Overview
Comprehensive refactoring of the Web3 wallet system into proper domain separation (wallets, transactions, assets) with automatic ERC20 token discovery from connected wallets. Implemented user asset selection system that integrates with price charts and includes admin approval workflow for discovered tokens.

## Date: 2025-01-XX

---

## 1. Domain Architecture Refactoring

### Domain Separation
- **Status**: ✅ Complete
- **Rationale**: Monolithic `wallet-provider.tsx` violated single responsibility principle and made the codebase difficult to maintain and extend
- **New Structure**:
  ```
  lib/web3/
  ├── wallets/
  │   ├── wallet-provider.tsx    # Core wallet connection management
  │   ├── wallet-context.tsx     # React context and hooks
  │   ├── chain-config.ts        # Chain configuration utilities
  │   └── index.ts               # Public API exports
  ├── transactions/
  │   └── transaction-service.ts # Transaction operations (send, estimate gas, etc.)
  ├── assets/
  │   ├── asset-discovery.ts     # ERC20 token discovery via RPC
  │   ├── asset-service.ts       # Asset management and user selections
  │   ├── asset-context.tsx      # Asset context for user-selected tokens
  │   └── index.ts              # Public API exports
  └── wallet-provider.tsx        # Legacy re-export (backward compatibility)
  ```

### Wallet Domain (`lib/web3/wallets/`)
- **Status**: ✅ Complete
- **Components**:
  - `wallet-provider.tsx`: Core wallet connection, disconnection, chain switching
  - `wallet-context.tsx`: React context and `useWallet()` hook
  - `chain-config.ts`: Centralized chain configuration (Ethereum, BSC, Polygon, Arbitrum, Optimism)
- **Features Preserved**:
  - ✅ MetaMask and Coinbase Wallet support
  - ✅ Automatic connection detection on mount
  - ✅ Account and chain change listeners
  - ✅ Native balance fetching
  - ✅ Chain switching with automatic chain addition
  - ✅ Transaction sending

### Transaction Domain (`lib/web3/transactions/`)
- **Status**: ✅ Complete
- **Implementation**: `transaction-service.ts`
- **Functions**:
  - `sendNativeTransaction()` - Send native token transactions (ETH, BNB, MATIC, etc.)
  - `getTransactionReceipt()` - Get transaction receipt
  - `estimateGas()` - Estimate gas for transactions
- **Features**:
  - ✅ Support for data, gasLimit, gasPrice parameters
  - ✅ Automatic wei conversion
  - ✅ Error handling

### Asset Domain (`lib/web3/assets/`)
- **Status**: ✅ Complete
- **Components**:
  - `asset-discovery.ts`: ERC20 token discovery via direct RPC calls
  - `asset-service.ts`: Asset management, user selections, activation
  - `asset-context.tsx`: React context for user's active assets
- **Integration**: Automatically fetches user assets and provides them to components

---

## 2. Database Schema Updates

### User Assets Table
- **Status**: ✅ Complete
- **Migration**: `008_add_user_assets_and_token_discovery.sql`
- **Table**: `user_assets`
- **Schema**:
  ```sql
  CREATE TABLE user_assets (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    token_id UUID REFERENCES token_index(id),
    is_active BOOLEAN DEFAULT true,
    added_via TEXT CHECK (added_via IN ('manual', 'wallet_discovery', 'admin')),
    wallet_connection_id UUID REFERENCES wallet_connections(id),
    discovered_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, token_id)
  );
  ```
- **Indexes**:
  - `idx_user_assets_user_id` - Fast user asset queries
  - `idx_user_assets_active` - Filter active assets
  - `idx_user_assets_wallet_connection` - Link to wallet connections
- **RLS Policies**:
  - Users can only see/modify their own assets
  - Admins can view all user assets

### Token Index Enhancements
- **Status**: ✅ Complete
- **New Columns**:
  - `discovery_status` TEXT: `'manual' | 'discovered_pending' | 'discovered_approved' | 'active'`
  - `contract_address` TEXT: ERC20 contract address
  - `chain_id` INTEGER: Blockchain network ID
  - `decimals` INTEGER: Token decimal precision
- **Indexes**:
  - `idx_token_index_discovery_status` - Fast pending token queries
  - `idx_token_index_contract_chain` - Unique token identification per chain
- **Migration**: Updates existing tokens to `discovery_status = 'manual'`

---

## 3. ERC20 Token Discovery

### Discovery Mechanism
- **Status**: ✅ Complete
- **Implementation**: `lib/web3/assets/asset-discovery.ts`
- **Method**: Direct RPC calls using `eth_call`
- **Approach**: 
  - Checks common token contracts (USDC, USDT, DAI, WBTC, WETH) for non-zero balances
  - Supports Ethereum, BNB Chain, Polygon, Arbitrum, Optimism
  - Browser-compatible hex string decoding (no Node.js Buffer dependency)

### Supported Tokens by Chain
- **Ethereum Mainnet (1)**:
  - USDC, USDT, DAI, WBTC, WETH
- **BNB Smart Chain (56)**:
  - USDC, USDT, DAI, ETH
- **Polygon (137)**:
  - USDC, USDT, DAI, WBTC
- **Arbitrum (42161)**:
  - USDC, USDT, DAI
- **Optimism (10)**:
  - USDC, USDT, DAI

### Discovery Functions
- `discoverWalletTokens(walletAddress, chainId)`: Scans wallet for ERC20 tokens
- `getTokenMetadata(contractAddress, chainId)`: Fetches symbol, name, decimals from contract
- **Features**:
  - ✅ Batch token checking
  - ✅ Error handling for invalid contracts
  - ✅ Balance formatting with proper decimals
  - ✅ Contract metadata extraction

### Discovery Workflow
1. User connects wallet → `POST /api/v1/wallets/connect`
2. Backend automatically triggers `discoverAndStoreTokens()`
3. Discovered tokens added to `token_index` with `discovery_status = 'discovered_pending'`
4. Admin reviews and approves tokens in superadmin panel
5. User activates approved tokens → added to `user_assets`
6. Price tracking begins for activated tokens

---

## 4. Asset Management Service

### Core Functions
- **Status**: ✅ Complete
- **Implementation**: `lib/web3/assets/asset-service.ts`

#### `discoverAndStoreTokens()`
- Discovers tokens in wallet and stores in `token_index`
- Sets `discovery_status = 'discovered_pending'`
- Links to wallet connection via `wallet_connection_id`
- Stores balance and metadata in token record

#### `getUserAssets()`
- Fetches all active assets for a user
- Joins with `token_index` for full token details
- Returns formatted `UserAsset[]` with token metadata

#### `activateAsset()`
- Moves token from pending to active tracking
- Creates or updates `user_assets` record
- Sets `activated_at` timestamp
- Handles both new activations and re-activations

#### `addAssetToUser()`
- Manual asset addition (not from discovery)
- Wrapper around `activateAsset()`

#### `removeAssetFromUser()`
- Deactivates asset (soft delete via `is_active = false`)
- Preserves historical data

#### `getPendingDiscoveredTokens()`
- Fetches tokens with `discovery_status = 'discovered_pending'` for a user
- Used in frontend to show discovered tokens awaiting activation

---

## 5. API Endpoints

### Wallet Endpoints
- **Status**: ✅ Complete

#### `POST /api/v1/wallets/connect`
- **Enhancement**: Automatically triggers token discovery after wallet connection
- **Behavior**: Non-blocking background discovery (doesn't fail connection if discovery fails)
- **Flow**: Save wallet → Trigger discovery → Return connection data

#### `POST /api/v1/wallets/[id]/discover-tokens`
- **Purpose**: Manual trigger for token discovery
- **Auth**: User must own the wallet
- **Response**: `{ discovered: number, errors: number }`

### Asset Endpoints
- **Status**: ✅ Complete

#### `GET /api/v1/assets/user`
- **Purpose**: Get user's active assets
- **Auth**: Authenticated users only
- **Response**: `UserAsset[]` with token details

#### `POST /api/v1/assets/activate`
- **Purpose**: Activate a token for tracking
- **Body**: `{ tokenId: string, walletConnectionId?: string }`
- **Response**: Activated `UserAsset` object

#### `DELETE /api/v1/assets/[tokenId]`
- **Purpose**: Remove/deactivate asset from user
- **Auth**: User must own the asset
- **Response**: `{ success: true }`

#### `GET /api/v1/assets/pending`
- **Purpose**: Get user's pending discovered tokens
- **Auth**: Authenticated users only
- **Response**: `DiscoveredToken[]` with `discovery_status = 'discovered_pending'`

### Admin Endpoints
- **Status**: ✅ Complete

#### `GET /api/v1/admin/tokens/pending`
- **Purpose**: Get all pending tokens for admin review
- **Auth**: Admin or superadmin only
- **Response**: All tokens with `discovery_status = 'discovered_pending'`

#### `POST /api/v1/admin/tokens/[tokenId]/approve`
- **Purpose**: Approve or reject discovered token
- **Body**: `{ status: 'discovered_approved' | 'manual' }`
- **Auth**: Admin or superadmin only
- **Behavior**: 
  - `discovered_approved`: Token becomes available for user activation
  - `manual`: Token removed from discovery queue

---

## 6. Frontend Components

### Asset Provider
- **Status**: ✅ Complete
- **Implementation**: `lib/web3/assets/asset-context.tsx`
- **Integration**: Added to `app/bags/layout.tsx`
- **Features**:
  - ✅ Automatic asset fetching on mount
  - ✅ Refresh function for manual updates
  - ✅ Loading and error states
  - ✅ React context pattern for global access

### Price Chart Enhancement
- **Status**: ✅ Complete
- **Implementation**: `components/crypto/price-chart.tsx`
- **New Props**:
  - `useUserAssets?: boolean` - Enable asset selector
  - `symbol?: string` - Made optional when using user assets
- **Features**:
  - ✅ Asset selector dropdown when `useUserAssets={true}`
  - ✅ Automatic symbol selection from first asset
  - ✅ Empty state handling (no assets selected)
  - ✅ Backward compatible (works with hardcoded symbols)

### Asset Selector Component
- **Status**: ✅ Complete
- **Implementation**: `components/assets/asset-selector.tsx`
- **Features**:
  - ✅ Dropdown of user's active assets
  - ✅ Add asset dialog (for manual token activation)
  - ✅ Loading states
  - ✅ Empty state handling

### Discovered Tokens List
- **Status**: ✅ Complete
- **Implementation**: `components/assets/discovered-tokens-list.tsx`
- **Features**:
  - ✅ Shows pending discovered tokens for user
  - ✅ One-click activation
  - ✅ Token details (symbol, name, chain, contract address)
  - ✅ Loading and empty states

### Admin Asset Activation Panel
- **Status**: ✅ Complete
- **Implementation**: `components/admin/asset-activation-panel.tsx`
- **Integration**: Added to `app/superadmin/page.tsx`
- **Features**:
  - ✅ Table view of all pending tokens
  - ✅ Approve/Reject buttons
  - ✅ Token metadata display (contract, chain, decimals)
  - ✅ Bulk operations support (UI ready)
  - ✅ Refresh functionality
  - ✅ Processing states

---

## 7. Integration Points

### Wallet Connection Flow
1. **User Action**: Connects wallet via `WalletConnectButton`
2. **Wallet Provider**: Calls `connectWallet()` → saves to database
3. **API Endpoint**: `POST /api/v1/wallets/connect` saves connection
4. **Background Discovery**: Automatically triggers `discoverAndStoreTokens()`
5. **Token Storage**: Discovered tokens added to `token_index` with `discovery_status = 'discovered_pending'`
6. **Admin Review**: Admin sees tokens in superadmin panel
7. **Approval**: Admin approves → `discovery_status = 'discovered_approved'`
8. **User Activation**: User activates token → added to `user_assets`
9. **Price Tracking**: Token price tracking begins via existing `token-price-service.ts`

### Price Chart Flow
1. **Component Mount**: `PriceChart` with `useUserAssets={true}`
2. **Asset Fetch**: `useAssets()` hook fetches user's active assets
3. **Symbol Selection**: First asset selected by default, or user selects from dropdown
4. **Price Data**: Chart fetches price history for selected symbol
5. **Real-time Updates**: Existing price tracking system provides data

### Asset Selection Flow
1. **Discovery**: Tokens discovered from wallet → `discovered_pending`
2. **Admin Approval**: Admin approves → `discovered_approved`
3. **User Activation**: User clicks "Activate" → `POST /api/v1/assets/activate`
4. **Asset Added**: Token added to `user_assets` with `is_active = true`
5. **Price Chart**: Asset appears in dropdown selector
6. **Price Tracking**: Token included in `collectPricesForActiveTokens()` cycle

---

## 8. Technical Implementation Details

### RPC Token Discovery
- **Method**: Direct `eth_call` to ERC20 contracts
- **Function Signatures**:
  - `balanceOf(address)`: `0x70a08231`
  - `symbol()`: `0x95d89b41`
  - `decimals()`: `0x313ce567`
  - `name()`: `0x06fdde03`
- **Encoding**: Manual hex encoding (no external libraries)
- **Decoding**: Browser-compatible string conversion (no Buffer dependency)
- **Error Handling**: Graceful failure for invalid contracts or network errors

### Chain Configuration
- **Centralized**: `lib/web3/wallets/chain-config.ts`
- **Supported Chains**:
  - Ethereum Mainnet (1)
  - BNB Smart Chain (56)
  - Polygon (137)
  - Arbitrum One (42161)
  - Optimism (10)
- **Configuration Includes**:
  - Chain ID, name, RPC URL
  - Native currency (symbol, decimals)
  - Block explorer URL

### State Management
- **Wallet State**: React context in `wallet-context.tsx`
- **Asset State**: React context in `asset-context.tsx`
- **Pattern**: Provider → Context → Hook
- **Benefits**: 
  - Global state access
  - Automatic re-renders on state changes
  - Type-safe hooks

### Backward Compatibility
- **Legacy Support**: `lib/web3/wallet-provider.tsx` re-exports from new structure
- **Import Paths**: Existing imports continue to work
- **API Compatibility**: All existing wallet functions preserved
- **Migration Path**: Gradual migration to new import paths

---

## 9. Database Relationships

### Entity Relationships
```
auth.users
  └── wallet_connections (1:N)
      └── user_assets (1:N via wallet_connection_id)
          └── token_index (N:1)
              └── token_price_history (1:N)
```

### Data Flow
1. **User** connects **Wallet** → `wallet_connections` record created
2. **Discovery** finds tokens → `token_index` records created with `discovery_status = 'discovered_pending'`
3. **Admin** approves → `token_index.discovery_status = 'discovered_approved'`
4. **User** activates → `user_assets` record created linking user to token
5. **Price Service** tracks → `token_price_history` records created for active tokens

### Constraints
- `user_assets(user_id, token_id)` - Unique constraint prevents duplicates
- Foreign keys ensure referential integrity
- Cascade deletes: User deletion removes all related records
- RLS policies enforce data isolation

---

## 10. Error Handling & Edge Cases

### Discovery Errors
- **Invalid Contracts**: Gracefully skipped with warning logs
- **Network Errors**: Retry logic (can be enhanced)
- **Rate Limiting**: Sequential processing prevents overwhelming RPC
- **Missing Metadata**: Fallback to contract address if symbol/name unavailable

### Activation Errors
- **Duplicate Activation**: Handled by unique constraint, updates existing record
- **Invalid Token ID**: Returns 404 with clear error message
- **Unauthorized Access**: RLS policies prevent cross-user access

### Frontend Error States
- **No Assets**: Empty state with helpful message
- **Loading States**: Spinners and disabled buttons
- **API Failures**: Error messages with retry options
- **Network Issues**: Graceful degradation

---

## 11. Performance Considerations

### Discovery Performance
- **Sequential Processing**: Tokens checked one at a time (can be parallelized)
- **Caching**: Token metadata could be cached to reduce RPC calls
- **Batch Requests**: Future enhancement: batch RPC calls for multiple tokens

### Database Queries
- **Indexes**: All foreign keys and common query paths indexed
- **RLS Overhead**: Minimal impact due to proper indexing
- **Join Optimization**: `user_assets` queries join with `token_index` efficiently

### Frontend Performance
- **Context Optimization**: Assets fetched once, shared via context
- **Selective Re-renders**: Only affected components update on asset changes
- **Lazy Loading**: Asset selector only renders when needed

---

## 12. Security Considerations

### RLS Policies
- **User Assets**: Users can only access their own assets
- **Admin Access**: Admins can view all assets for moderation
- **Token Index**: Public read, restricted write (admin-only for status changes)

### Input Validation
- **Token IDs**: UUID validation
- **Contract Addresses**: Lowercase normalization, format validation
- **Chain IDs**: Restricted to supported chains

### API Security
- **Authentication**: All endpoints require authenticated user
- **Authorization**: Admin endpoints check role
- **Rate Limiting**: Future enhancement for discovery endpoints

---

## 13. Future Enhancements

### Discovery Improvements
- [ ] Parallel token checking for faster discovery
- [ ] Token list expansion (more common tokens per chain)
- [ ] Custom token contract scanning
- [ ] Token logo fetching and caching
- [ ] Historical balance tracking

### Asset Management
- [ ] Asset groups/portfolios
- [ ] Asset notes and tags
- [ ] Price alerts per asset
- [ ] Asset performance tracking
- [ ] Export asset list

### Admin Features
- [ ] Bulk approval/rejection
- [ ] Token metadata editing
- [ ] Discovery statistics dashboard
- [ ] Token validation automation

### Integration Enhancements
- [ ] WalletConnect support (currently placeholder)
- [ ] Multi-wallet support per user
- [ ] Cross-chain asset aggregation
- [ ] DeFi protocol integration (Uniswap, Aave, etc.)

---

## 14. Testing Considerations

### Unit Tests Needed
- [ ] Token discovery RPC call encoding/decoding
- [ ] Asset service functions (activate, remove, etc.)
- [ ] Chain configuration utilities
- [ ] Transaction service functions

### Integration Tests Needed
- [ ] Wallet connection → discovery flow
- [ ] Admin approval → user activation flow
- [ ] Price chart with user assets
- [ ] API endpoint authentication/authorization

### E2E Tests Needed
- [ ] Complete user journey: connect wallet → discover → activate → view chart
- [ ] Admin workflow: review → approve → verify activation
- [ ] Error scenarios: invalid contracts, network failures

---

## 15. Migration Notes

### Breaking Changes
- **None**: All changes are backward compatible
- **Legacy Imports**: Still work via re-export
- **API Changes**: Only additions, no removals

### Database Migration
- **Migration File**: `scripts/008_add_user_assets_and_token_discovery.sql`
- **Applied**: ✅ Yes
- **Rollback**: Safe (new tables, nullable columns)
- **Data Migration**: Existing tokens set to `discovery_status = 'manual'`

### Deployment Checklist
- [x] Database migration applied
- [x] New API endpoints deployed
- [x] Frontend components updated
- [x] AssetProvider added to layout
- [x] Admin panel integrated
- [ ] Environment variables verified (if any added)
- [ ] RPC endpoints accessible
- [ ] Error monitoring configured

---

## 16. Documentation References

### Code Documentation
- JSDoc comments in service functions
- Type definitions in TypeScript interfaces
- README updates (if needed)

### User Documentation
- Wallet connection guide
- Asset activation guide
- Admin approval workflow

### API Documentation
- OpenAPI/Swagger specs (future enhancement)
- Endpoint documentation in code comments

---

## Summary

This refactoring establishes a solid foundation for Web3 wallet integration with proper domain separation, automatic token discovery, and a complete user asset management system. The implementation follows established patterns in the codebase, maintains backward compatibility, and provides extensibility for future enhancements.

**Key Achievements**:
- ✅ Clean domain architecture (wallets, transactions, assets)
- ✅ Automatic ERC20 token discovery
- ✅ User asset selection and activation
- ✅ Admin approval workflow
- ✅ Price chart integration
- ✅ Complete API surface
- ✅ Database schema with proper relationships
- ✅ Security via RLS policies
- ✅ Backward compatibility maintained

**Next Steps**:
- Monitor discovery performance in production
- Gather user feedback on asset selection UX
- Expand token list coverage
- Add parallel discovery processing
- Implement asset groups/portfolios

