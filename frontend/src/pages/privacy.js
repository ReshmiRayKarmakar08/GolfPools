import Head from 'next/head';

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy | GolfPools</title>
        <meta
          name="description"
          content="GolfPools privacy policy for account, payment, and compliance data handling."
        />
      </Head>

      <main className="px-6 pt-36 pb-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <section className="glass-card p-8">
            <p className="text-brand-400 text-xs uppercase tracking-[0.2em] mb-3">Legal</p>
            <h1 className="text-3xl md:text-4xl text-white font-semibold mb-3">Privacy Policy</h1>
            <p className="text-dark-400 text-sm">
              Effective date: March 25, 2026
            </p>
          </section>

          <section className="glass-card p-7">
            <h2 className="text-white text-xl font-semibold mb-2">Data We Collect</h2>
            <p className="text-dark-300 leading-relaxed">
              We collect Personal Information (PI), including full name, phone number, and email address, along with account details, score history, subscription status, and payment metadata.
            </p>
          </section>

          <section className="glass-card p-7">
            <h2 className="text-white text-xl font-semibold mb-2">KYC Purpose and Verification</h2>
            <p className="text-dark-300 leading-relaxed">
              Name, phone, and email are processed for identity verification, account security, subscription validation, and KYC-related compliance checks required by payment partners and applicable regulations.
            </p>
          </section>

          <section className="glass-card p-7">
            <h2 className="text-white text-xl font-semibold mb-2">How We Use Data</h2>
            <p className="text-dark-300 leading-relaxed">
              We use data to authenticate users, operate subscriptions, process payments through authorized gateways, administer draw participation, handle support requests, and maintain security and fraud prevention controls.
            </p>
          </section>

          <section className="glass-card p-7">
            <h2 className="text-white text-xl font-semibold mb-2">Data Sharing and Processors</h2>
            <p className="text-dark-300 leading-relaxed">
              Payment and billing data may be shared with payment processors, including Razorpay, strictly for transaction processing, verification, charge management, and regulatory compliance.
            </p>
          </section>

          <section className="glass-card p-7">
            <h2 className="text-white text-xl font-semibold mb-2">Retention and Security</h2>
            <p className="text-dark-300 leading-relaxed">
              We retain records only as needed for legal, accounting, operational, and dispute-resolution purposes. We apply technical and organizational safeguards to protect personal data from unauthorized access and misuse.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
