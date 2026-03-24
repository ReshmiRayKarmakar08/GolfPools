import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { winnersAPI } from '../../utils/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'badge-warning', icon: '⏳' },
  verified: { label: 'Under Review', color: 'badge-info', icon: '🔍' },
  approved: { label: 'Approved', color: 'badge-success', icon: '✅' },
  paid: { label: 'Paid', color: 'badge-success', icon: '💰' },
  rejected: { label: 'Rejected', color: 'badge-error', icon: '❌' },
};

function ProofUploadModal({ winner, onClose, onUpload }) {
  const [proofUrl, setProofUrl] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        className="glass-card p-6 w-full max-w-md"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h3 className="text-white font-semibold text-lg mb-2">Upload Proof</h3>
        <p className="text-dark-400 text-sm mb-4">
          Upload a screenshot of your score card from your golf club or scoring app.
        </p>
        <div className="mb-4">
          <label className="block text-sm text-dark-300 mb-2">Screenshot URL</label>
          <input
            type="url"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            className="input-field"
            placeholder="https://..."
          />
          <p className="text-dark-600 text-xs mt-1">
            Upload to Imgur, Google Drive, etc. and paste the link here
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5">Cancel</button>
          <button
            onClick={() => proofUrl && onUpload(winner.id, proofUrl)}
            disabled={!proofUrl}
            className="btn-primary flex-1 py-2.5 disabled:opacity-50"
          >
            Submit Proof
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function WinningsPage() {
  const qc = useQueryClient();
  const [proofModal, setProofModal] = useState(null);

  const { data: winners, isLoading } = useQuery('myWinnings', winnersAPI.getMy, {
    select: r => r.data.winners
  });

  const uploadMutation = useMutation(
    ({ id, url }) => winnersAPI.uploadProof(id, { proof_url: url }),
    {
      onSuccess: () => {
        qc.invalidateQueries('myWinnings');
        toast.success('Proof submitted! Admin will review shortly.');
        setProofModal(null);
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to upload proof')
    }
  );

  const totalWon = winners?.filter(w => w.payment_status !== 'rejected').reduce((s, w) => s + (w.prize_amount || 0), 0) || 0;
  const paidOut = winners?.filter(w => w.payment_status === 'paid').reduce((s, w) => s + (w.prize_amount || 0), 0) || 0;

  return (
    <DashboardLayout title="My Winnings">
      {proofModal && (
        <ProofUploadModal
          winner={proofModal}
          onClose={() => setProofModal(null)}
          onUpload={(id, url) => uploadMutation.mutate({ id, url })}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-5 text-center">
            <div className="text-3xl font-bold gradient-text-gold font-mono">₹{totalWon.toLocaleString('en-IN')}</div>
            <div className="text-dark-400 text-sm mt-1">Total Won</div>
          </div>
          <div className="glass-card p-5 text-center">
            <div className="text-3xl font-bold text-green-400 font-mono">₹{paidOut.toLocaleString('en-IN')}</div>
            <div className="text-dark-400 text-sm mt-1">Paid Out</div>
          </div>
        </div>

        {/* Winners list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="glass-card h-28 shimmer" />)}
          </div>
        ) : winners && winners.length > 0 ? (
          <div className="space-y-4">
            {winners.map((winner, i) => {
              const status = STATUS_CONFIG[winner.payment_status] || STATUS_CONFIG.pending;
              const month = winner.monthly_draws?.draw_month;
              const year = winner.monthly_draws?.draw_year;

              return (
                <motion.div
                  key={winner.id}
                  className="glass-card-hover p-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{winner.prize_category === '5-match' ? '👑' : winner.prize_category === '4-match' ? '🥈' : '🥉'}</span>
                        <span className="text-white font-bold">{winner.prize_category} Winner</span>
                      </div>
                      <div className="text-dark-400 text-sm">
                        {month ? `${MONTH_NAMES[month - 1]} ${year} Draw` : 'Draw'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="gradient-text-gold font-bold text-xl font-mono">
                        ₹{(winner.prize_amount || 0).toLocaleString('en-IN')}
                      </div>
                      <div className={`${status.color} mt-1`}>{status.icon} {status.label}</div>
                    </div>
                  </div>

                  {/* Status timeline */}
                  <div className="flex items-center gap-2 mb-4">
                    {['pending', 'verified', 'approved', 'paid'].map((s, si) => {
                      const statuses = ['pending', 'verified', 'approved', 'paid'];
                      const currentIdx = statuses.indexOf(winner.payment_status);
                      const isActive = si <= currentIdx && winner.payment_status !== 'rejected';
                      return (
                        <div key={s} className="flex items-center gap-2 flex-1">
                          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-brand-500' : 'bg-dark-700'}`} />
                          <div className={`h-0.5 flex-1 ${si < 3 ? (isActive ? 'bg-brand-500/30' : 'bg-dark-700') : 'hidden'}`} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-dark-600">
                    <span>Pending</span><span>Reviewed</span><span>Approved</span><span>Paid</span>
                  </div>

                  {/* Admin notes */}
                  {winner.admin_notes && (
                    <div className="mt-3 p-3 rounded-lg bg-white/3 border border-white/5">
                      <div className="text-dark-400 text-xs mb-1">Admin Note:</div>
                      <div className="text-white text-sm">{winner.admin_notes}</div>
                    </div>
                  )}

                  {/* Actions */}
                  {winner.payment_status === 'pending' && !winner.proof_url && (
                    <div className="mt-4">
                      <p className="text-dark-400 text-sm mb-3">
                        To claim your prize, please upload proof of your score card.
                      </p>
                      <button
                        onClick={() => setProofModal(winner)}
                        className="btn-primary text-sm px-5 py-2.5"
                      >
                        📎 Upload Score Proof
                      </button>
                    </div>
                  )}

                  {winner.proof_url && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="badge-info">📎 Proof uploaded</span>
                      <a href={winner.proof_url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">
                        View →
                      </a>
                    </div>
                  )}

                  {winner.payment_status === 'paid' && winner.paid_at && (
                    <div className="mt-3 text-green-400 text-sm">
                      💰 Paid on {new Date(winner.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card text-center py-16">
            <div className="text-5xl mb-4">🎰</div>
            <h3 className="text-white font-semibold mb-2">No winnings yet</h3>
            <p className="text-dark-400 text-sm max-w-sm mx-auto">
              Enter monthly draws with your scores to win. Match 3, 4, or all 5 numbers!
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
