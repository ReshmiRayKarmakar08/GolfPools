import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import useAuthStore from '../context/authStore';
import ParticleCanvas from './effects/ParticleCanvas';
import { IconGolf } from './icons/Icons';
import MagneticButton from './effects/MagneticButton';
import LegalFooter from './legal/LegalFooter';

// Quick SVG for Hamburger/Close
function IconMenu({ size = 24, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconX({ size = 24, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if current route is public (landing, login, register)
  const isPublicRoute = ['/', '/login', '/register', '/admin-login'].includes(router.pathname);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (router.pathname === '/login' || router.pathname === '/register') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

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

  // Dashboard/admin pages use their own layout and should render directly.
  // Keeping them outside the global AnimatePresence avoids route-transition blank states.
  if (!isPublicRoute) {
    return children;
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
        className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between px-5 lg:px-10 py-3 lg:py-4 rounded-2xl"
        style={{
          background: 'rgba(6,8,19,0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <span ref={logoRef} className="text-2xl inline-block"><IconGolf className="text-brand-400" size={24} /></span>
          <span className="font-display tracking-widest text-lg lg:text-xl text-white group-hover:text-brand-400 transition-colors">
            GOLFPOOLS
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          <Link href="/#how-it-works" className="nav-link hover:translate-y-[-1px] transition-all">
            How it Works
          </Link>
          <Link href="/#prizes" className="nav-link hover:translate-y-[-1px] transition-all">
            Prizes
          </Link>
          <Link href="/#charities" className="nav-link hover:translate-y-[-1px] transition-all">
            Charities
          </Link>
          <Link href="/#plans" className="nav-link hover:translate-y-[-1px] transition-all">
            Plans
          </Link>
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary text-sm line-clamp-1">Dashboard</Link>
          ) : (
            <>
              <Link href="/admin-login" className="btn-secondary text-sm whitespace-nowrap">
                Admin
              </Link>
              <Link href="/login" className="btn-secondary text-sm whitespace-nowrap">Sign In</Link>
              <MagneticButton strength={0.25}>
                <Link href="/register" className="btn-primary text-sm relative z-10 whitespace-nowrap">
                  Get Started
                </Link>
              </MagneticButton>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex lg:hidden items-center gap-3">
          {!isAuthenticated && (
             <Link href="/register" className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap">
               Start
             </Link>
          )}
          <button 
            type="button" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white p-2 focus:outline-none bg-white/5 rounded-lg border border-white/10"
          >
            {mobileMenuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-24 left-4 right-4 z-40 rounded-2xl p-6 shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(13,18,36,0.95)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex flex-col gap-4">
              <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-white text-lg font-medium py-2 border-b border-light-100">How it Works</Link>
              <Link href="/#prizes" onClick={() => setMobileMenuOpen(false)} className="text-white text-lg font-medium py-2 border-b border-light-100">Prizes</Link>
              <Link href="/#charities" onClick={() => setMobileMenuOpen(false)} className="text-white text-lg font-medium py-2 border-b border-light-100">Charities</Link>
              <Link href="/#plans" onClick={() => setMobileMenuOpen(false)} className="text-white text-lg font-medium py-2 border-b border-light-100">Plans</Link>
              
              <div className="flex flex-col gap-3 mt-4">
                {isAuthenticated ? (
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="btn-primary text-center w-full">Go to Dashboard</Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn-secondary text-center w-full">Sign In</Link>
                    <Link href="/admin-login" onClick={() => setMobileMenuOpen(false)} className="btn-secondary text-center w-full">Admin Access</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        {router.pathname === '/' && <LegalFooter variant="corporate" />}
      </div>
    </>
  );
}
