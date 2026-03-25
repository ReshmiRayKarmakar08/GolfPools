import { useRouter } from 'next/router';
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import ParticleCanvas from '../components/effects/ParticleCanvas';
import { IconGolf } from '../components/icons/Icons';
import { authAPI } from '../utils/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const token = router.query.token;

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Missing reset token');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({ token, password: data.password });
      toast.success('Password updated. Please sign in.');
      router.push('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Reset Password — GolfPools</title></Head>
      <ParticleCanvas />
      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md glass-card p-8">
          <div className="text-center mb-6">
            <IconGolf className="text-brand-400 mx-auto mb-3" size={36} />
            <h1 className="font-display tracking-wider text-2xl text-white">Set New Password</h1>
            <p className="text-dark-400 text-sm mt-1">Enter your new password below.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-300 mb-2">New Password</label>
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' }
                })}
                type="password"
                className="input-field"
                placeholder="Min 8 characters"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
              {loading ? 'Saving...' : 'Set Password'}
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
