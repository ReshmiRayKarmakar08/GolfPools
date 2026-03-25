import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import ParticleCanvas from '../components/effects/ParticleCanvas';
import { IconGolf } from '../components/icons/Icons';
import { authAPI } from '../utils/api';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.forgotPassword(data.email);
      toast.success('If the account exists, a reset link has been sent.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Forgot Password — GolfPools</title></Head>
      <ParticleCanvas />
      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md glass-card p-8">
          <div className="text-center mb-6">
            <IconGolf className="text-brand-400 mx-auto mb-3" size={36} />
            <h1 className="font-display tracking-wider text-2xl text-white">Forgot Password</h1>
            <p className="text-dark-400 text-sm mt-1">Enter your email to receive reset link.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <p className="text-center mt-5 text-sm text-dark-400">
            Back to <Link href="/login" className="text-brand-400 hover:text-brand-300">Sign In</Link>
          </p>
        </div>
      </div>
    </>
  );
}
