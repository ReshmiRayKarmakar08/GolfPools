import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await login(data.email, data.password);
      toast.success(`Welcome back, ${result.user.first_name}!`);
      if (result.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push(router.query.redirect || '/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Sign In — Golf Charity Platform</title></Head>
      <div className="min-h-screen flex items-center justify-center px-4 relative">
        <div className="bg-orbs">
          <div className="bg-orb w-[500px] h-[500px] top-[-100px] right-[-100px]" style={{ background: 'radial-gradient(circle, #00c6ff, transparent)' }} />
          <div className="bg-orb w-[300px] h-[300px] bottom-[10%] left-[-50px]" style={{ background: 'radial-gradient(circle, #0072ff, transparent)' }} />
        </div>

        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <span className="text-3xl">⛳</span>
              <span className="font-display tracking-widest text-xl text-white">GOLFCHARITY</span>
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-dark-400">Sign in to your account</p>
          </div>

          <div className="glass-card p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm text-dark-300 mb-2">Email Address</label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                  })}
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-dark-300">Password</label>
                  <Link href="/forgot-password" className="text-brand-400 text-xs hover:text-brand-300">Forgot password?</Link>
                </div>
                <input
                  {...register('password', { required: 'Password is required' })}
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <p className="text-dark-400 text-sm">
                Don't have an account?{' '}
                <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium">Create one</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
