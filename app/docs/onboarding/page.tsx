// Force static generation
export const dynamic = 'force-static'

export default function OnboardingPage() {
  const steps = [
    {
      title: "Create Your Account",
      description: "Sign up with your email and verify your account. No credit card required to get started."
    },
    {
      title: "Connect an Exchange (Optional)",
      description: "Link your exchange account using API keys. Start with paper trading if you're new to automated trading."
    },
    {
      title: "Explore the Dashboard",
      description: "Familiarize yourself with the portfolio view, price charts, and available indicators."
    },
    {
      title: "Add Tokens to Track",
      description: "Add cryptocurrencies you want to monitor. You can track prices, set alerts, and analyze trends."
    },
    {
      title: "Create Your First Strategy",
      description: "Start with a simple strategy using basic indicators. Test it in paper trading mode first."
    },
    {
      title: "Set Risk Limits",
      description: "Configure maximum position sizes, daily limits, and stop-loss parameters to protect your capital."
    },
    {
      title: "Monitor and Refine",
      description: "Review your strategy performance, adjust parameters, and iterate based on market conditions."
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Getting Started</h1>
      
      <div className="space-y-8">
        <section>
          <p className="text-muted-foreground mb-6">
            Welcome to our crypto trading platform! Follow these steps to get started with automated trading,
            portfolio management, and market analysis.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Onboarding Steps</h2>
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Need Help?</h2>
          <p className="text-muted-foreground mb-4">
            Check out our <a href="/docs/tutorials" className="text-primary hover:underline">tutorials</a> and{" "}
            <a href="/docs/faq" className="text-primary hover:underline">FAQ</a> for more detailed information.
          </p>
        </section>
      </div>
    </div>
  )
}

