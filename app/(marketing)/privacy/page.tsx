import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-text px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/" className="text-xs text-blue font-semibold">← Home</Link>
        <h1 className="text-2xl font-black text-white">Privacy Policy</h1>
        <p className="text-sm text-text-dark">Last updated: September 2026</p>
        <div className="space-y-4 text-sm text-text leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-1">1. Data we collect</h2>
            <p>Account details (name, email, phone, country), identity documents for verification (Tier 1 KYC), trading activity, deposits and withdrawals, device and login metadata.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-1">2. How we use it</h2>
            <p>To operate your account, verify identity, prevent fraud, meet anti-money-laundering obligations, and improve the platform. We do not sell personal data.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-1">3. Document storage</h2>
            <p>Identity documents are encrypted at rest (AES-256-GCM) and accessible only to authorized compliance staff. Full provider-based verification (Track B) adds third-party processing under data-processing agreements.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-1">4. Retention</h2>
            <p>Financial records are retained for 7 years to meet legal obligations, even after account deletion. Marketing data is deleted within 2 years of account closure.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-1">5. Your rights</h2>
            <p>Access, rectify, export, and erase your data from the Account page (Download My Data). Contact support for requests we cannot automate yet.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-1">6. Cookies</h2>
            <p>We use strictly necessary cookies for authentication and security, plus a consent remembered for 12 months. No advertising trackers.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
