import { useRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { winnersAPI } from '../../utils/api';

const STATUS_STEPS = ['pending', 'verified', 'approved', 'paid'];

function StatusTimeline({ currentStatus }) {
  const idx = STATUS_STEPS.indexOf(currentStatus);
  return (
    <div className="flex items-center gap-1 mt-2">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <motion.div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= idx
              ? 'bg-brand-500 text-dark-950'
              : 'bg-dark-700 text-dark-500'}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.15, type: 'spring' }}
          >
            {i <= idx ? '✓' : i + 1}
          </motion.div>
          {i < STATUS_STEPS.length - 1 && (
            <motion.div
              className={`w-6 h-0.5 ${i < idx ? 'bg-brand-500' : 'bg-dark-700'}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: i * 0.15 + 0.1 }}
              style={{ transformOrigin: 'left' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function WinningsPage() {
  const qc = useQueryClient();
  const [uploadId, setUploadId] = useState(null);
  const [proofFile, setProofFile] = useState(null);

  const { data: winnings, isLoading } = useQuery('myWinnings', winnersAPI.getMine, {
    select: (r) => r.data.winnings,
  });

  const uploadMutation = useMutation(
    ({ id, file }) => {
      const fd = new FormData();
      fd.append('proof', file);
      return winnersAPI.uploadProof(id, fd);
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('myWinnings');
        toast.success('Proof uploaded!');
        setUploadId(null);
        setProofFile(null);
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Upload failed'),
    }
  );

  // Count-up refs
  const totalRef = useRef(null);
  const paidRef = useRef(null);

  useEffect(() => {
    if (!winnings) return;
    const total = winnings.reduce((s, w) => s + (w.prize_amount || 0), 0);
    const paid = winnings.filter((w) => w.payment_status === 'paid').reduce((s, w) => s + (w.prize_amount || 0), 0);

    const animateRef = (ref, val) => {
      if (!ref.current) return;
      const obj = { v: 0 };
      gsap.to(obj, {
        v: val,
        duration: 1.5,
        ease: 'power2.out',
        delay: 0.3,
        onUpdate: () => {
          if (ref.current) ref.current.textContent = Math.round(obj.v).toLocaleString('en-IN');
        },
      });
    };

    animateRef(totalRef, total);
    animateRef(paidRef, paid);
  }, [winnings]);

  return (
    <DashboardLayout title="Winnings">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            className="glass-card p-6 text-center floating-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-3xl font-bold font-mono gradient-text-gold mb-1">
              ₹<span ref={totalRef}>0</span>
            </div>
            <div className="text-dark-400 text-sm">Total Won</div>
          </motion.div>
          <motion.div
            className="glass-card p-6 text-center floating-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-3xl font-bold font-mono text-green-400 mb-1">
              ₹<span ref={paidRef}>0</span>
            </div>
            <div className="text-dark-400 text-sm">Paid Out</div>
          </motion.div>
        </div>

        {/* Winnings list */}
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass-card h-32 shimmer" />
          ))
        ) : winnings && winnings.length > 0 ? (
          <div className="space-y-4">
            {winnings.map((w, i) => (
              <motion.div
                key={w.id}
                className="glass-card-hover p-6"
                initial={{ opacity: 0, y: 30, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <motion.span
                      className="text-3xl"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
                    >
                      {w.prize_category === '5-match' ? '👑' : w.prize_category === '4-match' ? '🥈' : '🥉'}
                    </motion.span>
                    <div>
                      <div className="text-white font-bold">{w.prize_category}</div>
                      <div className="text-dark-500 text-sm">
                        {w.monthly_draws
                          ? `${new Date(0, w.monthly_draws.draw_month - 1).toLocaleString('default', { month: 'long' })} ${w.monthly_draws.draw_year}`
                          : format(new Date(w.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="gradient-text-gold font-bold text-2xl font-mono">
                      ₹{(w.prize_amount || 0).toLocaleString('en-IN')}
                    </div>
                    <span className={{
                      pending: 'badge-warning',
                      verified: 'badge-info',
                      approved: 'badge-success',
                      paid: 'badge-success',
                      rejected: 'badge-error',
                    }[w.payment_status] || 'badge-warning'}>
                      {w.payment_status === 'paid' ? '✓ Paid' : w.payment_status}
                    </span>
                  </div>
                </div>

                {/* Status timeline */}
                <StatusTimeline currentStatus={w.payment_status} />

                {/* Matched numbers */}
                {w.matched_numbers && (
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="text-dark-500 text-xs mr-1">Matched:</span>
                    {w.matched_numbers.map((n, j) => (
                      <motion.span
                        key={j}
                        className="number-ball number-ball-winning w-7 h-7 text-xs"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + j * 0.1, type: 'spring' }}
                      >
                        {n}
                      </motion.span>
                    ))}
                  </div>
                )}

                {/* Proof section */}
                {w.payment_status === 'pending' && !w.proof_url && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    {uploadId === w.id ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProofFile(e.target.files?.[0])}
                          className="input-field text-sm flex-1"
                        />
                        <button
                          onClick={() => proofFile && uploadMutation.mutate({ id: w.id, file: proofFile })}
                          disabled={!proofFile || uploadMutation.isLoading}
                          className="btn-primary text-sm px-4 py-2.5"
                        >
                          {uploadMutation.isLoading ? 'Uploading...' : 'Upload'}
                        </button>
                        <button
                          onClick={() => { setUploadId(null); setProofFile(null); }}
                          className="text-dark-500 hover:text-white"
                        >✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setUploadId(w.id)}
                        className="btn-secondary text-sm w-full py-2.5"
                      >
                        📎 Upload Proof to Speed Up Verification
                      </button>
                    )}
                  </div>
                )}

                {w.proof_url && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-green-400 text-xs">✓ Proof submitted</span>
                    <a href={w.proof_url} target="_blank" rel="noreferrer" className="text-brand-400 text-xs">View →</a>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 glass-card">
            <motion.div
              className="text-5xl mb-4"
              animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >🏆</motion.div>
            <h3 className="text-white font-semibold mb-2">No Winnings Yet</h3>
            <p className="text-dark-400 text-sm">Keep entering your scores — your lucky draw could be next month!</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
