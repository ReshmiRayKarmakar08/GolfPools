import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import useAuthStore from '../../context/authStore';
import { IconBarChart, IconTarget, IconDice, IconTrophy, IconHeart, IconCreditCard, IconUser, IconUsers, IconTrendingUp, IconShuffle, IconGolf, IconLogOut } from '../icons/Icons';
import LegalFooter from '../legal/LegalFooter';
import SystemStatusOrb from '../admin/SystemStatusOrb';

const USER_NAV = [
  { href: '/dashboard', label: 'Overview', icon: <IconBarChart size={18} /> },
  { href: '/dashboard/scores', label: 'My Scores', icon: <IconTarget size={18} /> },
  { href: '/dashboard/draws', label: 'Draws', icon: <IconDice size={18} /> },
  { href: '/dashboard/winnings', label: 'Winnings', icon: <IconTrophy size={18} /> },
  { href: '/dashboard/charity', label: 'Charity', icon: <IconHeart size={18} /> },
  { href: '/dashboard/subscription', label: 'Subscription', icon: <IconCreditCard size={18} /> },
  { href: '/dashboard/profile', label: 'Profile', icon: <IconUser size={18} /> },
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: <IconBarChart size={18} /> },
  { href: '/admin/draws', label: 'Draws', icon: <IconDice size={18} /> },
  { href: '/admin/winners', label: 'Winners', icon: <IconTrophy size={18} /> },
  { href: '/admin/charities', label: 'Charities', icon: <IconHeart size={18} /> },
  { href: '/admin/users', label: 'Users', icon: <IconUsers size={18} /> },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: <IconCreditCard size={18} /> },
  { href: '/admin/analytics', label: 'Analytics', icon: <IconTrendingUp size={18} /> },
];

const pageVariants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  enter: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export default function DashboardLayout({ children, title, legalFooterMaxWidth = 'max-w-6xl' }) {
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = router.pathname.startsWith('/admin');
  const nav = isAdmin ? ADMIN_NAV : USER_NAV;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);



  useEffect(() => {
    if (isAdmin && user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isAdmin, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex text-white items-center justify-center bg-dark-950">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <IconGolf className="text-brand-400 animate-bounce" size={48} />
          <p className="text-dark-400 font-display tracking-widest text-sm">VERIFYING SESSION</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>{title ? `${title} — GolfPools` : 'GolfPools Dashboard'}</title>
      </Head>

      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 lg:static lg:translate-x-0 transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            background: 'rgba(10,14,40,0.95)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex flex-col h-full p-5">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 mb-8 group">
              <motion.span
                className="text-2xl"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
              <IconGolf className="text-brand-400" size={22} />
              </motion.span>
              <span className="font-display tracking-widest text-lg text-white group-hover:text-brand-400 transition-colors">
                GOLFPOOLS
              </span>
            </Link>

            {/* Role badge */}
            {isAdmin && (
              <div className="mb-6 px-3">
                <span className="badge-warning text-xs">Admin Panel</span>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
              {nav.map((item) => {
                const active = router.pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      className={active ? 'sidebar-link sidebar-link-active' : 'sidebar-link'}
                      whileHover={{ x: active ? 0 : 4, transition: { duration: 0.2 } }}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                      {active && (
                        <motion.div
                          className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-500 rounded-r"
                          layoutId="activeNav"
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* Switch role link */}
            {user?.role === 'admin' && (
              <Link
                href={isAdmin ? '/dashboard' : '/admin'}
                className="flex items-center gap-2 px-4 py-2 text-dark-500 hover:text-brand-400 text-sm transition-colors mb-2"
              >
                <IconShuffle size={16} />
                <span>Switch to {isAdmin ? 'User' : 'Admin'}</span>
              </Link>
            )}

            {/* Legal link for Razorpay compliance */}
            {isAdmin && (
              <Link
                href="/grievance-redressal"
                className="flex items-center gap-2 px-4 py-2 text-dark-600 hover:text-dark-400 text-xs transition-colors mb-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Legal & Grievance</span>
              </Link>
            )}

            {/* User info + logout */}
            <div className="glass-card p-4 mt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-dark-950 font-bold text-sm">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm font-medium truncate">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="text-dark-500 text-xs truncate">{user?.email}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-dark-400 hover:text-red-400 text-sm transition-colors rounded-lg hover:bg-white/5"
              >
                Sign Out →
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col min-h-screen">
          {/* Top bar */}
          <header
            className="sticky top-0 z-20 flex items-center justify-between px-6 py-4"
            style={{
              background: 'rgba(6,8,19,0.7)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-dark-300 hover:text-white text-xl"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <h1 className="text-white font-bold text-lg">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/profile"
                className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center text-dark-400 hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </Link>
            </div>
          </header>

          {/* Page content with transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={router.pathname}
              className="p-6 flex-1"
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
          <LegalFooter compact maxWidthClass={legalFooterMaxWidth} variant="simple" />

          {/* System Status Orb for admin */}
          {isAdmin && <SystemStatusOrb />}
        </main>
      </div>
    </>
  );
}
