import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';
import { charitiesAPI } from '../utils/api';
import ParticleCanvas from '../components/effects/ParticleCanvas';

const STEPS = ['Account', 'Profile', 'Charity & Plan'];

const stepVariants = {
  enter: (dir) => ({ x: dir > 0 ? 100 : -100, opacity: 0, filter: 'blur(4px)' }),
  center: { x: 0, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.4 } },
  exit: (dir) => ({ x: dir > 0 ? -100 : 100, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.3 } }),
};

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isAuthenticated, isLoading } = useAuthStore();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(router.query.plan || 'monthly');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    if (router.query.email) {
      setValue('email', String(router.query.email));
    }

    if (typeof window !== 'undefined') {
      const prefillRaw = sessionStorage.getItem('registerPrefill');
      if (prefillRaw) {
        try {
          const prefill = JSON.parse(prefillRaw);
          if (prefill.email) setValue('email', prefill.email);
          if (prefill.password) setValue('password', prefill.password);
        } catch {}
        sessionStorage.removeItem('registerPrefill');
      }
    }
  }, [router.query.email, setValue]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;

    const plan = router.query.plan ? String(router.query.plan) : 'monthly';
    router.replace(`/dashboard/subscribe?plan=${encodeURIComponent(plan)}`);
  }, [isAuthenticated, isLoading, router]);

  const { data: charities } = useQuery('charities', () => charitiesAPI.getAll(), {
    select: (r) => r.data.charities,
    retry: false,
  });

  const nextStep = () => { setDirection(1); setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prevStep = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)); };

  const onSubmit = async (data) => {
    if (step < STEPS.length - 1) {
      nextStep();
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        golf_club: data.golf_club,
        handicap: data.handicap ? parseFloat(data.handicap) : null,
        plan_type: selectedPlan,
      };

      if (selectedCharity) {
        payload.charity_id = selectedCharity;
      }

      await registerUser(payload);
      toast.success('Account created! Redirecting to payment...');
      router.push(`/dashboard/subscribe?plan=${selectedPlan}&charity=${selectedCharity || ''}`);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg ||
        'Registration failed';
      toast.error(msg);

      if (msg.toLowerCase().includes('already registered')) {
        router.push(`/login?email=${encodeURIComponent(data.email)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Account — GolfPools</title>
      </Head>

      <ParticleCanvas />

      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display tracking-wider text-3xl text-white">JOIN GOLFPOOLS</h1>
            <p className="text-dark-400 mt-2">Create your account in minutes</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    i <= step
                      ? 'bg-brand-500 text-dark-950'
                      : 'bg-dark-700 text-dark-500'
                  }`}
                  animate={i === step ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {i < step ? '✔' : i + 1}
                </motion.div>
                {i < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 transition-all duration-300 ${i < step ? 'bg-brand-500' : 'bg-dark-700'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="glass-card p-8 min-h-[320px]">
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait" custom={direction}>
                {step === 0 && (
                  <motion.div
                    key="step0"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-4"
                  >
                    <h3 className="text-white font-semibold text-lg mb-1">Create your account</h3>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Email</label>
                      <input
                        {...register('email', { required: 'Email is required' })}
                        type="email"
                        className="input-field"
                        placeholder="you@email.com"
                      />
                      {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Password</label>
                      <input
                        {...register('password', {
                          required: 'Password is required',
                          minLength: { value: 8, message: 'Min 8 characters' }
                        })}
                        type="password"
                        className="input-field"
                        placeholder="Min 8 characters"
                      />
                      {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step1"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-4"
                  >
                    <h3 className="text-white font-semibold text-lg mb-1">Personal details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-dark-300 mb-2">First Name</label>
                        <input {...register('first_name', { required: 'Required' })} className="input-field" />
                        {errors.first_name && <p className="text-red-400 text-xs mt-1">{errors.first_name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm text-dark-300 mb-2">Last Name</label>
                        <input {...register('last_name', { required: 'Required' })} className="input-field" />
                        {errors.last_name && <p className="text-red-400 text-xs mt-1">{errors.last_name.message}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Phone</label>
                      <input {...register('phone')} type="tel" className="input-field" placeholder="+91 98765 43210" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-dark-300 mb-2">Golf Club</label>
                        <input {...register('golf_club')} className="input-field" placeholder="Your club" />
                      </div>
                      <div>
                        <label className="block text-sm text-dark-300 mb-2">Handicap</label>
                        <input {...register('handicap')} type="number" step="0.1" min="0" max="54" className="input-field" placeholder="18.4" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-5"
                  >
                    <h3 className="text-white font-semibold text-lg mb-1">Choose plan & charity</h3>

                    {/* Plan selector */}
                    <div className="flex gap-3">
                      {[
                        { id: 'monthly', label: 'Monthly', price: '₹999/mo' },
                        { id: 'yearly', label: 'Yearly', price: '₹9,999/yr', badge: 'Save ₹1,989' },
                      ].map(p => (
                        <motion.button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPlan(p.id)}
                          className={`flex-1 p-4 rounded-xl border text-center transition-all ${
                            selectedPlan === p.id
                              ? 'border-brand-500/60 bg-brand-500/10'
                              : 'border-white/8 hover:border-white/20'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-white font-semibold text-sm">{p.label}</div>
                          <div className="text-brand-400 font-mono font-bold text-lg">{p.price}</div>
                          {p.badge && <span className="badge-success text-xs mt-1 inline-block">{p.badge}</span>}
                        </motion.button>
                      ))}
                    </div>

                    {/* Charity list */}
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Select a charity (optional)</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {charities?.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCharity(c.id)}
                            className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${
                              selectedCharity === c.id
                                ? 'border-brand-500/60 bg-brand-500/10'
                                : 'border-white/6 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                                selectedCharity === c.id ? 'bg-brand-500 border-brand-500' : 'border-dark-500'
                              }`} />
                              <span className="text-white">{c.name}</span>
                              <span className="text-dark-500 text-xs ml-auto">{c.category}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation buttons */}
              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <button type="button" onClick={prevStep} className="btn-secondary flex-1 py-3">
                    ← Back
                  </button>
                )}
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 py-3 disabled:opacity-50"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {step < STEPS.length - 1
                    ? 'Continue →'
                    : loading
                    ? 'Creating Account...'
                    : 'Create Account & Subscribe →'}
                </motion.button>
              </div>
            </form>
          </div>

          {/* Footer link */}
          <p className="text-center mt-6 text-dark-400 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in →</Link>
          </p>
        </motion.div>
      </div>
    </>
  );
}
