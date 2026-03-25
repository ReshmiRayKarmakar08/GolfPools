import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { adminAPI } from '../../utils/api';

const RevenueLineChart = dynamic(
  () => import('../../components/admin/AdminCharts').then((m) => m.RevenueLineChart),
  { ssr: false }
);

const RevenuePieChart = dynamic(
  () => import('../../components/admin/AdminCharts').then((m) => m.RevenuePieChart),
  { ssr: false }
);

const COLORS = ['#00c6ff', '#FFD700', '#7983a8'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 text-sm">
      <div className="text-dark-400 mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-mono">₹{(p.value || 0).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('30');

  const { data, isLoading } = useQuery(
    ['analytics', period],
    () => adminAPI.getAnalytics({ period }),
    { select: (r) => r.data }
  );

  const pieData = data
    ? [
        { name: 'Prize Pool', value: data.totals?.prize_pool || 0 },
        { name: 'Charity', value: data.totals?.charity || 0 },
        { name: 'Platform', value: (data.totals?.revenue || 0) - (data.totals?.prize_pool || 0) - (data.totals?.charity || 0) },
      ]
    : [];

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">Revenue Analytics</h2>
            <p className="text-dark-400 text-sm">Track subscriptions, charity impact, and prize distribution</p>
          </div>
          <div className="flex gap-2">
            {['7', '30', '90'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  period === p
                    ? 'bg-brand-500/20 border border-brand-500/40 text-brand-300'
                    : 'text-dark-400 border border-white/8 hover:text-white'
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Revenue', value: data?.totals?.revenue, color: '#00c6ff' },
            { label: 'To Charities', value: data?.totals?.charity, color: '#00E5CC' },
            { label: 'Prize Pool', value: data?.totals?.prize_pool, color: '#FFD700' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              className="glass-card p-5 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="text-3xl font-bold font-mono mb-1" style={{ color: stat.color }}>
                ₹{((stat.value || 0)).toLocaleString('en-IN')}
              </div>
              <div className="text-dark-400 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Revenue line chart */}
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-5">Revenue Over Time</h3>
          <RevenueLineChart
            data={data?.revenue_chart || []}
            height={250}
            tooltipContent={<CustomTooltip />}
            showLegend
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Subscription breakdown bar */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-5">Subscription Types</h3>
            <div className="space-y-5 mt-4">
              {[
                { label: 'Monthly', value: data?.subscription_breakdown?.monthly || 0, color: '#00c6ff' },
                { label: 'Yearly', value: data?.subscription_breakdown?.yearly || 0, color: '#FFD700' },
              ].map((item) => {
                const total =
                  (data?.subscription_breakdown?.monthly || 0) +
                  (data?.subscription_breakdown?.yearly || 0);
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between mb-2">
                      <span className="text-dark-300 text-sm">{item.label}</span>
                      <span className="font-mono text-sm" style={{ color: item.color }}>
                        {item.value} ({pct}%)
                      </span>
                    </div>
                    <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue distribution pie */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-5">Revenue Distribution</h3>
            <div className="flex items-center gap-4">
              <RevenuePieChart data={pieData} colors={COLORS} height={160} />
              <div className="space-y-3">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                    <div>
                      <div className="text-dark-300 text-xs">{item.name}</div>
                      <div className="text-white text-sm font-mono">
                        ₹{(item.value || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
