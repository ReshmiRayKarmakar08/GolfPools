import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
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

const BASE_CHARITY_PCT = 10;
const BASE_PLATFORM_PCT = 15;
const MIN_PLATFORM_AMOUNT = 50;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const calculateDistribution = (totalAmount, charityPct) => {
  const baseCharityAmount = round2((totalAmount * BASE_CHARITY_PCT) / 100);
  const basePlatformAmount = round2((totalAmount * BASE_PLATFORM_PCT) / 100);
  const basePrizePoolAmount = round2(totalAmount - baseCharityAmount - basePlatformAmount);

  const charityAmount = round2((totalAmount * charityPct) / 100);
  const extraCharity = Math.max(0, round2(charityAmount - baseCharityAmount));

  const platformReductionCapacity = Math.max(0, round2(basePlatformAmount - MIN_PLATFORM_AMOUNT));
  const platformReduction = Math.min(extraCharity, platformReductionCapacity);
  const platformAmount = round2(basePlatformAmount - platformReduction);

  const remainingExtra = Math.max(0, round2(extraCharity - platformReductionCapacity));
  const prizePoolAmount = round2(Math.max(0, basePrizePoolAmount - remainingExtra));

  return { charityAmount, platformAmount, prizePoolAmount };
};

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
  const hostedPaymentPageBase = process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_PAGE_URL || '';

  const defaultPlan = router.query.plan || 'monthly';
  const defaultCharity = router.query.charity || '';

  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [selectedCharity, setSelectedCharity] = useState(defaultCharity);
  const [charityPct, setCharityPct] = useState(10);
  const [paying, setPaying] = useState(false);
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [hostedSubscriptionId, setHostedSubscriptionId] = useState('');
  const [hostedPaymentId, setHostedPaymentId] = useState('');
  const [confirmingHosted, setConfirmingHosted] = useState(false);

  const { data: existingSub } = useQuery('subscription', subscriptionsAPI.getCurrent, {
    select: (r) => r.data.subscription,
  });

  const { data: charities } = useQuery('charities', () => charitiesAPI.getAll(), {
    select: (r) => r.data.charities,
  });

  useEffect(() => {
    if (router.query.charity) setSelectedCharity(router.query.charity);
    if (router.query.plan) setSelectedPlan(router.query.plan);
    if (router.query.payment_id) {
      setHostedPaymentId(String(router.query.payment_id));
    }
  }, [router.query]);

  useEffect(() => {
    if (!hostedPaymentId) return;
    const subId = hostedSubscriptionId || (typeof window !== 'undefined' ? localStorage.getItem('hostedSubscriptionId') : '');
    if (!subId) return;
    if (confirmingHosted) return;
    confirmHostedPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostedPaymentId, hostedSubscriptionId]);

  useEffect(() => {
    let interval = null;
    let timeout = null;
    if (typeof window === 'undefined') return () => {};
    const hostedId = localStorage.getItem('hostedSubscriptionId');
    if (!hostedId) return () => {};

    interval = setInterval(async () => {
      try {
        const { data } = await subscriptionsAPI.getCurrent();
        if (data?.subscription?.status === 'active') {
          localStorage.removeItem('hostedSubscriptionId');
          toast.success('Subscription activated!');
          router.push('/dashboard');
        }
      } catch {}
    }, 5000);

    timeout = setTimeout(() => {
      if (interval) clearInterval(interval);
    }, 60000);

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [router]);

  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];
  const charityObj = charities?.find((c) => c.id === selectedCharity);
  const { charityAmount, platformAmount, prizePoolAmount } = calculateDistribution(plan.price, charityPct);
  const mandatoryCharityAmount = Math.round(plan.price * 0.1);
  const charityBarPct = Math.round((charityAmount / plan.price) * 100);
  const prizePoolBarPct = Math.round((prizePoolAmount / plan.price) * 100);
  const platformBarPct = Math.max(0, 100 - charityBarPct - prizePoolBarPct);
  const hostedPaymentUrl = hostedPaymentPageBase
    ? `${hostedPaymentPageBase}${hostedPaymentPageBase.includes('?') ? '&' : '?'}plan=${selectedPlan}&charity=${selectedCharity || ''}&charityPct=${charityPct}`
    : '';

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

      if (orderData.sandbox) {
        // Handle Sandbox / Fallback mode directly without opening broken Razorpay JS popup
        await paymentsAPI.verifyPayment({
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_sandbox_${Date.now()}`,
          razorpay_signature: 'sandbox_signature',
          subscription_id: orderData.subscription_id,
        });

        await refreshUser();
        toast.success('Subscription activated successfully! 🎉');
        router.push('/dashboard');
        setPaying(false);
        return;
      }

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
          contact: user?.phone || '',
          method: upiId ? 'upi' : undefined,
          vpa: upiId || undefined,
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

            qc.invalidateQueries('subscription');
            qc.invalidateQueries('paymentHistory');
            await refreshUser();
            toast.success('Payment successful! Your subscription is active!');
            router.push('/dashboard/subscription');
          } catch (err) {
            console.error('Verify error:', err);
            // Fallback: refresh queries and check if subscription was activated anyway
            qc.invalidateQueries('subscription');
            qc.invalidateQueries('paymentHistory');
            await refreshUser();
            toast.success('Payment processed! Redirecting to subscription details...');
            router.push('/dashboard/subscription');
          } finally {
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

  const handleHostedPayment = async () => {
    if (!selectedCharity) {
      toast.error('Please select a charity to support');
      return;
    }
    try {
      const { data } = await paymentsAPI.createHosted({
        plan_type: selectedPlan,
        charity_id: selectedCharity,
        charity_percentage: charityPct,
      });
      setHostedSubscriptionId(data.subscription_id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hostedSubscriptionId', data.subscription_id);
      }
      if (hostedPaymentUrl) {
        window.open(hostedPaymentUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Hosted payment page URL is not configured.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start hosted payment');
    }
  };

  const confirmHostedPayment = async () => {
    const subId = hostedSubscriptionId || (typeof window !== 'undefined' ? localStorage.getItem('hostedSubscriptionId') : '');
    if (!subId) {
      toast.error('Hosted subscription not found. Please start payment again.');
      return;
    }
    if (!hostedPaymentId) {
      toast.error('Please enter the Razorpay payment ID.');
      return;
    }
    setConfirmingHosted(true);
    try {
      await paymentsAPI.confirmHosted({
        subscription_id: subId,
        payment_id: hostedPaymentId,
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hostedSubscriptionId');
      }
      qc.invalidateQueries('subscription');
      qc.invalidateQueries('paymentHistory');
      await refreshUser();
      toast.success('Subscription activated! Details updated.');
      router.push('/dashboard/subscription');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to confirm hosted payment');
    } finally {
      setConfirmingHosted(false);
    }
  };

  return (
    <DashboardLayout title="Subscribe" legalFooterMaxWidth="max-w-4xl">
      <Head>
        <title>Subscribe — Golf Charity Platform</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        {existingSub?.status === 'active' && (
          <div className="mb-6 p-4 rounded-xl glass-card border border-brand-500/40 bg-brand-950/30 text-brand-300 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-white">Active Plan Lined Up: </span>
              Your current {existingSub.plan_type} plan ends on{' '}
              {existingSub.current_period_end
                ? new Date(existingSub.current_period_end).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'period end'}
              . Purchasing now will <strong>queue your new subscription</strong> to start seamlessly as soon as your current plan ends!
            </div>
          </div>
        )}

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
                    value: prizePoolAmount,
                    pct: prizePoolBarPct,
                    color: '#FFD700',
                  },
                  {
                    label: '⚙️ Platform',
                    value: platformAmount,
                    pct: platformBarPct,
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
                    style={{ width: `${charityBarPct}%`, background: '#00E5CC' }}
                    className="transition-all duration-300"
                  />
                  <div style={{ width: `${prizePoolBarPct}%`, background: '#FFD700' }} />
                  <div style={{ width: `${platformBarPct}%`, background: '#3b437d' }} />
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
                onClick={() => {
                  setConsentChecked(false);
                  setShowPaymentSummary(true);
                }}
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
                  `Review & Pay ${plan.display} →`
                )}
              </motion.button>

              {hostedPaymentUrl && (
                <button
                  type="button"
                  onClick={handleHostedPayment}
                  className="btn-secondary w-full py-3 mt-3 text-sm"
                >
                  Pay on Razorpay Hosted Page
                </button>
              )}

              <div className="mt-4 glass-card p-4">
                <div className="text-white text-sm font-semibold mb-2">Hosted Payment Status</div>
                <p className="text-dark-400 text-xs mb-3">
                  After you pay on the hosted page, we’ll auto‑activate your subscription within a minute.
                </p>
                <label className="block text-xs text-dark-400 mb-2">
                  Razorpay Payment ID (if you were redirected without auto‑verification)
                </label>
                <input
                  type="text"
                  value={hostedPaymentId}
                  onChange={(e) => setHostedPaymentId(e.target.value.trim())}
                  className="input-field text-sm mb-3"
                  placeholder="pay_XXXXXXXXXXXXXX"
                />
                <button
                  className="btn-secondary w-full mt-1 py-2.5"
                  onClick={async () => {
                    try {
                      if (hostedPaymentId) {
                        await confirmHostedPayment();
                        return;
                      }
                      const { data } = await subscriptionsAPI.getCurrent();
                      if (data?.subscription?.status === 'active') {
                        localStorage.removeItem('hostedSubscriptionId');
                        toast.success('Subscription activated!');
                        router.push('/dashboard');
                      } else {
                        toast('Still verifying payment…', { icon: '⏳' });
                      }
                    } catch {
                      toast.error('Unable to check status right now.');
                    }
                  }}
                >
                  Refresh Payment Status
                </button>
              </div>

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

      <AnimatePresence>
        {showPaymentSummary && (
          <motion.div
            className="modal-overlay-glass z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!paying) {
                setShowPaymentSummary(false);
                setConsentChecked(false);
              }
            }}
          >
            <motion.div
              className="glass-card w-full max-w-md p-6"
              initial={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-semibold">Payment Summary</h3>
                <button
                  type="button"
                  className="text-dark-500 hover:text-white text-sm"
                  onClick={() => {
                    if (!paying) {
                      setShowPaymentSummary(false);
                      setConsentChecked(false);
                    }
                  }}
                >
                  Close
                </button>
              </div>

              <div className="rounded-xl p-4 mb-4" style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400">Plan Price</span>
                    <span className="text-white font-mono">₹{plan.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400">Charity Impact (+10% contribution)</span>
                    <span className="text-brand-400 font-mono">₹{mandatoryCharityAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400">Selected Charity Split ({charityPct}%)</span>
                    <span className="text-white font-mono">₹{charityAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-white font-semibold">Total Amount</span>
                    <span className="text-2xl gradient-text font-display">{plan.display}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-dark-400 mb-2">
                  UPI ID (optional for direct collect request)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.trim())}
                  className="input-field text-sm"
                  placeholder="example@oksbi"
                />
              </div>

              <label className="mb-4 flex items-start gap-3 rounded-xl p-3 border border-white/10 bg-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 accent-brand-500"
                />
                <span className="text-sm text-dark-200 leading-relaxed">
                  I provide explicit consent for GolfPools to tokenize my card for secure recurring payments.
                </span>
              </label>

              <div className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/12 bg-white/5">
                <span className="w-2 h-2 rounded-full bg-brand-400" />
                <span className="text-xs text-dark-300 tracking-wide">Securely Powered by Razorpay</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentSummary(false);
                    setConsentChecked(false);
                  }}
                  disabled={paying}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSubscribe();
                    setShowPaymentSummary(false);
                    setConsentChecked(false);
                  }}
                  disabled={paying || !consentChecked}
                  className="btn-primary flex-1 py-2.5 disabled:opacity-50"
                >
                  {paying ? 'Opening...' : 'Pay In-App'}
                </button>
              </div>
              {hostedPaymentUrl && (
                <button
                  type="button"
                  onClick={handleHostedPayment}
                  className="btn-secondary w-full mt-3 py-2.5"
                >
                  Pay on Hosted Page
                </button>
              )}
              {!consentChecked && (
                <p className="text-[11px] text-amber-300 mt-2">
                  Please provide consent to continue.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
