import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../context/authStore';
import { notificationsAPI } from '../../utils/api';

const USER_NAV = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/scores', label: 'My Scores', icon: '⛳' },
  { href: '/dashboard/draws', label: 'Draws', icon: '🎰' },
  { href: '/dashboard/winnings', label: 'Winnings', icon: '🏆' },
  { href: '/dashboard/charity', label: 'My Charity', icon: '💚' },
  { href: '/dashboard/subscription', label: 'Subscription', icon: '💳' },
  { href: '/dashboard/profile', label: 'Profile', icon: '👤' },
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/draws', label: 'Draws', icon: '🎰' },
  { href: '/admin/winners', label: 'Winners', icon: '🏆' },
  { href: '/admin/charities', label: 'Charities', icon: '💚' },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: '💳' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
];

export default function DashboardLayout({ children, title }) {
  const router = useRouter();
  const { user, logout, isLoading, isAuthenticated } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifData } = useQuery('notifications', notificationsAPI.getAll, {
    enabled: isAuthenticated,
    select: (r) => r.data,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${router.pathname}`);
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV : USER_NAV;
  const unreadCount = notifData?.unreadCount || 0;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex-col transition-transform duration-300 lg:translate-x-0 lg:flex ${mobileOpen ? 'translate-x-0 flex' : '-translate-x-full hidden lg:flex'}`}
        style={{ background: 'rgba(6,8,19,0.95)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⛳</span>
            <span className="font-display tracking-widest text-white text-lg">GOLFCHARITY</span>
          </Link>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="glass-card px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-dark-950 font-bold text-sm">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">{user.first_name} {user.last_name}</div>
              <div className="text-dark-500 text-xs truncate">{user.email}</div>
            </div>
            {isAdmin && <span className="badge-warning text-xs">Admin</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-white/5">
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="sidebar-link w-full text-left"
          >
            <span>🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
          style={{ background: 'rgba(6,8,19,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-dark-400 hover:text-white"
              onClick={() => setMobileOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-white font-semibold text-lg">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-dark-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 rounded-full text-dark-950 text-xs font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 glass-card overflow-hidden"
                    style={{ zIndex: 100 }}
                  >
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                      <span className="text-white font-semibold text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={notificationsAPI.markAllRead}
                          className="text-brand-400 text-xs hover:text-brand-300"
                        >Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifData?.notifications?.length > 0 ? (
                        notifData.notifications.slice(0, 10).map(n => (
                          <div key={n.id} className={`px-4 py-3 border-b border-white/3 hover:bg-white/3 transition-colors ${!n.is_read ? 'bg-brand-500/5' : ''}`}>
                            <div className="flex gap-2">
                              {!n.is_read && <span className="w-2 h-2 mt-1 rounded-full bg-brand-500 flex-shrink-0" />}
                              <div>
                                <div className="text-white text-xs font-medium">{n.title}</div>
                                <div className="text-dark-400 text-xs mt-0.5">{n.message}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-dark-500 text-sm">No notifications yet</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
