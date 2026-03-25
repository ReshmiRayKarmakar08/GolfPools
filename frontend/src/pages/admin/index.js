import { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { adminAPI } from '../../utils/api';
import { IconUsers, IconCreditCard, IconDollar, IconClock, IconDice, IconTrophy, IconHeart, IconShield } from '../../components/icons/Icons';
import Link from 'next/link';

const RevenueLineChart = dynamic(
  () => import('../../components/admin/AdminCharts').then((m) => m.RevenueLineChart),
  { ssr: false }
);

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function CountUpCard({ label, value, icon, sub, link, delay = 0, prefix = '' }) {
  const numRef = useRef(null);

  useEffect(() => {
    if (!numRef.current || typeof value !== 'number') return;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: value,
      duration: 1.5,
      ease: 'power2.out',
      delay: delay + 0.3,
      onUpdate: () => {
        if (numRef.current) numRef.current.textContent = Math.round(obj.v).toLocaleString('en-IN');
      },
    });
  }, [value, delay]);

  const card = (
    <motion.div
      className="glass-card-hover p-6 floating-card"
      initial={{ opacity: 0, y: 30, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay, duration: 0.6 }}
    >
      <div className="flex items-start justify-between mb-3">
        <motion.span
          className="text-3xl"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.5 + delay * 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {icon}
        </motion.span>
        {link && <span className="text-brand-500 text-xs">View →</span>}
      </div>
      <div className="text-3xl font-bold text-white font-mono mb-1">
        {prefix}<span ref={numRef}>0</span>
      </div>
      <div className="text-dark-400 text-sm">{label}</div>
      {sub && <div className="text-dark-600 text-xs mt-1">{sub}</div>}
    </motion.div>
  );
  return link ? <Link href={link}>{card}</Link> : card;
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 text-sm">
      <div className="text-dark-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: ₹{(p.value || 0).toLocaleString('en-IN')}
        </div>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { data: dashData } = useQuery('adminDashboard', adminAPI.getDashboard, {
    select: r => r.data
  });

  const { data: analyticsData } = useQuery('analytics', () => adminAPI.getAnalytics({ period: 30 }), {
    select: r => r.data
  });

  const stats = dashData?.stats || {};
  const recentDraws = dashData?.recentDraws || [];

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stats with count-up */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CountUpCard icon={<IconUsers className="text-brand-400" size={24} />} label="Total Users" value={stats.totalUsers || 0} link="/admin/users" delay={0} />
          <CountUpCard icon={<IconCreditCard className="text-green-400" size={24} />} label="Active Subscriptions" value={stats.activeSubscriptions || 0} link="/admin/subscriptions" delay={0.1} />
          <CountUpCard icon={<IconDollar className="text-yellow-400" size={24} />} label="Revenue (30d)" value={stats.totalRevenue || 0} prefix="₹" delay={0.2} />
          <CountUpCard icon={<IconClock className="text-orange-400" size={24} />} label="Pending Payouts" value={stats.pendingWinners || 0} link="/admin/winners" sub="Winners awaiting approval" delay={0.3} />
        </div>

        {/* Charts */}
        {analyticsData && (
          <div className="grid lg:grid-cols-3 gap-6">
            <motion.div
              className="lg:col-span-2 glass-card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-white font-semibold mb-5">Revenue (Last 30 Days)</h3>
              <RevenueLineChart
                data={analyticsData.revenue_chart || []}
                height={220}
                tooltipContent={<ChartTooltip />}
              />
            </motion.div>

            <motion.div
              className="glass-card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-white font-semibold mb-5">Subscription Split</h3>
              <div className="space-y-4 mt-8">
                {[
                  { label: 'Monthly', value: analyticsData.subscription_breakdown?.monthly || 0, color: '#00c6ff' },
                  { label: 'Yearly', value: analyticsData.subscription_breakdown?.yearly || 0, color: '#FFD700' },
                ].map(item => {
                  const total = (analyticsData.subscription_breakdown?.monthly || 0) + (analyticsData.subscription_breakdown?.yearly || 0);
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-dark-300 text-sm">{item.label}</span>
                        <span className="text-white font-mono text-sm">{item.value} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.8, duration: 0.8 }}
                          style={{ background: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-4 border-t border-white/5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-brand-400 font-bold text-sm">₹{((analyticsData.totals?.charity || 0)).toLocaleString('en-IN')}</div>
                      <div className="text-dark-600 text-xs">Charity</div>
                    </div>
                    <div>
                      <div className="text-yellow-400 font-bold text-sm">₹{((analyticsData.totals?.prize_pool || 0)).toLocaleString('en-IN')}</div>
                      <div className="text-dark-600 text-xs">Prize Pool</div>
                    </div>
                    <div>
                      <div className="text-green-400 font-bold text-sm">₹{((analyticsData.totals?.revenue || 0)).toLocaleString('en-IN')}</div>
                      <div className="text-dark-600 text-xs">Revenue</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Quick Actions */}
        <motion.div
          className="glass-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-white font-semibold mb-5">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/admin/draws', label: 'Manage Draws', icon: <IconDice className="text-brand-400" size={20} /> },
              { href: '/admin/winners', label: 'Verify Winners', icon: <IconTrophy className="text-yellow-400" size={20} /> },
              { href: '/admin/charities', label: 'Manage Charities', icon: <IconHeart className="text-green-400" size={20} /> },
              { href: '/admin/users', label: 'User Management', icon: <IconUsers className="text-purple-400" size={20} /> },
            ].map((action, i) => (
              <Link key={action.href} href={action.href}>
                <motion.div
                  className="glass-card-hover p-4 text-center flex flex-col items-center gap-2"
                  whileHover={{ y: -4 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                >
                  <motion.span
                    className="text-2xl"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
                  >
                    {action.icon}
                  </motion.span>
                  <span className="text-white text-sm font-medium">{action.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent draws */}
        {recentDraws.length > 0 && (
          <motion.div
            className="glass-card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Recent Draws</h3>
              <Link href="/admin/draws" className="text-brand-400 text-sm">View All →</Link>
            </div>
            <div className="space-y-3">
              {recentDraws.map((draw, i) => (
                <motion.div
                  key={draw.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                >
                  <div>
                    <span className="text-white text-sm font-medium">
                      {MONTH_NAMES[draw.draw_month - 1]} {draw.draw_year}
                    </span>
                    <span className="text-dark-500 text-xs ml-2">{draw.participant_count || 0} participants</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-dark-400 text-xs">Pool: ₹{(draw.total_pool || 0).toLocaleString('en-IN')}</span>
                    <span className={draw.status === 'completed' ? 'badge-success' : 'badge-warning'}>
                      {draw.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
