// Force static generation
export const dynamic = 'force-static'

export default function TutorialsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Trading Strategy Tutorials</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <p className="text-muted-foreground mb-4">
            Learn the fundamentals of crypto trading and how to use our platform effectively.
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Understanding market orders vs limit orders</li>
            <li>Setting up your first trading strategy</li>
            <li>Risk management basics</li>
            <li>Reading price charts and indicators</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Technical Indicators</h2>
          <p className="text-muted-foreground mb-4">
            Master the technical indicators available on our platform.
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Moving Averages (SMA, EMA)</li>
            <li>Relative Strength Index (RSI)</li>
            <li>MACD indicator</li>
            <li>Bollinger Bands</li>
            <li>Average True Range (ATR)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Strategy Building</h2>
          <p className="text-muted-foreground mb-4">
            Create and deploy automated trading strategies.
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Defining entry and exit conditions</li>
            <li>Setting risk parameters</li>
            <li>Backtesting strategies</li>
            <li>Paper trading before going live</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Advanced Topics</h2>
          <p className="text-muted-foreground mb-4">
            Advanced techniques for experienced traders.
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Multi-exchange arbitrage</li>
            <li>Portfolio rebalancing strategies</li>
            <li>Using LLM agents for strategy development</li>
            <li>Web3 wallet integration</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

