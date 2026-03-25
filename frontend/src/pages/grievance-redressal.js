import Head from 'next/head';
import { motion } from 'framer-motion';

export default function GrievanceRedressalPage() {
  return (
    <>
      <Head>
        <title>Grievance Redressal | GolfPools</title>
        <meta
          name="description"
          content="GolfPools grievance redressal process and customer complaint escalation timelines."
        />
      </Head>

      <main className="px-6 pt-36 pb-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <section className="glass-card p-8">
            <p className="text-brand-400 text-xs uppercase tracking-[0.2em] mb-3">Support</p>
            <h1 className="text-3xl md:text-4xl text-white font-semibold mb-3">Grievance Redressal</h1>
            <p className="text-dark-400 text-sm">Effective date: March 25, 2026</p>
          </section>

          <motion.section
            className="glass-card p-8"
            initial={{ opacity: 0, y: 16, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45 }}
          >
            <h2 className="text-white text-xl font-semibold mb-3">Customer Complaint Channel</h2>
            <p className="text-dark-300 leading-relaxed mb-5">
              For payment, subscription, or account-related complaints, please reach out using the grievance contact details below.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-5">
              <div className="rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Grievance Officer</p>
                <p className="text-white">Niloy Mallik</p>
              </div>
              <div className="rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Email</p>
                <p className="text-white">[grievance@yourdomain.com]</p>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ border: '1px solid rgba(0,198,255,0.25)', background: 'rgba(0,198,255,0.07)' }}>
              <p className="text-brand-300 text-sm">
                All grievances will be acknowledged and addressed within <span className="font-semibold">5 business days</span>.
              </p>
            </div>
          </motion.section>
        </div>
      </main>
    </>
  );
}
