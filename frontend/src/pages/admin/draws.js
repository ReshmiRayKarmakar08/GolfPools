import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { drawsAPI } from '../../utils/api';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AdminDrawsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [simId, setSimId] = useState(null);

  const { data: draws } = useQuery('adminDraws', () => drawsAPI.getAll({ limit: 24 }), {
    select: r => r.data.draws
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      draw_month: new Date().getMonth() + 1,
      draw_year: new Date().getFullYear(),
      draw_type: 'random'
    }
  });

  const createMutation = useMutation(drawsAPI.createDraw, {
    onSuccess: () => {
      qc.invalidateQueries('adminDraws');
      toast.success('Draw created successfully');
      setShowCreate(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create draw')
  });

  const executeMutation = useMutation(drawsAPI.executeDraw, {
    onSuccess: (r) => {
      qc.invalidateQueries('adminDraws');
      toast.success(`🎉 Draw executed! ${r.data.five_match_winners} jackpot, ${r.data.four_match_winners} four-match, ${r.data.three_match_winners} three-match winners`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to execute draw')
  });

  const simMutation = useMutation(drawsAPI.simulateDraw, {
    onSuccess: (r) => {
      setSimResult(r.data.simulation);
      toast.success('Simulation complete');
    },
    onError: (err) => toast.error('Simulation failed')
  });

  return (
    <DashboardLayout title="Draws Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">Monthly Draws</h2>
            <p className="text-dark-400 text-sm mt-1">Create, configure and execute monthly prize draws</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary px-5 py-2.5">
            + New Draw
          </button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-card p-6 border border-brand-500/20">
                <h3 className="text-white font-semibold mb-4">Create New Draw</h3>
                <form onSubmit={handleSubmit(data => createMutation.mutate(data))} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Month</label>
                    <select {...register('draw_month', { valueAsNumber: true })} className="input-field">
                      {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Year</label>
                    <input {...register('draw_year', { valueAsNumber: true })} type="number" className="input-field" min="2024" />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Draw Type</label>
                    <select {...register('draw_type')} className="input-field">
                      <option value="random">Random</option>
                      <option value="algorithm">Algorithm</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button type="submit" disabled={createMutation.isLoading} className="btn-primary w-full py-3">
                      {createMutation.isLoading ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simulation result */}
        {simResult && (
          <div className="glass-card p-6 border border-brand-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">🔬 Simulation Result</h3>
              <button onClick={() => setSimResult(null)} className="text-dark-500 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{simResult.total_participants}</div>
                <div className="text-dark-500 text-xs">Participants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{simResult.five_match_count}</div>
                <div className="text-dark-500 text-xs">5-Match</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">{simResult.four_match_count}</div>
                <div className="text-dark-500 text-xs">4-Match</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{simResult.three_match_count}</div>
                <div className="text-dark-500 text-xs">3-Match</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-brand-400">₹{(simResult.estimated_five_prize || 0).toLocaleString('en-IN')}</div>
                <div className="text-dark-500 text-xs">5-Match Prize</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-green-400">₹{(simResult.rollover || 0).toLocaleString('en-IN')}</div>
                <div className="text-dark-500 text-xs">Rollover</div>
              </div>
            </div>
          </div>
        )}

        {/* Draws table */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="text-white font-semibold">All Draws</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase tracking-wider">Draw</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase tracking-wider">Participants</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase tracking-wider">Prize Pool</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase tracking-wider">Winners</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase tracking-wider">Winning Numbers</th>
                  <th className="px-6 py-3 text-right text-dark-400 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                {draws?.map(draw => (
                  <tr key={draw.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">
                        {MONTH_NAMES[draw.draw_month - 1].slice(0, 3)} {draw.draw_year}
                      </div>
                      <div className="text-dark-500 text-xs capitalize">{draw.draw_type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={draw.status === 'completed' ? 'badge-success' : draw.status === 'scheduled' ? 'badge-info' : 'badge-warning'}>
                        {draw.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-dark-300 text-sm">{draw.participant_count || 0}</td>
                    <td className="px-6 py-4">
                      <div className="text-white text-sm font-mono">₹{(draw.total_pool || 0).toLocaleString('en-IN')}</div>
                    </td>
                    <td className="px-6 py-4">
                      {draw.status === 'completed' ? (
                        <div className="text-xs space-y-0.5">
                          <div className="text-yellow-400">👑 {draw.five_match_winner_count}</div>
                          <div className="text-gray-400">🥈 {draw.four_match_winner_count}</div>
                          <div className="text-amber-600">🥉 {draw.three_match_winner_count}</div>
                        </div>
                      ) : <span className="text-dark-600 text-sm">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {draw.winning_numbers ? (
                        <div className="flex gap-1">
                          {draw.winning_numbers.map((n, i) => (
                            <span key={i} className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-300 text-xs font-mono font-bold">
                              {n}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-dark-600 text-sm">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {draw.status !== 'completed' && (
                          <>
                            <button
                              onClick={() => { setSimId(draw.id); simMutation.mutate(draw.id); }}
                              disabled={simMutation.isLoading && simId === draw.id}
                              className="text-xs btn-secondary px-3 py-1.5"
                            >
                              Simulate
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Execute the ${MONTH_NAMES[draw.draw_month - 1]} ${draw.draw_year} draw? This cannot be undone.`)) {
                                  executeMutation.mutate(draw.id);
                                }
                              }}
                              disabled={executeMutation.isLoading}
                              className="text-xs btn-gold px-3 py-1.5"
                            >
                              Execute
                            </button>
                          </>
                        )}
                        {draw.status === 'completed' && (
                          <span className="text-dark-600 text-xs">Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!draws || draws.length === 0) && (
              <div className="text-center py-12 text-dark-500">No draws yet. Create your first draw!</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
