// Force static generation
export const dynamic = 'force-static'

export default function FAQPage() {
  const faqs = [
    {
      question: "What exchanges are supported?",
      answer: "We support Coinbase (multiple API families), Binance US, Kraken, Bybit, and a simulation/paper trading mode. Each exchange has different capabilities and authentication methods."
    },
    {
      question: "How do I connect my exchange account?",
      answer: "Go to the Exchange Connections page and select your exchange. You'll need to provide API keys with appropriate permissions. We encrypt and securely store your credentials."
    },
    {
      question: "Is my data secure?",
      answer: "Yes. All API keys are encrypted at rest. We use Supabase with Row Level Security (RLS) to ensure data isolation between users. We never store your passwords."
    },
    {
      question: "Can I use this for paper trading?",
      answer: "Yes! We have a built-in simulation mode that allows you to test strategies without risking real funds. Perfect for learning and strategy development."
    },
    {
      question: "What technical indicators are available?",
      answer: "We support SMA, EMA, RSI, MACD, Bollinger Bands, and ATR. More indicators can be added based on community feedback."
    },
    {
      question: "How do automated strategies work?",
      answer: "You define entry/exit conditions using technical indicators, set risk parameters, and the system executes trades automatically when conditions are met. You can enable/disable strategies at any time."
    },
    {
      question: "What chains are supported for Web3 wallets?",
      answer: "We support Ethereum Mainnet, BNB Smart Chain, Polygon, Arbitrum One, and Optimism. More chains can be added based on demand."
    },
    {
      question: "Can I use LLM agents for trading?",
      answer: "Yes! Our platform includes LLM-powered analysis agents that can help with market analysis and strategy development. However, live trading requires explicit approval."
    },
    {
      question: "What happens if the platform goes down?",
      answer: "Your exchange connections remain active on the exchange side. We recommend setting up stop-loss orders directly on exchanges for critical positions."
    },
    {
      question: "How are fees calculated?",
      answer: "Fees are determined by your exchange and are displayed before order execution. We don't charge any additional fees beyond what your exchange charges."
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Frequently Asked Questions</h1>
      
      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="border-b pb-6 last:border-b-0">
            <h2 className="text-xl font-semibold mb-2">{faq.question}</h2>
            <p className="text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

