import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authAPI } from '../utils/api';
import { IconGolf } from '../components/icons/Icons';
import ParticleCanvas from '../components/effects/ParticleCanvas';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Success
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const { register: regEmail, handleSubmit: handleEmail, formState: { errors: emailErrors } } = useForm();
  const { register: regOtp, handleSubmit: handleOtp, formState: { errors: otpErrors } } = useForm();

  const onEmailSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.forgotPassword(data.email);
      setEmail(data.email);
      setStep(2);
      toast.success('OTP sent to your email!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.verifyPasswordOtp({
        email,
        otp: data.otp,
        password: data.password
      });
      setStep(3);
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password — GolfPools</title>
      </Head>

      <ParticleCanvas />

      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <IconGolf className="text-brand-400 mx-auto mb-4" size={40} />
            <h1 className="font-display tracking-wider text-2xl text-white">RESET PASSWORD</h1>
            <p className="text-dark-400 mt-2 text-sm">
              {step === 1 ? 'Enter your email to receive a login OTP' : 
               step === 2 ? `Verify the 6-digit code sent to ${email}` : 
               'Your password has been updated!'}
            </p>
          </div>

          <div className="glass-card p-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form 
                  key="step1"
                  onSubmit={handleEmail(onEmailSubmit)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Email Address</label>
                    <input 
                      {...regEmail('email', { required: 'Email is required' })}
                      type="email" 
                      className="input-field" 
                      placeholder="you@email.com"
                    />
                    {emailErrors.email && <p className="text-red-400 text-xs mt-1">{emailErrors.email.message}</p>}
                  </div>
                  <button 
                    disabled={loading}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP →'}
                  </button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form 
                  key="step2"
                  onSubmit={handleOtp(onOtpSubmit)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">6-Digit OTP</label>
                    <input 
                      {...regOtp('otp', { required: 'Required', length: 6 })}
                      type="text" 
                      maxLength="6"
                      className="input-field text-center text-xl tracking-[0.5em] font-mono" 
                      placeholder="000000"
                    />
                    {otpErrors.otp && <p className="text-red-400 text-xs mt-1">{otpErrors.otp.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">New Password</label>
                    <input 
                      {...regOtp('password', { required: 'Required', minLength: 8 })}
                      type="password" 
                      className="input-field" 
                      placeholder="Min 8 characters"
                    />
                    {otpErrors.password && <p className="text-red-400 text-xs mt-1">{otpErrors.password.message}</p>}
                  </div>
                  <button 
                    disabled={loading}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Reset Password'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-center text-xs text-dark-500 hover:text-dark-300 transition-colors"
                  >
                    Change Email
                  </button>
                </motion.form>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Success!</h3>
                  <p className="text-dark-400 text-sm mb-6">You can now sign in with your new password.</p>
                  <Link href="/login" className="btn-primary block w-full py-3 text-center">
                    Back to Login
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-center mt-6">
            <Link href="/login" className="text-dark-500 hover:text-white text-sm transition-colors flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
