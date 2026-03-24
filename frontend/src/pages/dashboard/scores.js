import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { scoresAPI } from '../../utils/api';

const MAX_SCORES = 5;

function ScoreBar({ score }) {
  const pct = (score / 45) * 100;
  const color = score >= 35 ? '#00E5CC' : score >= 25 ? '#00c6ff' : score >= 15 ? '#FFD700' : '#FF6B6B';
  return (
    <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{ background: color }}
      />
    </div>
  );
}

export default function ScoresPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const { data: scoresData, isLoading } = useQuery('scores', scoresAPI.getScores, {
    select: r => r.data.scores
  });

  const { data: statsData } = useQuery('scoreStats', scoresAPI.getStats, {
    select: r => r.data.stats
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { score_date: new Date().toISOString().split('T')[0] }
  });

  const addMutation = useMutation(scoresAPI.addScore, {
    onSuccess: (r) => {
      qc.invalidateQueries('scores');
      qc.invalidateQueries('scoreStats');
      toast.success(r.data.message);
      setShowAdd(false);
      reset({ score_date: new Date().toISOString().split('T')[0] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add score')
  });

  const updateMutation = useMutation(({ id, data }) => scoresAPI.updateScore(id, data), {
    onSuccess: () => {
      qc.invalidateQueries('scores');
      toast.success('Score updated');
      setEditingId(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update')
  });

  const deleteMutation = useMutation(scoresAPI.deleteScore, {
    onSuccess: () => {
      qc.invalidateQueries('scores');
      toast.success('Score removed');
      setRemovingId(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete')
  });

  const handleDelete = (id) => {
    if (confirm('Remove this score?')) {
      setRemovingId(id);
      // Wait for animation then delete
      setTimeout(() => deleteMutation.mutate(id), 600);
    }
  };

  const onAdd = (data) => addMutation.mutate({ ...data, score: parseInt(data.score) });

  // Stat count-up refs
  const avgRef = useRef(null);
  const bestRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    if (!statsData) return;
    const animate = (ref, val) => {
      if (!ref.current || typeof val !== 'number') return;
      const obj = { v: 0 };
      gsap.to(obj, {
        v: val,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          if (ref.current) ref.current.textContent = Math.round(obj.v);
        },
      });
    };
    animate(avgRef, statsData.average);
    animate(bestRef, statsData.highest);
    animate(lastRef, statsData.scores?.[0]?.score);
  }, [statsData]);

  return (
    <DashboardLayout title="My Scores">
      <div className="max-w-2xl mx-auto">
        {/* Stats row */}
        {statsData && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Average', ref: avgRef },
              { label: 'Best', ref: bestRef },
              { label: 'Last', ref: lastRef },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="glass-card p-4 text-center floating-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-2xl font-bold font-mono gradient-text" ref={s.ref}>0</div>
                <div className="text-dark-500 text-xs mt-1">{s.label} Score</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-lg">Score History</h2>
            <p className="text-dark-500 text-sm">
              {scoresData?.length || 0} of {MAX_SCORES} scores · Oldest auto-replaced when full
            </p>
          </div>
          <motion.button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-primary text-sm px-5 py-2.5"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            + Add Score
          </motion.button>
        </div>

        {/* Slot usage */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-dark-400 text-xs">Score slots</span>
            <span className="text-brand-400 text-xs font-mono">{scoresData?.length || 0}/{MAX_SCORES}</span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: MAX_SCORES }).map((_, i) => (
              <motion.div
                key={i}
                className={`flex-1 h-2 rounded-full ${
                  i < (scoresData?.length || 0) ? 'bg-brand-500' : 'bg-dark-700'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                style={{ transformOrigin: 'left' }}
              />
            ))}
          </div>
          {scoresData?.length === MAX_SCORES && (
            <p className="text-amber-400 text-xs mt-2">⚠️ Next score will replace your oldest entry</p>
          )}
        </div>

        {/* Add score form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="overflow-hidden mb-6"
            >
              <div className="glass-card p-6 border border-brand-500/20">
                <h3 className="text-white font-semibold mb-4">Add New Score</h3>
                <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">
                        Stableford Score
                        <span className="text-dark-500 ml-1">(1–45)</span>
                      </label>
                      <input
                        {...register('score', {
                          required: 'Score is required',
                          min: { value: 1, message: 'Minimum score is 1' },
                          max: { value: 45, message: 'Maximum score is 45' }
                        })}
                        type="number"
                        min="1"
                        max="45"
                        className="input-field text-2xl font-mono text-center"
                        placeholder="28"
                      />
                      {errors.score && <p className="text-red-400 text-xs mt-1">{errors.score.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Date Played</label>
                      <input
                        {...register('score_date', { required: 'Date is required' })}
                        type="date"
                        className="input-field"
                        max={new Date().toISOString().split('T')[0]}
                      />
                      {errors.score_date && <p className="text-red-400 text-xs mt-1">{errors.score_date.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Course Name (optional)</label>
                    <input
                      {...register('course_name')}
                      className="input-field"
                      placeholder="e.g. Royal Calcutta Golf Club"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Notes (optional)</label>
                    <input
                      {...register('notes')}
                      className="input-field"
                      placeholder="Windy conditions, par 72..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2.5">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addMutation.isLoading}
                      className="btn-primary flex-1 py-2.5"
                    >
                      {addMutation.isLoading ? 'Adding...' : 'Add Score'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score list with anti-gravity animations */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card p-5 shimmer h-20" />
            ))
          ) : scoresData?.length > 0 ? (
            <AnimatePresence>
              {scoresData.map((score, idx) => (
                <motion.div
                  key={score.id}
                  className={`glass-card-hover p-5 ${removingId === score.id ? 'score-float-out' : ''}`}
                  initial={{ opacity: 0, y: -30, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -60, rotate: 10, filter: 'blur(6px)' }}
                  transition={{ delay: idx * 0.05, duration: 0.5 }}
                  layout
                >
                  {editingId === score.id ? (
                    <EditScoreForm
                      score={score}
                      onSave={(data) => updateMutation.mutate({ id: score.id, data })}
                      onCancel={() => setEditingId(null)}
                      loading={updateMutation.isLoading}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <motion.div
                          className="score-badge text-xl text-brand-300 w-14 h-14"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          {score.score}
                        </motion.div>
                        <div>
                          <div className="text-white font-medium">{score.course_name || 'Course not specified'}</div>
                          <div className="text-dark-500 text-sm">{format(new Date(score.score_date), 'MMM d, yyyy')}</div>
                          {score.notes && <div className="text-dark-600 text-xs mt-0.5">{score.notes}</div>}
                          <div className="mt-1 w-32"><ScoreBar score={score.score} /></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {idx === 0 && <span className="badge-info">Latest</span>}
                        {idx === scoresData.length - 1 && scoresData.length === MAX_SCORES && (
                          <motion.span
                            className="badge-warning text-xs"
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            Oldest
                          </motion.span>
                        )}
                        <button
                          onClick={() => setEditingId(score.id)}
                          className="p-2 text-dark-500 hover:text-white transition-colors"
                        >✏️</button>
                        <button
                          onClick={() => handleDelete(score.id)}
                          className="p-2 text-dark-500 hover:text-red-400 transition-colors"
                        >🗑️</button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-16 glass-card">
              <motion.div
                className="text-5xl mb-4"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                ⛳
              </motion.div>
              <h3 className="text-white font-semibold mb-2">No scores yet</h3>
              <p className="text-dark-400 text-sm mb-6">Add your first Stableford score to start entering draws</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary px-6 py-3">
                Add Your First Score
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function EditScoreForm({ score, onSave, onCancel, loading }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      score: score.score,
      score_date: score.score_date,
      course_name: score.course_name || '',
      notes: score.notes || ''
    }
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="grid grid-cols-2 gap-3">
      <div>
        <input {...register('score', { min: 1, max: 45 })} type="number" className="input-field text-center font-mono" />
      </div>
      <div>
        <input {...register('score_date')} type="date" className="input-field" />
      </div>
      <div className="col-span-2">
        <input {...register('course_name')} className="input-field" placeholder="Course name" />
      </div>
      <div className="flex gap-2 col-span-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 py-2 text-sm">Save</button>
      </div>
    </form>
  );
}
