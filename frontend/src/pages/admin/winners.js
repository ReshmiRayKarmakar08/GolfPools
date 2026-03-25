import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { winnersAPI } from '../../utils/api';
import { IconCrown, IconMedal, IconShield, IconCheck, IconX } from '../../components/icons/Icons';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'paid', label: 'Paid' },
  { key: 'rejected', label: 'Rejected' },
];

function ActionModal({ winner, type, onClose, onSubmit, loading }) {
  const { register, handleSubmit } = useForm();

  const isPaid = type === 'mark-paid';
  const isApprove = type === 'approve';
  const isReject = type === 'reject';

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay-glass"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="glass-card p-8 w-full max-w-md relative"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={e => e.stopPropagation()}
          style={{
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 60px rgba(0,198,255,0.1)',
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-dark-500 hover:text-white transition-colors"
          ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>

          <h3 className="text-white font-semibold text-lg mb-5">
            {isPaid ? 'Mark as Paid' : isApprove ? 'Approve Winner' : 'Reject Claim'}
          </h3>

          {/* Winner info card */}
          <div className="glass-card p-4 mb-5">
            <div className="flex items-center gap-3">
              <motion.span
                className="text-2xl"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {winner.prize_category === '5-match' ? <IconCrown className="text-yellow-400" size={16} /> : winner.prize_category === '4-match' ? <IconMedal className="text-gray-400" size={16} tier="silver" /> : <IconMedal className="text-amber-600" size={16} tier="bronze" />}
              </motion.span>
              <div>
                <div className="text-white font-medium">{winner.users?.first_name} {winner.users?.last_name}</div>
                <div className="text-dark-400 text-sm">{winner.prize_category} — <span className="gradient-text-gold font-bold">₹{(winner.prize_amount || 0).toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          </div>

          {/* Proof preview */}
          {winner.proof_url && (
            <div className="mb-5">
              <label className="block text-sm text-dark-400 mb-2">Proof Submitted</label>
              <a
                href={winner.proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block glass-card p-3 hover:border-brand-500/30 transition-colors text-center"
              >
                <span className="text-brand-400 text-sm hover:text-brand-300">View Proof Document →</span>
              </a>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {(isApprove || isReject) && (
              <div>
                <label className="block text-sm text-dark-300 mb-2">Admin Notes</label>
                <textarea
                  {...register('admin_notes')}
                  className="input-field resize-none"
                  rows={3}
                  placeholder={isReject ? 'Reason for rejection...' : 'Optional notes...'}
                />
              </div>
            )}
            {isPaid && (
              <div>
                <label className="block text-sm text-dark-300 mb-2">Payment Reference</label>
                <input
                  {...register('payment_reference', { required: 'Reference is required' })}
                  className="input-field"
                  placeholder="UTR/Transaction ID"
                />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">Cancel</button>
              <motion.button
                type="submit"
                disabled={loading}
                className={`flex-1 py-2.5 ${isReject ? 'btn-danger' : 'btn-primary'} disabled:opacity-50`}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                {loading ? 'Processing...' : isPaid ? 'Confirm Paid' : isApprove ? 'Approve' : 'Reject'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AdminWinnersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [actionModal, setActionModal] = useState(null);

  const { data: winners } = useQuery(['adminWinners', statusFilter], () => winnersAPI.getAll({ status: statusFilter || undefined }), {
    select: r => r.data.winners
  });

  const approveMutation = useMutation(({ id, data }) => winnersAPI.approve(id, data), {
    onSuccess: () => { qc.invalidateQueries('adminWinners'); toast.success('Winner approved!'); setActionModal(null); },
    onError: () => toast.error('Failed to approve')
  });

  const rejectMutation = useMutation(({ id, data }) => winnersAPI.reject(id, data), {
    onSuccess: () => { qc.invalidateQueries('adminWinners'); toast.success('Rejected.'); setActionModal(null); },
    onError: () => toast.error('Failed to reject')
  });

  const paidMutation = useMutation(({ id, data }) => winnersAPI.markPaid(id, data), {
    onSuccess: () => { qc.invalidateQueries('adminWinners'); toast.success('Marked as paid!'); setActionModal(null); },
    onError: () => toast.error('Failed to mark as paid')
  });

  const handleAction = (data) => {
    if (!actionModal) return;
    const { winner, type } = actionModal;
    if (type === 'approve') approveMutation.mutate({ id: winner.id, data });
    else if (type === 'reject') rejectMutation.mutate({ id: winner.id, data });
    else if (type === 'mark-paid') paidMutation.mutate({ id: winner.id, data });
  };

  const isLoading = approveMutation.isLoading || rejectMutation.isLoading || paidMutation.isLoading;

  return (
    <DashboardLayout title="Winners Verification">
      {actionModal && (
        <ActionModal
          winner={actionModal.winner}
          type={actionModal.type}
          onClose={() => setActionModal(null)}
          onSubmit={handleAction}
          loading={isLoading}
        />
      )}
      <div className="space-y-6">
        <div>
          <h2 className="text-white font-bold text-xl">Winners & Payouts</h2>
          <p className="text-dark-400 text-sm mt-1">Verify proof, approve claims, and track payments</p>
        </div>

        {/* Razorpay Compliance Banner */}
        <div className="admin-verification-banner flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <IconShield className="text-yellow-400" size={20} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm mb-1">Verification Required — Payment Gateway Compliance</h3>
            <p className="text-dark-400 text-xs leading-relaxed">
              All prize claims must be manually verified before payment. Review uploaded scorecard proof and 
              transition payment status from <span className="text-yellow-400">Pending</span> → <span className="text-green-400">Approved</span> → <span className="text-brand-400">Paid</span>. 
              This process ensures compliance with Razorpay audit requirements.
            </p>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(tab => (
            <motion.button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === tab.key
                  ? 'bg-brand-500/20 border border-brand-500/40 text-brand-300'
                  : 'text-dark-400 hover:text-white border border-transparent hover:border-white/10'
              }`}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {tab.label}
              {tab.key === '' && winners && <span className="ml-1 text-dark-500">({winners.length})</span>}
            </motion.button>
          ))}
        </div>

        {/* Winners table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">Winner</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">Draw</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">Prize</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">Proof</th>
                  <th className="px-6 py-3 text-right text-dark-400 text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {winners?.map((winner, i) => (
                  <motion.tr
                    key={winner.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-medium text-sm">
                        {winner.users?.first_name} {winner.users?.last_name}
                      </div>
                      <div className="text-dark-500 text-xs">{winner.users?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-dark-300 text-sm">
                      {winner.monthly_draws ? `${MONTH_NAMES[winner.monthly_draws.draw_month - 1]} ${winner.monthly_draws.draw_year}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white text-sm">
                        {winner.prize_category === '5-match' ? <IconCrown className="text-yellow-400" size={16} /> : winner.prize_category === '4-match' ? <IconMedal className="text-gray-400" size={16} tier="silver" /> : <IconMedal className="text-amber-600" size={16} tier="bronze" />}
                        {' '}{winner.prize_category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="gradient-text-gold font-bold font-mono text-sm">
                        ₹{(winner.prize_amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={{
                        pending: 'badge-warning', verified: 'badge-info',
                        approved: 'badge-success', paid: 'badge-success', rejected: 'badge-error'
                      }[winner.payment_status] || 'badge-warning'}>
                        {winner.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {winner.proof_url ? (
                        <a href={winner.proof_url} target="_blank" rel="noopener noreferrer"
                          className="text-brand-400 hover:text-brand-300 text-sm underline">
                          View Proof
                        </a>
                      ) : (
                        <span className="text-dark-600 text-sm">No proof yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {(winner.payment_status === 'pending' || winner.payment_status === 'verified') && (
                          <>
                            <button
                              onClick={() => setActionModal({ winner, type: 'approve' })}
                              className="text-xs bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setActionModal({ winner, type: 'reject' })}
                              className="text-xs bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {winner.payment_status === 'approved' && (
                          <button
                            onClick={() => setActionModal({ winner, type: 'mark-paid' })}
                            className="text-xs btn-gold px-3 py-1.5"
                          >
                            Mark Paid
                          </button>
                        )}
                        {winner.payment_status === 'paid' && (
                          <span className="text-green-400 text-xs flex items-center gap-1"><IconCheck size={12} /> Paid</span>
                        )}
                        {winner.payment_status === 'rejected' && (
                          <span className="text-red-400 text-xs flex items-center gap-1"><IconX size={12} /> Rejected</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {(!winners || winners.length === 0) && (
              <div className="text-center py-12 text-dark-500">
                No winners found for this filter
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
