"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Send, Loader2, Maximize2, Minimize2, Wrench, BarChart3, X, Settings2 } from "lucide-react"
import { useChartVisualization, createVisualizationFromRaw, type StrategyVisualization } from "@/lib/visualization"
import { AGENT_TOOLS } from "@/lib/llm/agent/tools"
import type { Timeframe } from "@/lib/utils/timeframe"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  visualization?: StrategyVisualization
  toolCalls?: Array<{ name: string; input: any; result?: any }>
}

type ViewMode = "sidebar" | "fullscreen"

interface AgentChatProps {
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
  onClose?: () => void
  selectedSymbol?: string
  onSymbolChange?: (symbol: string) => void
  selectedTimeframe?: Timeframe
  onTimeframeChange?: (timeframe: Timeframe) => void
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "30m", label: "30 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
  { value: "1mo", label: "1 Month" },
]

const AVAILABLE_INDICATORS = [
  { id: "sma", name: "SMA", description: "Simple Moving Average" },
  { id: "ema", name: "EMA", description: "Exponential Moving Average" },
  { id: "rsi", name: "RSI", description: "Relative Strength Index" },
  { id: "macd", name: "MACD", description: "Moving Average Convergence Divergence" },
  { id: "bollinger", name: "Bollinger Bands", description: "Bollinger Bands" },
]

