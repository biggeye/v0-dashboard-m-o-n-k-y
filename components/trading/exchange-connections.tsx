"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Link2, ExternalLink, AlertTriangle, CheckCircle2, Info, ArrowLeft } from "lucide-react"
import {
  parseJsonPaste,
  validateApiKeyFormat,
  looksLikeJson,
  sanitizeApiKey,
  sanitizePrivateKey,
} from "@/lib/utils/api-key-validation"
import type {
  ExchangeConnection,
  ExchangeConnectionTemplate,
  ExchangeProvider,
  ExchangeEnv,
  AuthType,
} from "@/lib/types/exchange-client"

// Provider display info (for UI only)
const PROVIDER_INFO: Record<
  ExchangeProvider,
  { name: string; icon: string; defaultApiFamily?: string }
> = {
  coinbase: { name: "Coinbase", icon: "🔵" },
  binance: { name: "Binance US", icon: "🟡", defaultApiFamily: "us" },
  kraken: { name: "Kraken", icon: "🐙", defaultApiFamily: "standard" },
  bybit: { name: "Bybit", icon: "🟠", defaultApiFamily: "standard" },
  simulation: { name: "Simulation", icon: "🎮", defaultApiFamily: "paper" },
}

export function ExchangeConnections() {
  const [connections, setConnections] = useState<ExchangeConnection[]>([])
  const [templates, setTemplates] = useState<ExchangeConnectionTemplate[]>([])
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"select" | "apiFamily" | "credentials" | "instructions">("select")
  const [selectedProvider, setSelectedProvider] = useState<ExchangeProvider | "">("")
  const [selectedApiFamily, setSelectedApiFamily] = useState<string>("")
  const [selectedEnv, setSelectedEnv] = useState<ExchangeEnv>("prod")
  const [displayName, setDisplayName] = useState("")
  
  // Auth fields
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [apiPassphrase, setApiPassphrase] = useState("")
  const [jwtKeyName, setJwtKeyName] = useState("")
  const [jwtPrivateKey, setJwtPrivateKey] = useState("")
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConnections()
    fetchTemplates()
  }, [])

  async function fetchConnections() {
    try {
      const response = await fetch("/api/v1/exchanges/connect")
      const data = await response.json()

      if (data.data) {
        setConnections(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching exchange connections:", error)
    }
  }

  async function fetchTemplates() {
    try {
      const response = await fetch("/api/v1/exchanges/providers")
      const data = await response.json()

      if (data.templates) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error("[v0] Error fetching exchange templates:", error)
    }
  }

  // Get available providers from templates
  const availableProviders = Array.from(
    new Set(templates.map((t) => t.provider))
  ) as ExchangeProvider[]

  // Get templates for selected provider
  const providerTemplates = templates.filter((t) => t.provider === selectedProvider)

  // Get selected template
  const selectedTemplate = templates.find(
    (t) => t.provider === selectedProvider && t.apiFamily === selectedApiFamily
  )

  // Debug: Log selected template info
  useEffect(() => {
    if (selectedTemplate) {
      console.log("[ExchangeConnections] Selected template:", {
        provider: selectedTemplate.provider,
        apiFamily: selectedTemplate.apiFamily,
        authType: selectedTemplate.authType,
        requiredFields: selectedTemplate.requiredFields,
      })
    }
  }, [selectedTemplate])

  async function handleConnect() {
    if (!selectedProvider || !selectedApiFamily || !selectedTemplate) {
      setError("Please select a provider and API family")
      return
    }

    const { authType, requiredFields } = selectedTemplate

    // Validate required fields based on auth type
    if (authType === "api_key") {
      if (!apiKey || !apiSecret) {
        setError("API key and secret are required")
        return
      }
      // Check if passphrase is required (for Coinbase Exchange)
      if (requiredFields.includes("apiPassphrase") && !apiPassphrase) {
        setError("API passphrase is required")
        return
      }
    } else if (authType === "jwt_service") {
      if (!jwtKeyName || !jwtPrivateKey) {
        setError("JWT key name and private key are required")
        return
      }
    } else if (authType === "oauth") {
      // OAuth handled separately - no credentials needed here
    } else if (authType === "none") {
      // Simulation - no credentials needed
    } else {
      setError(`Unsupported auth type: ${authType}`)
      return
    }

    setError(null)
    setLoading(true)

    try {
      // Build request body
      const requestBody: any = {
        provider: selectedProvider,
        apiFamily: selectedApiFamily,
        env: selectedEnv,
        authType,
        label: displayName || undefined,
        auth: {},
      }

      // Add auth fields based on type
      if (authType === "api_key") {
        requestBody.auth.apiKey = apiKey
        requestBody.auth.apiSecret = apiSecret
        if (apiPassphrase) {
          requestBody.auth.apiPassphrase = apiPassphrase
        }
      } else if (authType === "jwt_service") {
        requestBody.auth.jwtKeyName = jwtKeyName
        requestBody.auth.jwtPrivateKey = jwtPrivateKey
      } else if (authType === "oauth") {
        // TODO: Implement OAuth redirect URI
        requestBody.auth.oauthRedirectUri = `${window.location.origin}/api/auth/exchange-callback`
        requestBody.auth.oauthScopes = ["wallet:accounts:read"]
      }

      const response = await fetch("/api/v1/exchanges/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok && data.connection) {
        // Handle OAuth flow
        if (data.oauthUrl) {
          // Redirect to OAuth URL
          window.location.href = data.oauthUrl
          return
        }

        // Success - reset form
        setOpen(false)
        setStep("select")
        resetForm()
        fetchConnections()
      } else {
        setError(data.error || "Failed to connect exchange")
      }
    } catch (error: any) {
      console.error("[v0] Error connecting exchange:", error)
      setError(error.message || "Failed to connect exchange")
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setSelectedProvider("")
    setSelectedApiFamily("")
    setSelectedEnv("prod")
    setDisplayName("")
    setApiKey("")
    setApiSecret("")
    setApiPassphrase("")
    setJwtKeyName("")
    setJwtPrivateKey("")
    setError(null)
  }

  function handleSelectProvider(provider: ExchangeProvider) {
    setSelectedProvider(provider)
    const providerTemplates = templates.filter((t) => t.provider === provider)
    
    if (providerTemplates.length === 1) {
      // Only one template, select it automatically
      setSelectedApiFamily(providerTemplates[0].apiFamily)
      setStep("instructions")
    } else if (providerTemplates.length > 1) {
      // Multiple templates, show selection
      setStep("apiFamily")
      // Don't auto-select - user must choose
      setSelectedApiFamily("")
    } else {
      setStep("instructions")
    }
    setError(null)
  }

  function handleSelectApiFamily(apiFamily: string) {
    setSelectedApiFamily(apiFamily)
    setStep("instructions")
    setError(null)
  }

  function handleBack() {
    if (step === "credentials") {
      setStep("instructions")
    } else if (step === "instructions") {
      const providerTemplates = templates.filter((t) => t.provider === selectedProvider)
      if (providerTemplates.length > 1) {
        setStep("apiFamily")
      } else {
        setStep("select")
        setSelectedProvider("")
      }
    } else if (step === "apiFamily") {
      setStep("select")
      setSelectedProvider("")
      setSelectedApiFamily("")
    }
    setError(null)
  }

  function handleDialogChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      resetForm()
      setStep("select")
    }
  }

  // Get provider icon
  const getProviderIcon = (provider: ExchangeProvider) => {
    return PROVIDER_INFO[provider]?.icon || "📊"
  }

  // Format API family for display
  const formatApiFamily = (family: string) => {
    return family
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Get connection display name
  const getConnectionName = (conn: ExchangeConnection) => {
    return (
      conn.displayName ||
      `${PROVIDER_INFO[conn.provider]?.name || conn.provider} ${formatApiFamily(conn.apiFamily)}`
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Link2 className="w-4 h-4" />
            Exchanges ({connections.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connect Exchange</DialogTitle>
            <DialogDescription>
              {step === "select" && "Select an exchange to connect"}
              {step === "apiFamily" && "Select which API to use"}
              {step === "instructions" && "Follow the setup instructions"}
              {step === "credentials" && "Enter your API credentials"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Select Provider */}
            {step === "select" && (
              <div className="grid grid-cols-2 gap-3">
                {availableProviders.map((provider) => {
                  const info = PROVIDER_INFO[provider]
                  return (
                    <Card
                      key={provider}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary"
                      onClick={() => handleSelectProvider(provider)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{info.icon}</span>
                        <div className="flex-1">
                          <span className="font-semibold block">{info.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {templates.filter((t) => t.provider === provider).length} API
                            {templates.filter((t) => t.provider === provider).length !== 1
                              ? "s"
                              : ""}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Step 1.5: Select API Family */}
            {step === "apiFamily" && selectedProvider && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProviderIcon(selectedProvider)}</span>
                    <span className="font-semibold text-lg">
                      {PROVIDER_INFO[selectedProvider]?.name}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Choose API</AlertTitle>
                  <AlertDescription className="mt-2 text-sm">
                    Select the API variant that matches your use case.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-3">
                  {providerTemplates.map((template) => (
                    <Card
                      key={`${template.provider}-${template.apiFamily}`}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-2 ${
                        selectedApiFamily === template.apiFamily
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => handleSelectApiFamily(template.apiFamily)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{formatApiFamily(template.apiFamily)}</span>
                            <Badge 
                              variant={template.authType === "jwt_service" ? "default" : "outline"} 
                              className="text-xs"
                            >
                              {template.authType === "jwt_service" ? "JWT (CDP)" : template.authType}
                            </Badge>
                          </div>
                          {template.authType === "jwt_service" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Uses name + privateKey JSON format
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            {template.envs.map((env) => (
                              <Badge
                                key={env}
                                variant={env === "prod" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {env.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {selectedApiFamily === template.apiFamily && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Instructions */}
            {step === "instructions" && selectedTemplate && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getProviderIcon(selectedProvider as ExchangeProvider)}
                    </span>
                    <div>
                      <span className="font-semibold text-lg block">
                        {PROVIDER_INFO[selectedProvider as ExchangeProvider]?.name} -{" "}
                        {formatApiFamily(selectedApiFamily)}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Setup Instructions</AlertTitle>
                  <AlertDescription className="mt-2">
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>
                        {selectedTemplate.authType === "oauth"
                          ? "You'll be redirected to authorize the connection"
                          : selectedTemplate.authType === "none"
                            ? "No credentials needed for simulation"
                            : "Create an API key in your exchange account"}
                      </li>
                      {selectedTemplate.authType !== "none" && (
                        <li>
                          Configure API permissions:
                          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                            <li>
                              <strong>Read:</strong> Required
                            </li>
                            <li>
                              <strong>Trade:</strong> Required (if trading)
                            </li>
                            <li>
                              <strong>Withdraw:</strong> Not recommended
                            </li>
                          </ul>
                        </li>
                      )}
                      {selectedTemplate.authType === "api_key" && (
                        <li>Copy your API Key and Secret{selectedTemplate.requiredFields.includes("apiPassphrase") && ", and Passphrase"}</li>
                      )}
                      {selectedTemplate.authType === "jwt_service" && (
                        <li>Copy your JWT key name and private key (CDP format)</li>
                      )}
                      <li>Click "Continue" to enter credentials</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="testnet"
                    checked={selectedEnv === "sandbox"}
                    onCheckedChange={(checked) =>
                      setSelectedEnv(checked === true ? "sandbox" : "prod")
                    }
                  />
                  <Label htmlFor="testnet" className="text-sm cursor-pointer">
                    Use testnet/sandbox environment (for testing only)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Connection Name (Optional)</Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., My Trading Account"
                  />
                </div>

                <Button className="w-full" onClick={() => setStep("credentials")}>
                  Continue to Credentials
                </Button>
              </div>
            )}

            {/* Step 3: Enter Credentials */}
            {step === "credentials" && selectedTemplate && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getProviderIcon(selectedProvider as ExchangeProvider)}
                    </span>
                    <div>
                      <span className="font-semibold block">
                        {PROVIDER_INFO[selectedProvider as ExchangeProvider]?.name} - {formatApiFamily(selectedApiFamily)}
                      </span>
                      <Badge variant="outline" className="text-xs mt-1">
                        Auth: {selectedTemplate.authType}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Connection Failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!selectedTemplate && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Template Not Found</AlertTitle>
                    <AlertDescription>
                      Could not find template for {selectedProvider} / {selectedApiFamily}. Please go back and try again.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedTemplate.authType === "api_key" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key *</Label>
                      <Input
                        id="apiKey"
                        type="text"
                        value={apiKey}
                        onChange={(e) => {
                          const value = e.target.value
                          setApiKey(value)
                          if (looksLikeJson(value)) {
                            const parsed = parseJsonPaste(value)
                            if (parsed?.apiKey) {
                              setApiKey(parsed.apiKey)
                              if (parsed.apiSecret) setApiSecret(parsed.apiSecret)
                              if (parsed.apiPassphrase) setApiPassphrase(parsed.apiPassphrase)
                            }
                          }
                        }}
                        placeholder="Enter your API key (or paste JSON)"
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        You can paste a JSON object with credentials - we'll extract them automatically.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiSecret">API Secret *</Label>
                      <Input
                        id="apiSecret"
                        type="password"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Enter your API secret"
                        disabled={loading}
                      />
                    </div>

                    {selectedTemplate.requiredFields.includes("apiPassphrase") && (
                      <div className="space-y-2">
                        <Label htmlFor="apiPassphrase">API Passphrase *</Label>
                        <Input
                          id="apiPassphrase"
                          type="password"
                          value={apiPassphrase}
                          onChange={(e) => setApiPassphrase(e.target.value)}
                          placeholder="Enter your API passphrase"
                          disabled={loading}
                        />
                      </div>
                    )}
                  </>
                )}

                {selectedTemplate.authType === "jwt_service" && (
                  <>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Coinbase CDP Format</AlertTitle>
                      <AlertDescription className="mt-2 text-sm">
                        You can paste the entire JSON object from Coinbase directly into the JWT Key Name field.
                        We'll automatically extract the name and private key.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="jwtKeyName">JWT Key Name *</Label>
                      <Input
                        id="jwtKeyName"
                        type="text"
                        value={jwtKeyName}
                        onChange={(e) => {
                          const value = e.target.value
                          setJwtKeyName(value)
                          
                          // Auto-detect and parse JSON if pasted (Coinbase CDP format)
                          if (looksLikeJson(value)) {
                            const parsed = parseJsonPaste(value)
                            if (parsed) {
                              if (parsed.warnings.length > 0 && !parsed.apiKey) {
                                setError(parsed.warnings[0])
                                return
                              }
                              // If it's the CDP format (name + privateKey), extract both
                              if (parsed.apiKey && parsed.apiSecret) {
                                setJwtKeyName(parsed.apiKey)
                                setJwtPrivateKey(parsed.apiSecret)
                                setError(null)
                              }
                            }
                          }
                        }}
                        onPaste={(e) => {
                          // Handle paste event to detect JSON
                          const pastedText = e.clipboardData.getData("text")
                          if (looksLikeJson(pastedText)) {
                            const parsed = parseJsonPaste(pastedText)
                            if (parsed) {
                              e.preventDefault()
                              if (parsed.warnings.length > 0 && !parsed.apiKey) {
                                setError(parsed.warnings[0])
                                return
                              }
                              // Extract name and privateKey from Coinbase CDP JSON
                              if (parsed.apiKey && parsed.apiSecret) {
                                setJwtKeyName(parsed.apiKey)
                                setJwtPrivateKey(parsed.apiSecret)
                                setError(null)
                              }
                            }
                          }
                        }}
                        placeholder="Enter JWT key name or paste Coinbase CDP JSON"
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        The API key name from Coinbase CDP (format: organizations/.../apiKeys/...) or paste the entire JSON object
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jwtPrivateKey">Private Key *</Label>
                      <Input
                        id="jwtPrivateKey"
                        type="password"
                        value={jwtPrivateKey}
                        onChange={(e) => setJwtPrivateKey(e.target.value)}
                        placeholder="Enter PEM-encoded private key"
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste the complete PEM-encoded private key (will be auto-filled if you paste JSON above)
                      </p>
                    </div>
                  </>
                )}

                {selectedTemplate.authType === "oauth" && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>OAuth Connection</AlertTitle>
                    <AlertDescription className="mt-2 text-sm">
                      Click "Connect" to be redirected to authorize this connection.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedTemplate.authType === "none" && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Simulation Mode</AlertTitle>
                    <AlertDescription className="mt-2 text-sm">
                      No credentials needed for simulation. Click "Connect" to create a paper trading connection.
                    </AlertDescription>
                  </Alert>
                )}

                <Button className="w-full" onClick={handleConnect} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block" />
                      Testing connection...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Connect Exchange
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {connections.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-sm font-medium">Connected Exchanges</Label>
              <div className="space-y-2">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{getProviderIcon(conn.provider)}</span>
                      <span className="font-semibold">{getConnectionName(conn)}</span>
                      <Badge
                        variant={conn.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {conn.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge
                        variant={conn.env === "prod" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {conn.env === "prod" ? "PROD" : "SANDBOX"}
                      </Badge>
                      <Badge
                        variant={conn.status === "connected" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {conn.status}
                      </Badge>
                      {conn.provider === "coinbase" && (
                        <Badge variant="outline" className="text-xs">
                          {formatApiFamily(conn.apiFamily)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
