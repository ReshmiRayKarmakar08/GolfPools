import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';
import { charitiesAPI } from '../utils/api';

const STEPS = ['Account', 'Profile', 'Charity & Plan'];

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(router.query.plan || 'monthly');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm();

  const { data: charities } = useQuery('charities', () => charitiesAPI.getAll(), {
    select: (r) => r.data.charities,
    retry: false,
  });

  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const onSubmit = async (data) => {
    if (step < STEPS.length - 1) { nextStep(); return; }

    if (!selectedCharity) {
      toast.error('Please select a charity to support');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        ...data,
        charity_id: selectedCharity,
        plan_type: selectedPlan,
      });
      toast.success('Account created! Welcome to Golf Charity Platform 🎉');
      router.push('/dashboard/subscribe?plan=' + selectedPlan + '&charity=' + selectedCharity);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Create Account — Golf Charity Platform</title></Head>
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
        <div className="bg-orbs">
          <div className="bg-orb w-[500px] h-[500px] top-[-100px] right-[-100px]" style={{ background: 'radial-gradient(circle, #00c6ff, transparent)' }} />
        </div>

        <div className="w-full max-w-lg relative z-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <span className="text-3xl">⛳</span>
              <span className="font-display tracking-widest text-xl text-white">GOLFCHARITY</span>
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    i < step ? 'bg-brand-500 text-dark-950' :
                    i === step ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50' :
                    'bg-dark-800 text-dark-500'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 transition-all duration-300 ${i < step ? 'bg-brand-500' : 'bg-dark-700'}`} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-dark-400 text-sm mt-3">{STEPS[step]}</p>
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card p-8"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* STEP 0 — Account */}
              {step === 0 && (
                <>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Email Address</label>
                    <input
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                      })}
                      type="email" className="input-field" placeholder="you@example.com"
                    />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Password</label>
                    <input
                      {...register('password', {
                        required: 'Password required',
                        minLength: { value: 8, message: 'At least 8 characters' }
                      })}
                      type="password" className="input-field" placeholder="Min 8 characters"
                    />
                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                  </div>
                  <button type="button" onClick={handleSubmit(() => {
                    const vals = getValues();
                    if (!vals.email || !vals.password) {
                      toast.error('Please fill in all fields');
                      return;
                    }
                    nextStep();
                  })} className="btn-primary w-full py-3.5">
                    Continue →
                  </button>
                </>
              )}

              {/* STEP 1 — Profile */}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">First Name</label>
                      <input {...register('first_name', { required: 'Required' })} className="input-field" placeholder="John" />
                      {errors.first_name && <p className="text-red-400 text-xs mt-1">{errors.first_name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Last Name</label>
                      <input {...register('last_name', { required: 'Required' })} className="input-field" placeholder="Smith" />
                      {errors.last_name && <p className="text-red-400 text-xs mt-1">{errors.last_name.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Phone (optional)</label>
                    <input {...register('phone')} type="tel" className="input-field" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Golf Club (optional)</label>
                    <input {...register('golf_club')} className="input-field" placeholder="Your golf club name" />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Handicap (optional)</label>
                    <input {...register('handicap')} type="number" min="0" max="54" step="0.1" className="input-field" placeholder="e.g. 18.4" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={prevStep} className="btn-secondary flex-1 py-3">← Back</button>
                    <button type="button" onClick={nextStep} className="btn-primary flex-1 py-3">Continue →</button>
                  </div>
                </>
              )}

              {/* STEP 2 — Charity & Plan */}
              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm text-white font-semibold mb-3">Select Your Charity</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {charities?.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCharity(c.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                            selectedCharity === c.id
                              ? 'border-brand-500/60 bg-brand-500/10 text-white'
                              : 'border-white/8 text-dark-300 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selectedCharity === c.id ? 'bg-brand-500 border-brand-500' : 'border-dark-500'}`} />
                            <div>
                              <div className="font-medium text-sm">{c.name}</div>
                              <div className="text-xs text-dark-500">{c.category}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white font-semibold mb-3">Select Your Plan</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ id: 'monthly', price: '₹999/mo', label: 'Monthly' }, { id: 'yearly', price: '₹9,999/yr', label: 'Yearly', badge: 'Save 17%' }].map(plan => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`p-4 rounded-xl border transition-all duration-200 text-center relative ${
                            selectedPlan === plan.id
                              ? 'border-brand-500/60 bg-brand-500/10'
                              : 'border-white/8 hover:border-white/20'
                          }`}
                        >
                          {plan.badge && (
                            <span className="absolute -top-2 right-2 badge-success text-xs">{plan.badge}</span>
                          )}
                          <div className="text-white font-bold">{plan.price}</div>
                          <div className="text-dark-400 text-xs">{plan.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={prevStep} className="btn-secondary flex-1 py-3">← Back</button>
                    <button type="submit" disabled={loading || !selectedCharity} className="btn-primary flex-1 py-3 disabled:opacity-50">
                      {loading ? 'Creating...' : 'Create Account →'}
                    </button>
                  </div>
                </>
              )}
            </form>

            {step === 0 && (
              <div className="mt-6 pt-6 border-t border-white/5 text-center">
                <p className="text-dark-400 text-sm">
                  Already have an account?{' '}
                  <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
