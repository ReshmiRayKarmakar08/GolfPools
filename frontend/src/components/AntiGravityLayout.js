import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import useAuthStore from '../context/authStore';
import ParticleCanvas from './effects/ParticleCanvas';
import { IconGolf } from './icons/Icons';
import MagneticButton from './effects/MagneticButton';

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  enter: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.3 } },
};

export default function AntiGravityLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const navRef = useRef(null);
  const logoRef = useRef(null);

  // Check if current route is public (landing, login, register)
  const isPublicRoute = ['/', '/login', '/register'].includes(router.pathname);

  useEffect(() => {
    if (!navRef.current || !isPublicRoute) return;

    // Floating navbar bobbing effect
    gsap.to(navRef.current, {
      y: -3,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Logo subtle rotation pulse
    if (logoRef.current) {
      gsap.to(logoRef.current, {
        rotateZ: 2,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }
  }, [isPublicRoute]);

  // Dashboard pages use their own DashboardLayout
  if (!isPublicRoute) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={router.pathname}
          initial="initial"
          animate="enter"
          exit="exit"
          variants={pageVariants}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <>
      {/* Particle Background */}
      <ParticleCanvas />

      {/* Background orbs - enhanced */}
      <div className="bg-orbs">
        <div className="bg-orb w-[600px] h-[600px] top-[-200px] right-[-200px]"
          style={{ background: 'radial-gradient(circle, rgba(0,198,255,0.15), transparent)' }} />
        <div className="bg-orb w-[400px] h-[400px] bottom-[20%] left-[-100px]"
          style={{ background: 'radial-gradient(circle, rgba(0,114,255,0.12), transparent)' }} />
        <div className="bg-orb w-[300px] h-[300px] top-[50%] left-[50%]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1), transparent)' }} />
      </div>

      {/* Floating Navbar */}
      <nav
        ref={navRef}
        className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between px-6 lg:px-10 py-4 rounded-2xl"
        style={{
          background: 'rgba(6,8,19,0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <Link href="/" className="flex items-center gap-2 group">
          <span ref={logoRef} className="text-2xl inline-block"><IconGolf className="text-brand-400" size={24} /></span>
          <span className="font-display tracking-widest text-xl text-white group-hover:text-brand-400 transition-colors">
            GOLFPOOLS
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="#how-it-works" className="nav-link hover:translate-y-[-1px] transition-all">
            How it Works
          </Link>
          <Link href="#prizes" className="nav-link hover:translate-y-[-1px] transition-all">
            Prizes
          </Link>
          <Link href="#charities" className="nav-link hover:translate-y-[-1px] transition-all">
            Charities
          </Link>
          <Link href="#plans" className="nav-link hover:translate-y-[-1px] transition-all">
            Plans
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary text-sm">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm hidden md:block">Sign In</Link>
              <MagneticButton strength={0.25}>
                <Link href="/register" className="btn-primary text-sm relative z-10">
                  Get Started
                </Link>
              </MagneticButton>
            </>
          )}
        </div>
      </nav>

      {/* Page Content with transitions */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={router.pathname}
            initial="initial"
            animate="enter"
            exit="exit"
            variants={pageVariants}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