export function AgentChat({
  viewMode: externalViewMode,
  onViewModeChange,
  onClose,
  selectedSymbol: externalSymbol,
  onSymbolChange,
  selectedTimeframe: externalTimeframe,
  onTimeframeChange,
}: AgentChatProps = {}) {
  const { addVisualization, visualizations, removeVisualization, getOverlaysForSymbol } = useChartVisualization()
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>("sidebar")
  const [showTools, setShowTools] = useState(false)
  const [showChartControls, setShowChartControls] = useState(false)
  const [internalSymbol, setInternalSymbol] = useState("BTC")
  const [internalTimeframe, setInternalTimeframe] = useState<Timeframe>("1h")
  
  const viewMode = externalViewMode ?? internalViewMode
  const selectedSymbol = externalSymbol ?? internalSymbol
  const selectedTimeframe = externalTimeframe ?? internalTimeframe
  
  const handleViewModeChange = (mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode)
    } else {
      setInternalViewMode(mode)
    }
  }
  
  const handleSymbolChange = (symbol: string) => {
    if (onSymbolChange) {
      onSymbolChange(symbol)
    } else {
      setInternalSymbol(symbol)
    }
  }
  
  const handleTimeframeChange = (timeframe: Timeframe) => {
    if (onTimeframeChange) {
      onTimeframeChange(timeframe)
    } else {
      setInternalTimeframe(timeframe)
    }
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your crypto trading AI assistant. I can help you analyze price trends, calculate technical indicators, manage your portfolio, and create trading strategies. What would you like to analyze?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const activeOverlays = getOverlaysForSymbol(selectedSymbol)

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleAddIndicator = async (indicator: string) => {
    if (!selectedSymbol) return
    
    setLoading(true)
    try {
      const response = await fetch("/api/v1/llm/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Calculate ${indicator} for ${selectedSymbol}`,
          conversationHistory: messages,
        }),
      })

      if (!response.ok) throw new Error("Failed to calculate indicator")

      const data = await response.json()
      
      if (data.visualization) {
        const visualization = createVisualizationFromRaw(data.visualization)
        if (visualization) {
          addVisualization(visualization)
        }
      }
    } catch (error) {
      console.error("Indicator error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const messageText = input
    setInput("")
    setLoading(true)

    try {
      // Call LLM with the message
      const response = await fetch("/api/v1/llm/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: messages,
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()

      // Extract visualization data if present
      let visualization: StrategyVisualization | undefined
      let toolCalls: Array<{ name: string; input: any; result?: any }> | undefined
      
      try {
        // Try to parse visualization from result if it's a JSON string
        const resultContent = data.result || ""
        const jsonMatch = resultContent.match(/```json\s*([\s\S]*?)\s*```/) || resultContent.match(/\{[\s\S]*"visualization"[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = typeof jsonMatch === "string" ? JSON.parse(jsonMatch) : JSON.parse(jsonMatch[1] || jsonMatch[0])
          if (parsed.visualization) {
            visualization = createVisualizationFromRaw(parsed.visualization) ?? undefined
            if (visualization) {
              addVisualization(visualization)
            }
          }
        }
      } catch (e) {
        // If parsing fails, try direct extraction from data
        if (data.visualization) {
          visualization = createVisualizationFromRaw(data.visualization) ?? undefined
          if (visualization) {
            addVisualization(visualization)
          }
        }
      }
      
      // Extract tool calls from response if available
      if (data.toolCalls) {
        toolCalls = data.toolCalls
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.result || "I'm analyzing your request. Could you provide more details?",
        timestamp: new Date(),
        visualization,
        toolCalls,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }
  
  // Keyboard shortcut for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f" && e.shiftKey) {
        e.preventDefault()
        const newMode = viewMode === "fullscreen" ? "sidebar" : "fullscreen"
        handleViewModeChange(newMode)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  const cardClassName = viewMode === "fullscreen" 
    ? "fixed inset-0 z-[100] m-0 rounded-none h-full flex flex-col"
    : "h-full flex flex-col"

  return (
    <Card className={cardClassName}>
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Crypto Analysis Assistant
              {activeOverlays.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeOverlays.length} overlay{activeOverlays.length > 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Powered by AI - Ask questions about crypto analysis, indicators, or your portfolio
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Chart Controls Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChartControls(!showChartControls)}
              className={showChartControls ? "bg-muted" : ""}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            {/* Tools Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTools(!showTools)}
              className={showTools ? "bg-muted" : ""}
            >
              <Wrench className="w-4 h-4" />
            </Button>
            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange(viewMode === "fullscreen" ? "sidebar" : "fullscreen")}
              title={viewMode === "fullscreen" ? "Exit fullscreen (Shift+Cmd/Ctrl+F)" : "Enter fullscreen (Shift+Cmd/Ctrl+F)"}
            >
              {viewMode === "fullscreen" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            {/* Close Button (only in sidebar mode) */}
            {viewMode === "sidebar" && onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Chart Controls Panel */}
        {showChartControls && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span className="text-sm font-medium">Chart Controls</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Symbol</label>
                <Input
                  value={selectedSymbol}
                  onChange={(e) => handleSymbolChange(e.target.value.toUpperCase())}
                  placeholder="BTC"
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Timeframe</label>
                <Select value={selectedTimeframe} onValueChange={handleTimeframeChange}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map((tf) => (
                      <SelectItem key={tf.value} value={tf.value}>
                        {tf.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Quick Indicators</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_INDICATORS.map((indicator) => (
                  <Button
                    key={indicator.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddIndicator(indicator.id)}
                    disabled={loading || !selectedSymbol}
                    className="h-7 text-xs"
                  >
                    {indicator.name}
                  </Button>
                ))}
              </div>
            </div>
            {activeOverlays.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Active Overlays</label>
                <div className="flex flex-wrap gap-2">
                  {activeOverlays.map((overlay) => (
                    <Badge
                      key={overlay.id}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-destructive/10"
                      onClick={() => {
                        const vis = visualizations.find(v => v.overlays.some(o => o.id === overlay.id))
                        if (vis) removeVisualization(vis.strategyId)
                      }}
                    >
                      {overlay.label}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Tools Panel */}
        {showTools && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="text-sm font-medium">Available Tools</span>
            </div>
            <div className="space-y-2">
              {AGENT_TOOLS.map((tool) => (
                <div key={tool.name} className="p-2 bg-background rounded border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tool.name}</span>
                        {tool.requiresAuth && (
                          <Badge variant="outline" className="text-xs">Auth</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                      {tool.tags && tool.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tool.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <ScrollArea className="flex-1 pr-4 rounded-lg border p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex flex-col gap-1 max-w-xs lg:max-w-md">
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">{message.timestamp.toLocaleTimeString()}</span>
                  </div>
                  {/* Tool Calls Display */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {message.toolCalls.map((toolCall, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Wrench className="w-3 h-3 mr-1" />
                          {toolCall.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* Visualization Indicator */}
                  {message.visualization && (
                    <Badge variant="secondary" className="text-xs w-fit">
                      <BarChart3 className="w-3 h-3 mr-1" />
                      Chart updated
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Ask about crypto analysis..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
