/**
 * Transaction Service
 * Handles Web3 transaction operations
 */

export interface TransactionParams {
  from: string
  to: string
  value: string // Amount in ETH (will be converted to wei)
  data?: string
  gasLimit?: string
  gasPrice?: string
}

export interface TransactionResult {
  txHash: string
  status: "pending" | "confirmed" | "failed"
  blockNumber?: number
  gasUsed?: string
}

/**
 * Send a native token transaction (ETH, BNB, MATIC, etc.)
 */
export async function sendNativeTransaction(
  provider: any,
  params: TransactionParams
): Promise<string> {
  if (!provider) {
    throw new Error("No wallet provider available")
  }

  const transactionParameters: any = {
    from: params.from,
    to: params.to,
    value: `0x${(Number.parseFloat(params.value) * 1e18).toString(16)}`, // Convert to wei
  }

  if (params.data) {
    transactionParameters.data = params.data
  }

  if (params.gasLimit) {
    transactionParameters.gasLimit = params.gasLimit
  }

  if (params.gasPrice) {
    transactionParameters.gasPrice = params.gasPrice
  }

  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [transactionParameters],
  })

  return txHash
}

/**
 * Get transaction receipt
 */
export async function getTransactionReceipt(
  provider: any,
  txHash: string
): Promise<any> {
  if (!provider) {
    throw new Error("No wallet provider available")
  }

  return await provider.request({
    method: "eth_getTransactionReceipt",
    params: [txHash],
  })
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(
  provider: any,
  params: TransactionParams
): Promise<string> {
  if (!provider) {
    throw new Error("No wallet provider available")
  }

  const transactionParameters: any = {
    from: params.from,
    to: params.to,
    value: `0x${(Number.parseFloat(params.value) * 1e18).toString(16)}`,
  }

  if (params.data) {
    transactionParameters.data = params.data
  }

  return await provider.request({
    method: "eth_estimateGas",
    params: [transactionParameters],
  })
}

