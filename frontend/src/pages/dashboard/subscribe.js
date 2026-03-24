import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { charitiesAPI, paymentsAPI, subscriptionsAPI } from '../../utils/api';
import useAuthStore from '../../context/authStore';

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly Plan',
    price: 999,
    display: '₹999',
    period: 'per month',
    features: [
      '5 Stableford score slots',
      'Every monthly draw entry',
      'Min 10% charity contribution',
      'Winner notifications',
      'Cancel anytime',
    ],
  },
  {
    id: 'yearly',
    label: 'Yearly Plan',
    price: 9999,
    display: '₹9,999',
    period: 'per year',
    badge: 'Save ₹1,989',
    features: [
      '5 Stableford score slots',
      'All 12 monthly draws included',
      'Priority charity matching',
      'Winner notifications',
      'Exclusive yearly badge',
    ],
  },
];

// Load Razorpay script
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function SubscribePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();

  const defaultPlan = router.query.plan || 'monthly';
  const defaultCharity = router.query.charity || '';

  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [selectedCharity, setSelectedCharity] = useState(defaultCharity);
  const [charityPct, setCharityPct] = useState(10);
  const [paying, setPaying] = useState(false);

  const { data: existingSub } = useQuery('subscription', subscriptionsAPI.getCurrent, {
    select: (r) => r.data.subscription,
  });

  const { data: charities } = useQuery('charities', () => charitiesAPI.getAll(), {
    select: (r) => r.data.charities,
  });

  useEffect(() => {
    if (router.query.charity) setSelectedCharity(router.query.charity);
    if (router.query.plan) setSelectedPlan(router.query.plan);
  }, [router.query]);

  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];
  const charityObj = charities?.find((c) => c.id === selectedCharity);
  const charityAmount = Math.round((plan.price * charityPct) / 100);
  const prizePool = Math.round(plan.price * 0.75);

  const handleSubscribe = async () => {
    if (!selectedCharity) {
      toast.error('Please select a charity to support');
      return;
    }

    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Please try again.');
        setPaying(false);
        return;
      }

      // Create order on backend
      const { data: orderData } = await paymentsAPI.createOrder({
        plan_type: selectedPlan,
        charity_id: selectedCharity,
        charity_percentage: charityPct,
      });

      const options = {
        key: orderData.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Golf Charity Platform',
        description: `${plan.label} — ${charityObj?.name || 'Charity'}`,
        image: '/logo.png',
        order_id: orderData.order_id,
        prefill: {
          name: `${user?.first_name} ${user?.last_name}`,
          email: user?.email,
        },
        theme: {
          color: '#00c6ff',
          backdrop_color: '#060813',
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast('Payment cancelled', { icon: '!' });
          },
        },
        handler: async (response) => {
          try {
            await paymentsAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              subscription_id: orderData.subscription_id,
            });

            await refreshUser();
            toast.success('Subscription activated! Welcome to Golf Charity Platform!');
            router.push('/dashboard');
          } catch (err) {
            toast.error(err.response?.data?.error || 'Payment verification failed. Contact support.');
            setPaying(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not initiate payment');
      setPaying(false);
    }
  };

  if (existingSub?.status === 'active') {
    return (
      <DashboardLayout title="Subscription">
        <div className="max-w-lg mx-auto text-center glass-card p-10">
          <div className="mb-4"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00E5CC" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 9"/></svg></div>
          <h2 className="text-white font-bold text-xl mb-2">You're already subscribed!</h2>
          <p className="text-dark-400 mb-6">
            Your {existingSub.plan_type} subscription is active until{' '}
            {new Date(existingSub.current_period_end).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}.
          </p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary px-8 py-3">
            Go to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Subscribe">
      <Head>
        <title>Subscribe — Golf Charity Platform</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Choose Your Plan</h2>
          <p className="text-dark-400 mt-1">
            Subscribe to enter monthly draws and support your chosen charity
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left — Plan & Charity */}
          <div className="space-y-6">
            {/* Plan selector */}
            <div className="glass-card p-6">
              <h3 className="text-white font-semibold mb-4">Select Plan</h3>
              <div className="space-y-3">
                {PLANS.map((p) => (
                  <motion.button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 relative ${
                      selectedPlan === p.id
                        ? 'border-brand-500/60 bg-brand-500/10'
                        : 'border-white/8 hover:border-white/20'
                    }`}
                  >
                    {p.badge && (
                      <span className="absolute top-3 right-3 badge-success">{p.badge}</span>
                    )}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          selectedPlan === p.id ? 'border-brand-500 bg-brand-500' : 'border-dark-500'
                        }`}
                      >
                        {selectedPlan === p.id && (
                          <div className="w-2 h-2 rounded-full bg-dark-950" />
                        )}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{p.label}</div>
                        <div className="text-brand-400 font-mono font-bold">
                          {p.display}{' '}
                          <span className="text-dark-500 font-normal text-xs">{p.period}</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Charity selector */}
            <div className="glass-card p-6">
              <h3 className="text-white font-semibold mb-1">Support a Charity</h3>
              <p className="text-dark-500 text-sm mb-4">
                Minimum 10% of your subscription goes to your chosen charity
              </p>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 mb-4">
                {charities?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCharity(c.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
                      selectedCharity === c.id
                        ? 'border-brand-500/60 bg-brand-500/10'
                        : 'border-white/6 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          selectedCharity === c.id ? 'bg-brand-500 border-brand-500' : 'border-dark-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{c.name}</div>
                        <div className="text-dark-500 text-xs">{c.category}</div>
                      </div>
                      {c.is_featured && (
                        <span className="text-yellow-400 text-xs">⭐</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Charity percentage slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-dark-300">
                    Contribution:{' '}
                    <span className="text-brand-400 font-bold">{charityPct}%</span>
                  </label>
                  <span className="text-dark-500 text-xs">min 10%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  value={charityPct}
                  onChange={(e) => setCharityPct(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-dark-600 mt-1">
                  <span>10%</span>
                  <span>30%</span>
                  <span>50%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Order Summary */}
          <div className="space-y-4">
            <div className="glass-card p-6 sticky top-24">
              <h3 className="text-white font-semibold mb-5">Order Summary</h3>

              {/* Plan */}
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">{plan.label}</span>
                  <span className="text-white font-mono">{plan.display}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Billing period</span>
                  <span className="text-white capitalize">{plan.period}</span>
                </div>
              </div>

              {/* Distribution breakdown */}
              <div
                className="rounded-xl p-4 mb-5 space-y-2"
                style={{
                  background: 'rgba(0,198,255,0.04)',
                  border: '1px solid rgba(0,198,255,0.1)',
                }}
              >
                <div className="text-dark-400 text-xs uppercase tracking-widest mb-3">
                  How your money is used
                </div>
                {[
                  {
                    label: `♥ ${charityObj?.name || 'Charity'}`,
                    value: charityAmount,
                    pct: charityPct,
                    color: '#00E5CC',
                  },
                  {
                    label: '★ Prize Pool',
                    value: prizePool,
                    pct: 75,
                    color: '#FFD700',
                  },
                  {
                    label: '⚙️ Platform',
                    value: plan.price - charityAmount - prizePool,
                    pct: 15,
                    color: '#7983a8',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span style={{ color: item.color }}>{item.label}</span>
                    <span className="text-white font-mono">
                      ₹{item.value.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                {/* Bar breakdown */}
                <div className="flex h-2 rounded-full overflow-hidden mt-3">
                  <div
                    style={{ width: `${charityPct}%`, background: '#00E5CC' }}
                    className="transition-all duration-300"
                  />
                  <div style={{ width: '75%', background: '#FFD700' }} />
                  <div style={{ flex: 1, background: '#3b437d' }} />
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-dark-300">
                    <svg className="text-brand-400 inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Total */}
              <div
                className="flex items-center justify-between py-4 border-t border-white/8 mb-5"
              >
                <span className="text-white font-semibold">Total Today</span>
                <span className="text-2xl font-display gradient-text">
                  {plan.display}
                </span>
              </div>

              {/* Pay button */}
              <motion.button
                onClick={handleSubscribe}
                disabled={paying || !selectedCharity}
                className="btn-gold w-full py-4 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: paying ? 1 : 1.02 }}
                whileTap={{ scale: paying ? 1 : 0.98 }}
              >
                {paying ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Opening Payment...
                  </span>
                ) : (
                  `Pay ${plan.display} via Razorpay →`
                )}
              </motion.button>

              {!selectedCharity && (
                <p className="text-amber-400 text-xs text-center mt-2">
                  ! Please select a charity to continue
                </p>
              )}

              {/* Trust badges */}
              <div className="mt-4 flex items-center justify-center gap-4 text-dark-600 text-xs">
                <span>🔒 Secure Payment</span>
                <span>•</span>
                <span>📋 Cancel Anytime</span>
                <span>•</span>
                <span>🏦 Razorpay</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
