// Force static generation
export const dynamic = 'force-static'

export default function LegalPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Legal & Terms of Service</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Terms of Service</h2>
          <p className="text-muted-foreground mb-4">
            By using this platform, you agree to the following terms and conditions:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>You are responsible for all trading decisions and their outcomes</li>
            <li>Automated trading involves risk of financial loss</li>
            <li>You must comply with all applicable laws and regulations</li>
            <li>We are not responsible for losses incurred through use of the platform</li>
            <li>API keys and credentials are your responsibility to secure</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Risk Disclaimer</h2>
          <p className="text-muted-foreground mb-4">
            <strong className="text-foreground">Trading cryptocurrencies involves substantial risk of loss.</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Past performance does not guarantee future results</li>
            <li>Automated strategies can execute trades rapidly and may result in significant losses</li>
            <li>Market conditions can change rapidly, affecting strategy performance</li>
            <li>Always test strategies in paper trading mode before using real funds</li>
            <li>Never trade with funds you cannot afford to lose</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Privacy Policy</h2>
          <p className="text-muted-foreground mb-4">
            We are committed to protecting your privacy:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>All API keys and sensitive credentials are encrypted at rest</li>
            <li>We use Row Level Security (RLS) to isolate user data</li>
            <li>We do not share your personal information with third parties</li>
            <li>You can delete your account and all associated data at any time</li>
            <li>We collect minimal data necessary for platform functionality</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
          <p className="text-muted-foreground">
            This platform is provided "as is" without warranties of any kind. We are not liable for:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
            <li>Financial losses resulting from trading activities</li>
            <li>Platform downtime or service interruptions</li>
            <li>Data loss or corruption</li>
            <li>Third-party exchange issues or API changes</li>
            <li>Unauthorized access to your accounts (though we implement security best practices)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Compliance</h2>
          <p className="text-muted-foreground">
            Users are responsible for ensuring compliance with:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
            <li>Local and international financial regulations</li>
            <li>Tax reporting requirements in your jurisdiction</li>
            <li>Exchange terms of service</li>
            <li>Anti-money laundering (AML) and know-your-customer (KYC) requirements</li>
          </ul>
        </section>

        <section className="mt-8 p-6 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Last updated:</strong> {new Date().toLocaleDateString()}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            For questions or concerns, please contact support through the platform.
          </p>
        </section>
      </div>
    </div>
  )
}

