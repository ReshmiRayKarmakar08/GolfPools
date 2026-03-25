import { useState } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { adminAPI } from '../../utils/api';

const STATUS_OPTIONS = ['all', 'active', 'lapsed', 'cancelled'];

const statusStyles = {
  active: 'badge-success',
  lapsed: 'badge-warning',
  cancelled: 'badge-danger',
};

export default function AdminSubscriptionsPage() {
  const [filter, setFilter] = useState('all');

  const { data, isLoading } = useQuery(['adminSubscriptions', filter], adminAPI.getSubscriptions, {
    select: (r) => r.data,
    retry: false,
  });

  const subscriptions = data?.subscriptions || [];
  const filtered = filter === 'all'
    ? subscriptions
    : subscriptions.filter((s) => (s.status || '').toLowerCase() === filter);

  return (
    <DashboardLayout title="Subscriptions">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-white font-bold text-xl">Subscription Control</h2>
            <p className="text-dark-400 text-sm">
              Monitor active plans and lifecycle changes with anti-gravity clarity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === item
                    ? 'bg-brand-500/20 border border-brand-500/40 text-brand-300'
                    : 'text-dark-400 border border-white/8 hover:text-white'
                }`}
              >
                {item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          className="glass-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-white font-semibold">Current Subscriptions</div>
            <div className="text-dark-500 text-xs">
              {filtered.length} shown
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-dark-500 text-left border-b border-white/5">
                  <th className="py-3 pr-4 font-medium">Member</th>
                  <th className="py-3 pr-4 font-medium">Plan</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Charity</th>
                  <th className="py-3 pr-4 font-medium">Period Ends</th>
                  <th className="py-3 pr-4 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-dark-400">Loading subscriptions...</td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-dark-500">
                      No subscriptions found for this filter.
                    </td>
                  </tr>
                )}
                {filtered.map((sub) => (
                  <tr key={sub.id} className="border-b border-white/5 last:border-0">
                    <td className="py-4 pr-4">
                      <div className="text-white font-medium">
                        {sub.users?.first_name || 'Member'} {sub.users?.last_name || ''}
                      </div>
                      <div className="text-dark-500 text-xs">{sub.users?.email}</div>
                    </td>
                    <td className="py-4 pr-4 text-dark-300">
                      {sub.plan_type || 'monthly'}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={statusStyles[sub.status] || 'badge-neutral'}>
                        {sub.status || 'unknown'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-dark-400">
                      {sub.charities?.name || '—'}
                    </td>
                    <td className="py-4 pr-4 text-dark-400">
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-4 pr-4 text-white font-mono">
                      ₹{(sub.amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
