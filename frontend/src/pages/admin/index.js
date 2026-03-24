import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { adminAPI } from '../../utils/api';
import Link from 'next/link';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ label, value, icon, sub, link }) {
  const card = (
    <motion.div
      className="glass-card-hover p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">{icon}</div>
        {link && <span className="text-brand-500 text-xs">View →</span>}
      </div>
      <div className="text-3xl font-bold text-white font-mono mb-1">{value}</div>
      <div className="text-dark-400 text-sm">{label}</div>
      {sub && <div className="text-dark-600 text-xs mt-1">{sub}</div>}
    </motion.div>
  );
  return link ? <Link href={link}>{card}</Link> : card;
}

const CustomTooltip = ({ active, payload, label }) => {
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
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="👥" label="Total Users" value={stats.totalUsers || 0} link="/admin/users" />
          <StatCard icon="💳" label="Active Subscriptions" value={stats.activeSubscriptions || 0} link="/admin/subscriptions" />
          <StatCard icon="💰" label="Revenue (30d)" value={`₹${((stats.totalRevenue || 0)).toLocaleString('en-IN')}`} />
          <StatCard icon="⏳" label="Pending Payouts" value={stats.pendingWinners || 0} link="/admin/winners" sub="Winners awaiting approval" />
        </div>

        {/* Charts */}
        {analyticsData && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-6">
              <h3 className="text-white font-semibold mb-5">Revenue (Last 30 Days)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analyticsData.revenue_chart || []}>
                  <XAxis dataKey="date" tick={{ fill: '#5a6190', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: '#5a6190', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="revenue" stroke="#00c6ff" strokeWidth={2} dot={false} name="Revenue" />
                  <Line type="monotone" dataKey="charity" stroke="#00E5CC" strokeWidth={2} dot={false} name="Charity" />
                  <Line type="monotone" dataKey="prizePool" stroke="#FFD700" strokeWidth={2} dot={false} name="Prize Pool" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-6">
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
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
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
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-5">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/admin/draws', label: 'Manage Draws', icon: '🎰' },
              { href: '/admin/winners', label: 'Verify Winners', icon: '🏆' },
              { href: '/admin/charities', label: 'Manage Charities', icon: '💚' },
              { href: '/admin/users', label: 'User Management', icon: '👥' },
            ].map(action => (
              <Link key={action.href} href={action.href}
                className="glass-card-hover p-4 text-center flex flex-col items-center gap-2">
                <span className="text-2xl">{action.icon}</span>
                <span className="text-white text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent draws */}
        {recentDraws.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Recent Draws</h3>
              <Link href="/admin/draws" className="text-brand-400 text-sm">View All →</Link>
            </div>
            <div className="space-y-3">
              {recentDraws.map(draw => (
                <div key={draw.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
