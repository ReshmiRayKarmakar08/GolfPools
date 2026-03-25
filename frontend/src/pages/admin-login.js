import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';
import ParticleCanvas from '../components/effects/ParticleCanvas';
import { IconGolf, IconUser, IconUsers } from '../components/icons/Icons';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, user } = useAuthStore();
  const [mode, setMode] = useState('admin'); // 'user' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminHintRevealed, setAdminHintRevealed] = useState(false);
  const btnRef = useRef(null);
  const cardRef = useRef(null);
  const logoRef = useRef(null);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@golfpools.com';
  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'Admin@12345';

  useEffect(() => {
    if (mode === 'admin' && adminHintRevealed) {
      setEmail(adminEmail);
      setPassword(adminPassword);
    }
  }, [mode, adminEmail, adminPassword, adminHintRevealed]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user?.role === 'admin') {
      router.replace('/admin');
    } else if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  // GSAP logo pulse
  useEffect(() => {
    if (!logoRef.current) return;
    gsap.to(logoRef.current, {
      textShadow: '0 0 30px rgba(0,198,255,0.6), 0 0 60px rgba(0,198,255,0.3)',
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, []);

  // GSAP card entrance
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { y: 40, opacity: 0, filter: 'blur(10px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', delay: 0.2 }
    );
  }, []);

  // GSAP magnetic button effect
  useEffect(() => {
    if (!btnRef.current) return;
    const btn = btnRef.current;

    const onMouseMove = (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.3, ease: 'power2.out' });
    };

    const onMouseLeave = () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    };

    btn.addEventListener('mousemove', onMouseMove);
    btn.addEventListener('mouseleave', onMouseLeave);
    return () => {
      btn.removeEventListener('mousemove', onMouseMove);
      btn.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill all fields');
    if (mode === 'admin' && email.toLowerCase() !== adminEmail.toLowerCase()) {
      return toast.error('Only the primary admin email is allowed.');
    }
    setLoading(true);
    try {
      await login(email, password);
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'admin') {
        toast.success('Welcome to the Command Center');
        router.push('/admin');
      } else {
        toast.error('This account does not have admin privileges');
        useAuthStore.getState().logout();
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Authentication failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <IconGolf className="text-brand-400 animate-bounce" size={48} />
          <p className="text-dark-400 font-display tracking-widest text-sm">VERIFYING SESSION</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Access — GolfPools</title>
      </Head>

      <ParticleCanvas />

      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <div ref={cardRef} className="w-full max-w-md" style={{ opacity: 0 }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              className="mb-4"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <IconGolf className="text-brand-400 mx-auto" size={44} />
            </motion.div>
            <h1
              ref={logoRef}
              className="font-display tracking-[0.3em] text-3xl text-white"
            >
              GOLFPOOLs
            </h1>
            <p className="text-dark-400 mt-2 text-sm">Welcome back</p>
            <p className="text-dark-500 text-xs">Sign in to your GolfPools account</p>
          </div>

          {/* Main card */}
          <div
            className="rounded-2xl p-5 sm:p-8 relative overflow-hidden"
            style={{
              background: 'rgba(13,18,36,0.85)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 80px rgba(0,198,255,0.05)',
            }}
          >
            {/* Animated border glow */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(0,198,255,0.08) 0%, transparent 40%, transparent 60%, rgba(0,198,255,0.04) 100%)',
              }}
            />

            <div className="relative z-10">
              {/* User / Admin toggle */}
              <div
                className="relative flex rounded-full p-1 mb-6"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <motion.div
                  className="absolute top-1 bottom-1 rounded-full"
                  style={{ background: 'rgba(0,198,255,0.15)', border: '1px solid rgba(0,198,255,0.3)' }}
                  animate={{
                    left: mode === 'user' ? '4px' : '50%',
                    width: 'calc(50% - 4px)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
                <button
                  type="button"
                  onClick={() => { setMode('user'); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium relative z-10 transition-colors ${
                    mode === 'user' ? 'text-brand-300' : 'text-dark-500'
                  }`}
                >
                  <IconUser size={14} />
                  User
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('admin'); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium relative z-10 transition-colors ${
                    mode === 'admin' ? 'text-brand-300' : 'text-dark-500'
                  }`}
                >
                  <IconUsers size={14} />
                  Admin
                </button>
              </div>

              {/* Mode description */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {mode === 'admin' ? (
                    <div className="mb-6">
                      <h2 className="text-white font-semibold text-lg mb-1">Admin Access</h2>
                      <p className="text-dark-400 text-sm">
                        Use the administrator account to access the System Controller dashboard.
                      </p>

                      {/* Credential hint */}
                      <div
                        className="mt-4 rounded-xl p-4"
                        style={{
                          background: 'rgba(0,198,255,0.04)',
                          border: '1px solid rgba(0,198,255,0.1)',
                        }}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setAdminHintRevealed(true);
                          setEmail(adminEmail);
                          setPassword(adminPassword);
                          toast.success('Admin credentials loaded');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setAdminHintRevealed(true);
                            setEmail(adminEmail);
                            setPassword(adminPassword);
                            toast.success('Admin credentials loaded');
                          }
                        }}
                      >
                        <div className="text-brand-500 text-[10px] font-mono uppercase tracking-widest mb-2">
                          ADMIN ACCESS
                        </div>
                        {adminHintRevealed ? (
                          <>
                            <div className="text-white text-sm break-all">{adminEmail}</div>
                            <div className="text-dark-400 text-xs mt-0.5">Password: ••••••••••</div>
                          </>
                        ) : (
                          <div className="text-dark-500 text-xs">
                            Tap to use the primary admin credentials
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <h2 className="text-white font-semibold text-lg mb-1">User Access</h2>
                      <p className="text-dark-400 text-sm">
                        Sign in with your regular account credentials.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Login form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="admin-glow-input"
                    placeholder={mode === 'admin' ? adminEmail : 'you@email.com'}
                    autoComplete="email"
                    readOnly={mode === 'admin'}
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="admin-glow-input pr-12"
                      placeholder={mode === 'admin' ? 'Admin@12345' : '••••••••'}
                      autoComplete="current-password"
                      readOnly={mode === 'admin' && !adminHintRevealed}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        {showPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <button
                  ref={btnRef}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 relative overflow-hidden"
                  style={{
                    background: mode === 'admin'
                      ? 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)'
                      : 'linear-gradient(135deg, #00E5CC 0%, #00c6ff 100%)',
                    color: '#060813',
                    boxShadow: `0 8px 32px ${mode === 'admin' ? 'rgba(0,198,255,0.3)' : 'rgba(0,229,204,0.3)'}`,
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Authenticating...
                    </span>
                  ) : (
                    mode === 'admin' ? 'Login as Admin' : 'Sign In'
                  )}
                </button>
              </form>

              {/* Mode-specific footer */}
              {mode === 'user' && (
                <p className="text-center mt-5 text-dark-400 text-sm">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium">
                    Create one
                  </Link>
                </p>
              )}

              {mode === 'admin' && (
                <p className="text-center mt-5 text-dark-500 text-xs">
                  Only authorized administrators can access the Controller dashboard.
                </p>
              )}
            </div>
          </div>

          {/* Footer link */}
          <div className="text-center mt-6">
            <Link href="/" className="text-dark-500 hover:text-dark-300 text-xs transition-colors">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
