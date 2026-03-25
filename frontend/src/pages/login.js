import { useEffect, useState } from 'react';
import { IconGolf } from '../components/icons/Icons';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';
import ParticleCanvas from '../components/effects/ParticleCanvas';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';

export default function LoginPage() {
  const router = useRouter();
  const { login, googleLogin, isAuthenticated, isLoading } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    if (router.query.email) {
      setValue('email', String(router.query.email));
    }
  }, [router.query.email, setValue]);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-500 mx-auto mb-4" />
          <p className="text-dark-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      const user = useAuthStore.getState().user;
      toast.success(`Welcome back, ${user?.first_name}!`);
      router.push(user?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      const code = err.response?.data?.code;
      const message = err.response?.data?.error || 'Login failed';

      if (code === 'USER_NOT_FOUND') {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            'registerPrefill',
            JSON.stringify({ email: data.email, password: data.password })
          );
        }
        toast.error('You are not registered. Redirecting to create account...');
        router.push(`/register?email=${encodeURIComponent(data.email)}&from=login`);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    try {
      await googleLogin(credential);
      const user = useAuthStore.getState().user;
      toast.success(`Welcome, ${user?.first_name || 'Player'}!`);
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Google sign-in failed');
    }
  };

  return (
    <>
      <Head>
        <title>Sign In — GolfPools</title>
      </Head>

      <ParticleCanvas />

      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7 }}
        >
          <div className="text-center mb-8">
            <motion.div
              className="text-4xl mb-3"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <IconGolf className="text-brand-400" size={40} />
            </motion.div>
            <h1 className="font-display tracking-wider text-3xl text-white">WELCOME BACK</h1>
            <p className="text-dark-400 mt-2">Sign in to your GolfPools account</p>
          </div>

          <div className="glass-card p-5 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm text-dark-300 mb-2">Email</label>
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  className="input-field"
                  placeholder="you@email.com"
                  autoComplete="email"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">Password</label>
                <input
                  {...register('password', { required: 'Password is required' })}
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                <div className="mt-2 text-right">
                  <Link href="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">
                    Forgot password?
                  </Link>
                </div>
              </div>
              <motion.button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 disabled:opacity-50"
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </motion.button>
            </form>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-dark-500">OR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />
          </div>

          <p className="text-center mt-6 text-dark-400 text-sm">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium">Create one →</Link>
          </p>
          <p className="text-center mt-2 text-dark-500 text-xs">
            Admin access?{' '}
            <Link href="/admin-login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign in here →
            </Link>
          </p>
        </motion.div>
      </div>
    </>
  );
}
