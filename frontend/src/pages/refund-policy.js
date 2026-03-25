import Head from 'next/head';

export default function RefundPolicyPage() {
  return (
    <>
      <Head>
        <title>Refund & Cancellation | GolfPools</title>
        <meta
          name="description"
          content="GolfPools refund and cancellation policy for monthly and yearly subscription plans."
        />
      </Head>

      <main className="px-6 pt-36 pb-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <section className="glass-card p-8">
            <p className="text-brand-400 text-xs uppercase tracking-[0.2em] mb-3">Legal</p>
            <h1 className="text-3xl md:text-4xl text-white font-semibold mb-3">Refund & Cancellation</h1>
            <p className="text-dark-400 text-sm">
              Effective date: March 25, 2026
            </p>
          </section>

          <section className="glass-card p-7">
            <h2 className="text-white text-xl font-semibold mb-2">Subscription Lifecycle</h2>
            <p className="text-dark-300 leading-relaxed">
              Monthly and yearly plans are billed in advance and renew automatically unless cancellation is requested before the next renewal date. A cancellation request stops future renewals but does not terminate access for the already-paid active period.
            </p>
          </section>

          <section className="glass-card p-7">
            <h2 className="text-white text-xl font-semibold mb-2">Monthly Draw Participation Rule</h2>
            <p className="text-dark-300 leading-relaxed">
              Once a user has participated in a monthly draw during a billing month, the fee for that month is non-refundable. Participation is treated as service consumption for that cycle.
            </p>
          </section>

          <section className="glass-card p-7">
            <h2 className="text-white text-xl font-semibold mb-2">Refund Eligibility</h2>
            <p className="text-dark-300 leading-relaxed">
              Refund requests may be reviewed only for duplicate charges, unauthorized payments, or technical billing errors. Approved refunds, if any, are processed to the original payment method according to payment-processor timelines.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
