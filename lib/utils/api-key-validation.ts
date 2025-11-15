// Utility functions for validating and sanitizing API keys

export interface ParsedCredentials {
  apiKey: string
  apiSecret: string
  apiPassphrase?: string
  warnings: string[]
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  warnings: string[]
  sanitized: {
    apiKey: string
    apiSecret: string
    apiPassphrase?: string
  }
}

/**
 * Detects if pasted content is JSON and attempts to extract credentials
 */
export function parseJsonPaste(content: string): ParsedCredentials | null {
  try {
    const trimmed = content.trim()
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
      return null
    }

    const parsed = JSON.parse(trimmed)
    
    // Check for modern exchange API key format (GCP-style with name and privateKey)
    // This is the new format used by some exchanges (e.g., Coinbase Advanced Trade)
    if (parsed.name && parsed.privateKey) {
      // Check if it's an exchange API key (has organizations/.../apiKeys/ pattern)
      if (parsed.name.includes("organizations/") && parsed.name.includes("apiKeys/")) {
        return {
          apiKey: sanitizeApiKey(parsed.name),
          apiSecret: sanitizePrivateKey(parsed.privateKey), // Preserve PEM format
          warnings: ["Extracted modern API key format (name + privateKey). This is the new format."],
        }
      }
      // If it has privateKey but doesn't match exchange pattern, might be GCP service account
      // But we'll still try to extract it as some exchanges might use this format
      if (parsed.privateKey.includes("BEGIN") && parsed.privateKey.includes("PRIVATE KEY")) {
        return {
          apiKey: sanitizeApiKey(parsed.name),
          apiSecret: sanitizePrivateKey(parsed.privateKey),
          warnings: ["Extracted credentials with PEM-encoded private key. Please verify this is for an exchange."],
        }
      }
    }

    // Check for AWS credentials (still reject these)
    if (parsed.AccessKeyId || parsed.SecretAccessKey || parsed.aws_access_key_id) {
      return {
        apiKey: "",
        apiSecret: "",
        warnings: [
          "This appears to be an AWS credentials file, not an exchange API key. Exchange API keys have a different format.",
        ],
      }
    }

    // Try to extract exchange-like credentials (legacy format)
    const apiKey = parsed.apiKey || parsed.api_key || parsed.key || parsed.accessKey || ""
    const apiSecret = parsed.apiSecret || parsed.api_secret || parsed.secret || parsed.secretKey || ""
    const apiPassphrase = parsed.apiPassphrase || parsed.api_passphrase || parsed.passphrase || ""

    if (apiKey && apiSecret) {
      return {
        apiKey: sanitizeApiKey(apiKey),
        apiSecret: sanitizeApiKey(apiSecret),
        apiPassphrase: apiPassphrase ? sanitizeApiKey(apiPassphrase) : undefined,
        warnings: ["Extracted credentials from JSON. Please verify they are correct."],
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Sanitizes API key by trimming whitespace and removing common formatting issues
 */
export function sanitizeApiKey(key: string): string {
  if (!key) return ""
  
  return key
    .trim()
    // Remove leading/trailing quotes if present
    .replace(/^["']|["']$/g, "")
    // Remove newlines and extra whitespace (but preserve spaces in the middle for passphrases)
    .replace(/\n/g, "")
    .replace(/\r/g, "")
    .replace(/\t/g, "")
    // Normalize multiple spaces to single space
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Sanitizes PEM-encoded private key (preserves newlines and structure)
 */
export function sanitizePrivateKey(privateKey: string): string {
  if (!privateKey) return ""
  
  return privateKey
    .trim()
    // Remove leading/trailing quotes if present
    .replace(/^["']|["']$/g, "")
    // Normalize line endings to \n
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove trailing newlines but preserve structure
    .replace(/\n+$/, "")
    // Ensure proper PEM format with newlines
    .replace(/\\n/g, "\n")
    .trim()
}

/**
 * Validates API key format for specific exchanges
 */
export function validateApiKeyFormat(
  exchangeName: string,
  apiKey: string,
  apiSecret: string,
  apiPassphrase?: string
): ValidationResult {
  const warnings: string[] = []
  const sanitized = {
    apiKey: sanitizeApiKey(apiKey),
    apiSecret: sanitizeApiKey(apiSecret),
    apiPassphrase: apiPassphrase ? sanitizeApiKey(apiPassphrase) : undefined,
  }

  // Basic length checks
  if (sanitized.apiKey.length < 10) {
    return {
      isValid: false,
      error: "API Key appears too short. Please check your credentials.",
      warnings,
      sanitized,
    }
  }

  // For PEM-encoded private keys, length check is different
  const isPemKey = sanitized.apiSecret.includes("BEGIN") && sanitized.apiSecret.includes("PRIVATE KEY")
  if (!isPemKey && sanitized.apiSecret.length < 10) {
    return {
      isValid: false,
      error: "API Secret appears too short. Please check your credentials.",
      warnings,
      sanitized,
    }
  }
  
  // PEM keys should be at least 200 characters (minimum valid PEM)
  if (isPemKey && sanitized.apiSecret.length < 100) {
    return {
      isValid: false,
      error: "Private key appears too short. Please verify the complete PEM-encoded key was pasted.",
      warnings,
      sanitized,
    }
  }

  // Exchange-specific format validation
  const isPemSecret = sanitized.apiSecret.includes("BEGIN") && sanitized.apiSecret.includes("PRIVATE KEY")
  
  switch (exchangeName) {
    case "binance_us":
      // Binance US API keys are typically 64 characters (legacy format)
      if (!isPemSecret && (sanitized.apiKey.length < 32 || sanitized.apiKey.length > 128)) {
        warnings.push("Binance US API keys are typically 32-128 characters. Please verify your key.")
      }
      if (!isPemSecret && (sanitized.apiSecret.length < 32 || sanitized.apiSecret.length > 128)) {
        warnings.push("Binance US API secrets are typically 32-128 characters. Please verify your secret.")
      }
      if (isPemSecret) {
        warnings.push("Binance US typically uses simple string API keys, not PEM-encoded keys. Please verify this is correct.")
      }
      break

    case "kraken":
      // Kraken API keys are typically 56 characters (legacy format)
      if (!isPemSecret && (sanitized.apiKey.length < 40 || sanitized.apiKey.length > 80)) {
        warnings.push("Kraken API keys are typically 40-80 characters. Please verify your key.")
      }
      if (isPemSecret) {
        warnings.push("Kraken typically uses simple string API keys, not PEM-encoded keys. Please verify this is correct.")
      }
      break

    case "coinbase":
    case "coinbase_pro":
    case "coinbase_advanced_trade":
      // Coinbase Advanced Trade uses modern format: name (organizations/.../apiKeys/...) + PEM private key
      // Legacy Coinbase/Pro uses simple string key + secret + passphrase
      if (exchangeName === "coinbase_advanced_trade") {
        // Advanced Trade REQUIRES modern format
        if (!sanitized.apiKey.includes("organizations/") || !sanitized.apiKey.includes("apiKeys/")) {
          return {
            isValid: false,
            error: "Coinbase Advanced Trade requires the modern API key format (name field with organizations/.../apiKeys/... path). Please use the JSON format with name and privateKey fields.",
            warnings,
            sanitized,
          }
        }
        if (!isPemSecret) {
          return {
            isValid: false,
            error: "Coinbase Advanced Trade requires a PEM-encoded private key. Please use the JSON format with name and privateKey fields.",
            warnings,
            sanitized,
          }
        }
      } else {
        // Legacy Coinbase/Pro format
        if (sanitized.apiKey.includes("organizations/") && sanitized.apiKey.includes("apiKeys/")) {
          // User pasted modern format but selected legacy exchange
          warnings.push(
            "You're using the modern API key format (name/privateKey). Consider using 'Coinbase Advanced Trade' instead of legacy Coinbase Pro."
          )
        }
        if (!isPemSecret && (sanitized.apiKey.length < 20 || sanitized.apiKey.length > 100)) {
          warnings.push("Coinbase API keys are typically 20-100 characters. Please verify your key.")
        }
        if (exchangeName === "coinbase_pro" && !sanitized.apiPassphrase && !isPemSecret) {
          // Legacy Coinbase Pro requires passphrase, but modern format doesn't
          return {
            isValid: false,
            error: "Legacy Coinbase Pro requires an API Passphrase. If using modern format (name/privateKey), use 'Coinbase Advanced Trade' instead.",
            warnings,
            sanitized,
          }
        }
      }
      break
    case "coinbase_exchange":
      // Exchange uses legacy API key format
      if (isPemSecret) {
        warnings.push("Coinbase Exchange typically uses simple string API keys, not PEM-encoded keys. Please verify this is correct.")
      }
      break
    case "coinbase_app":
    case "coinbase_server_wallet":
    case "coinbase_trade_api":
      // These may use CDP JWT (modern format) or OAuth
      if (sanitized.apiKey.includes("organizations/") && sanitized.apiKey.includes("apiKeys/")) {
        // Modern CDP format
        if (!isPemSecret) {
          warnings.push("CDP API format should include a PEM-encoded private key. Please verify your credentials.")
        }
      }
      break
  }

  // Check for suspicious patterns in API key (should not be PEM-encoded)
  if (sanitized.apiKey.includes("BEGIN") || sanitized.apiKey.includes("PRIVATE KEY")) {
    return {
      isValid: false,
      error: "API Key should not be a PEM-encoded private key. The API key should be a simple string identifier.",
      warnings,
      sanitized,
    }
  }

  // API Secret can be PEM-encoded for modern exchange formats (e.g., Coinbase Advanced Trade)
  // So we allow BEGIN/PRIVATE KEY in the secret field
  // But we validate it's properly formatted PEM if it contains those markers
  if (sanitized.apiSecret.includes("BEGIN") || sanitized.apiSecret.includes("PRIVATE KEY")) {
    // Validate PEM format
    if (!sanitized.apiSecret.includes("-----BEGIN") || !sanitized.apiSecret.includes("-----END")) {
      warnings.push("Private key appears to be malformed. Please verify the PEM format is correct.")
    }
    // For PEM keys, we need to preserve the format, so don't reject it
    // The exchange client will handle the PEM format appropriately
  }

  // Check for common mistakes (email addresses, URLs, etc.)
  if (sanitized.apiKey.includes("@") || sanitized.apiKey.includes("http")) {
    warnings.push("API Key contains unusual characters. Please verify this is correct.")
  }

  if (sanitized.apiSecret.includes("@") || sanitized.apiSecret.includes("http")) {
    warnings.push("API Secret contains unusual characters. Please verify this is correct.")
  }

  return {
    isValid: true,
    warnings,
    sanitized,
  }
}

/**
 * Detects if content looks like it might be a JSON paste
 */
export function looksLikeJson(content: string): boolean {
  const trimmed = content.trim()
  return trimmed.startsWith("{") && trimmed.endsWith("}") && trimmed.includes('"')
}

