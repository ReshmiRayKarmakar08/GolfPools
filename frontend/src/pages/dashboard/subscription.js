import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { subscriptionsAPI, paymentsAPI } from '../../utils/api';

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: subRes, isLoading } = useQuery('subscription', subscriptionsAPI.getCurrent);
  const sub = subRes?.data?.subscription;
  const queuedSubs = subRes?.data?.queuedSubscriptions || [];

  const { data: payments } = useQuery('paymentHistory', paymentsAPI.getHistory, {
    select: (r) => r.data.payments,
  });

  const cancelMutation = useMutation(paymentsAPI.cancelSubscription, {
    onSuccess: () => {
      qc.invalidateQueries('subscription');
      toast.success('Subscription will cancel at period end');
      setConfirmCancel(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to cancel'),
  });

  const daysLeft = sub?.current_period_end
    ? Math.max(0, differenceInDays(new Date(sub.current_period_end), new Date()))
    : null;

  if (isLoading) {
    return (
      <DashboardLayout title="Subscription" legalFooterMaxWidth="max-w-2xl">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card h-32 shimmer" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!sub || sub.status === 'expired') {
    return (
      <DashboardLayout title="Subscription" legalFooterMaxWidth="max-w-2xl">
        <div className="max-w-lg mx-auto text-center glass-card p-12">
          <div className="text-5xl mb-4">⛳</div>
          <h2 className="text-white font-bold text-xl mb-2">
            {sub?.status === 'expired' ? 'Your Subscription Has Ended' : 'No Active Subscription'}
          </h2>
          <p className="text-dark-400 mb-6">
            {sub?.status === 'expired'
              ? 'Your previous plan has completed. Renew now to continue entering monthly draws, submitting golf scores, and supporting your chosen charity!'
              : 'Subscribe to enter monthly draws, log your scores, and support a charity you love.'}
          </p>
          <Link href="/dashboard/subscribe" className="btn-gold px-8 py-3 inline-block font-bold">
            {sub?.status === 'expired' ? 'Renew Subscription Now →' : 'Choose a Plan →'}
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Subscription" legalFooterMaxWidth="max-w-2xl">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Active subscription card */}
        <motion.div
          className="glass-card p-6 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="absolute inset-0 opacity-5"
            style={{
              background: 'radial-gradient(circle at top right, #00c6ff, transparent)',
            }}
          />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={
                      daysLeft === 0
                        ? 'badge-error'
                        : sub.status === 'active'
                        ? 'badge-success'
                        : sub.cancel_at_period_end
                        ? 'badge-warning'
                        : 'badge-error'
                    }
                  >
                    {daysLeft === 0
                      ? 'Expired'
                      : sub.cancel_at_period_end
                      ? 'Cancelling'
                      : sub.status === 'active'
                      ? 'Active'
                      : sub.status}
                  </span>
                </div>
                <h2 className="text-white font-bold text-xl capitalize">
                  {sub.plan_type} Plan
                </h2>
                <div className="text-brand-400 font-mono font-bold text-2xl mt-1">
                  ₹{(sub.amount || 0).toLocaleString('en-IN')}
                  <span className="text-dark-500 text-sm font-normal">
                    /{sub.plan_type === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-dark-400 text-sm">Days Remaining</div>
                <div
                  className={`text-4xl font-display font-bold ${
                    daysLeft === 0 || daysLeft < 7 ? 'text-red-400' : 'gradient-text'
                  }`}
                >
                  {daysLeft}
                </div>
              </div>
            </div>

            {/* Period bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-dark-500 mb-1">
                <span>
                  {sub.current_period_start
                    ? format(new Date(sub.current_period_start), 'MMM d, yyyy')
                    : '—'}
                </span>
                <span>
                  {sub.current_period_end
                    ? format(new Date(sub.current_period_end), 'MMM d, yyyy')
                    : '—'}
                </span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                {sub.current_period_start && sub.current_period_end && (() => {
                  const total =
                    new Date(sub.current_period_end) - new Date(sub.current_period_start);
                  const elapsed = Date.now() - new Date(sub.current_period_start);
                  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
                  return (
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #00c6ff, #0072ff)',
                      }}
                    />
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <div className="text-dark-400 text-xs mb-1">Charity</div>
                <div className="text-white font-medium text-sm">
                  {sub.charities?.name || '—'}
                </div>
                <div className="text-brand-400 font-mono text-xs mt-0.5">
                  {sub.charity_percentage}% contribution
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="text-dark-400 text-xs mb-1">Next renewal</div>
                <div className="text-white font-medium text-sm">
                  {sub.cancel_at_period_end
                    ? 'Will not renew'
                    : sub.current_period_end
                    ? format(new Date(sub.current_period_end), 'MMM d, yyyy')
                    : '—'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action card: Renew / Extend Subscription if daysLeft == 0 or cancelling */}
        {(daysLeft === 0 || sub.cancel_at_period_end || sub.status === 'expired') && (
          <div className="glass-card p-6 border border-brand-500/30 bg-brand-950/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-bold text-lg mb-1">
                  {daysLeft === 0 ? 'Renew Your Subscription' : 'Extend Your Subscription'}
                </h3>
                <p className="text-dark-300 text-sm">
                  {sub.cancel_at_period_end
                    ? `Your plan will end on ${sub.current_period_end ? format(new Date(sub.current_period_end), 'MMMM d, yyyy') : 'period end'}. You can buy another plan now to queue it automatically!`
                    : 'Subscribe to another plan to keep your monthly draw entries active.'}
                </p>
              </div>
              <Link href="/dashboard/subscribe" className="btn-gold px-6 py-3 font-bold text-sm whitespace-nowrap">
                Subscribe / Renew Plan →
              </Link>
            </div>
          </div>
        )}

        {/* Queued Subscriptions */}
        {queuedSubs && queuedSubs.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
              <span>⏳</span> Queued Subscriptions ({queuedSubs.length})
            </h3>
            <p className="text-dark-400 text-xs mb-4">
              These plans are paid and queued. They will start automatically as soon as your current plan ends!
            </p>
            <div className="space-y-3">
              {queuedSubs.map((q) => (
                <div key={q.id} className="p-4 rounded-xl bg-dark-800/50 border border-white/5 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge-warning text-xs">Queued</span>
                      <span className="text-white font-semibold capitalize text-sm">{q.plan_type} Plan</span>
                    </div>
                    <div className="text-dark-400 text-xs mt-1">
                      Starts: {q.current_period_start ? format(new Date(q.current_period_start), 'MMM d, yyyy') : '—'}
                      {' · '}
                      Ends: {q.current_period_end ? format(new Date(q.current_period_end), 'MMM d, yyyy') : '—'}
                    </div>
                  </div>
                  <div className="text-brand-400 font-mono font-bold text-sm">
                    ₹{(q.amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel / manage */}
        {sub.status === 'pending' && (
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-2">Complete Your Payment</h3>
            <p className="text-dark-400 text-sm mb-4">
              Your subscription is created but payment is still pending. Continue to checkout to activate your plan.
            </p>
            <Link
              href={`/dashboard/subscribe?plan=${sub.plan_type || 'monthly'}&charity=${sub.charity_id || ''}`}
              className="btn-primary px-6 py-2.5 text-sm"
            >
              Complete Payment →
            </Link>
          </div>
        )}

        {sub.status === 'active' && !sub.cancel_at_period_end && (
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-2">Manage Subscription</h3>
            <p className="text-dark-400 text-sm mb-4">
              Cancelling will keep your subscription active until the end of the current period.
            </p>
            {confirmCancel ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isLoading}
                  className="btn-danger flex-1 py-2.5"
                >
                  {cancelMutation.isLoading ? 'Cancelling…' : 'Yes, Cancel'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmCancel(true)}
                className="btn-danger px-6 py-2.5 text-sm"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        )}

        {sub.cancel_at_period_end && (
          <div
            className="rounded-xl p-4"
            style={{
              background: 'rgba(255,215,0,0.07)',
              border: '1px solid rgba(255,215,0,0.2)',
            }}
          >
            <p className="text-yellow-300 text-sm">
              ! Your subscription is set to cancel on{' '}
              {sub.current_period_end
                ? format(new Date(sub.current_period_end), 'MMMM d, yyyy')
                : '—'}
              . You can still participate in draws until then.
            </p>
          </div>
        )}

        {/* Payment history */}
        {payments && payments.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">Payment History</h3>
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                >
                  <div>
                    <div className="text-white text-sm font-medium">
                      {p.charities?.name || 'Subscription'}
                    </div>
                    <div className="text-dark-500 text-xs">
                      {format(new Date(p.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-mono text-sm">
                      ₹{(p.amount || 0).toLocaleString('en-IN')}
                    </div>
                    <span
                      className={
                        p.status === 'captured' ? 'badge-success' : 'badge-error'
                      }
                    >
                      {p.status === 'captured' ? 'Paid' : p.status}
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
