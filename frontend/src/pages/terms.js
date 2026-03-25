import Head from 'next/head';

const sections = [
  {
    title: '1. Eligibility (18+ Only)',
    body:
      'GolfPools services are available only to individuals who are at least eighteen (18) years old and legally competent to enter binding agreements. By registering, you confirm you meet this age requirement.',
  },
  {
    title: '2. Subscription Engine',
    body:
      'GolfPools offers recurring plans on a monthly or yearly billing cycle. By activating a paid plan, you authorize recurring billing for the selected cycle until cancellation is requested under the cancellation terms below.',
  },
  {
    title: '3. Mandatory Charity Contribution',
    body:
      'A minimum of ten percent (10%) of each subscription fee is allocated toward the user-selected charity program. This allocation is part of the subscription structure and is applied at the time of payment processing.',
  },
  {
    title: '4. Draw Participation',
    body:
      'Users with an active subscription may participate in monthly draws according to platform rules. Participation status, entry criteria, and draw outcomes are recorded digitally and form part of the service fulfillment lifecycle.',
  },
  {
    title: '5. Renewal and Cancellation',
    body:
      'Subscriptions renew automatically at the end of each billing cycle unless cancelled before renewal. If cancelled, access remains active until the current paid period ends, after which renewal stops.',
  },
  {
    title: '6. Compliance and Account Responsibility',
    body:
      'Users agree to provide accurate account and payment information. GolfPools may suspend access for fraud, misuse, or policy violations and may update these terms to maintain legal, operational, or payment-network compliance.',
  },
];

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service | GolfPools</title>
        <meta
          name="description"
          content="GolfPools terms of service including subscription cycles, charity contribution rules, and renewal terms."
        />
      </Head>

      <main className="px-6 pt-36 pb-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <section className="glass-card p-8">
            <p className="text-brand-400 text-xs uppercase tracking-[0.2em] mb-3">Legal</p>
            <h1 className="text-3xl md:text-4xl text-white font-semibold mb-3">Terms of Service</h1>
            <p className="text-dark-400 text-sm">
              Effective date: March 25, 2026
            </p>
          </section>

          {sections.map((section) => (
            <section key={section.title} className="glass-card p-7">
              <h2 className="text-white text-xl font-semibold mb-2">{section.title}</h2>
              <p className="text-dark-300 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
