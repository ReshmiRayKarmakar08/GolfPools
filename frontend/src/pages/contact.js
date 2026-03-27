import Head from 'next/head';
import { motion } from 'framer-motion';

export default function ContactPage() {
  return (
    <>
      <Head>
        <title>Contact Us | GolfPools</title>
        <meta
          name="description"
          content="Official contact details for GolfPools customer support and compliance queries."
        />
      </Head>

      <main className="px-6 pt-36 pb-10">
        <div className="max-w-4xl mx-auto">
          <motion.section
            className="glass-card p-8 md:p-10"
            initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-brand-400 text-xs uppercase tracking-[0.2em] mb-3">Contact</p>
            <h1 className="text-3xl md:text-4xl text-white font-semibold mb-6">Contact Us</h1>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Registered Business Name</p>
                <p className="text-white">GolfPools</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Business Email</p>
                <p className="text-white">contact@golfpools.com</p>
              </div>
              <div className="rounded-xl p-4 md:col-span-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Business Address</p>
                <p className="text-white">Kolkata,westBengal</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Phone</p>
                <p className="text-white">+91-9832645693</p>
              </div>
            </div>

            <p className="text-dark-400 text-sm mt-6">
              {/* Replace placeholder details with your verified business information before submitting for Razorpay review. */}
            </p>
          </motion.section>
        </div>
      </main>
    </>
  );
}
