import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { drawsAPI, scoresAPI, subscriptionsAPI } from '../../utils/api';
import Link from 'next/link';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function NumberBall({ number, isWinning, isUser }) {
  return (
    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold font-mono text-sm transition-all duration-300 ${
      isWinning && isUser ? 'number-ball-winning scale-110' :
      isWinning ? 'bg-brand-500/20 border-2 border-brand-500/60 text-brand-300' :
      isUser ? 'bg-white/10 border-2 border-white/20 text-white' :
      'number-ball text-dark-400'
    }`}>
      {number}
    </div>
  );
}

export default function DrawsPage() {
  const qc = useQueryClient();

  const { data: currentData, isLoading: currentLoading } = useQuery('currentDraw', drawsAPI.getCurrent, {
    select: r => r.data
  });

  const { data: historyData } = useQuery('drawHistory', drawsAPI.getUserHistory, {
    select: r => r.data.entries
  });

  const { data: scoresData } = useQuery('scores', scoresAPI.getScores, {
    select: r => r.data.scores
  });

  const { data: subData } = useQuery('subscription', subscriptionsAPI.getCurrent, {
    select: r => r.data.subscription
  });

  const enterMutation = useMutation((id) => drawsAPI.enterDraw(id), {
    onSuccess: (r) => {
      qc.invalidateQueries('currentDraw');
      qc.invalidateQueries('drawHistory');
      toast.success(`🎉 Entered! Your numbers: ${r.data.numbers_entered.join(', ')}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to enter draw')
  });

  const draw = currentData?.draw;
  const userEntry = currentData?.userEntry;

  const now = new Date();
  const currentMonth = MONTH_NAMES[now.getMonth()];
  const currentYear = now.getFullYear();

  return (
    <DashboardLayout title="Monthly Draws">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Current Draw Card */}
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
            style={{ background: 'radial-gradient(circle at top right, #00c6ff, transparent)' }} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{currentMonth} {currentYear} Draw</h2>
                <p className="text-dark-400 text-sm mt-1">Monthly Stableford Score Draw</p>
              </div>
              {draw && (
                <span className={draw.status === 'completed' ? 'badge-success' : 'badge-warning'}>
                  {draw.status === 'completed' ? '✓ Completed' : '🟢 Open'}
                </span>
              )}
            </div>

            {draw ? (
              <>
                {/* Prize Pool */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: '5-Match Jackpot', amount: draw.five_match_pool, icon: '👑', cls: 'prize-gold' },
                    { label: '4-Match Prize', amount: draw.four_match_pool, icon: '🥈', cls: 'prize-silver' },
                    { label: '3-Match Prize', amount: draw.three_match_pool, icon: '🥉', cls: 'prize-bronze' },
                  ].map((tier, i) => (
                    <div key={i} className={`${tier.cls} rounded-xl p-4 text-center`}>
                      <div className="text-xl mb-1">{tier.icon}</div>
                      <div className="text-white font-bold text-sm">₹{(tier.amount || 0).toLocaleString('en-IN')}</div>
                      <div className="text-dark-400 text-xs">{tier.label}</div>
                    </div>
                  ))}
                </div>

                {/* Winning numbers (if completed) */}
                {draw.status === 'completed' && (
                  <div className="mb-6">
                    <div className="text-dark-400 text-sm mb-3">Winning Numbers</div>
                    <div className="flex gap-2">
                      {draw.winning_numbers.map((n, i) => (
                        <NumberBall key={i} number={n} isWinning={true} />
                      ))}
                    </div>
                  </div>
                )}

                {/* User entry */}
                {userEntry ? (
                  <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="badge-success">✓ Entered</span>
                      {userEntry.is_winner && (
                        <span className="badge-warning">🏆 Winner! ₹{userEntry.prize_amount?.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    <div className="text-dark-400 text-sm mb-3">Your Numbers</div>
                    <div className="flex gap-2 flex-wrap">
                      {userEntry.numbers_entered.map((n, i) => {
                        const isWin = draw.status === 'completed' && draw.winning_numbers.includes(n);
                        return <NumberBall key={i} number={n} isWinning={isWin} isUser={true} />;
                      })}
                    </div>
                    {draw.status === 'completed' && userEntry.match_count > 0 && (
                      <p className="text-brand-400 text-sm mt-3 font-semibold">
                        🎯 {userEntry.match_count} match{userEntry.match_count !== 1 ? 'es' : ''}!
                        {userEntry.is_winner && ` Check your winnings.`}
                      </p>
                    )}
                    {draw.status === 'completed' && userEntry.match_count === 0 && (
                      <p className="text-dark-500 text-sm mt-3">No matches this time. Better luck next month!</p>
                    )}
                  </div>
                ) : draw.status !== 'completed' ? (
                  <div>
                    {!subData ? (
                      <div className="text-center py-4">
                        <p className="text-dark-400 mb-3">You need an active subscription to enter draws</p>
                        <Link href="/dashboard/subscribe" className="btn-primary text-sm px-6 py-2.5">Subscribe Now</Link>
                      </div>
                    ) : !scoresData?.length ? (
                      <div className="text-center py-4">
                        <p className="text-dark-400 mb-3">Add at least one score to enter the draw</p>
                        <Link href="/dashboard/scores" className="btn-secondary text-sm px-6 py-2.5">Add Scores</Link>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4">
                          <div className="text-dark-400 text-sm mb-2">Your current scores (will be entered):</div>
                          <div className="flex gap-2 flex-wrap">
                            {scoresData.map((s, i) => (
                              <div key={i} className="number-ball w-11 h-11 text-sm rounded-full flex items-center justify-center font-bold text-brand-300">
                                {s.score}
                              </div>
                            ))}
                          </div>
                        </div>
                        <motion.button
                          onClick={() => enterMutation.mutate(draw.id)}
                          disabled={enterMutation.isLoading}
                          className="btn-gold w-full py-3.5 text-base font-semibold"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {enterMutation.isLoading ? 'Entering...' : `🎰 Enter ${currentMonth} Draw`}
                        </motion.button>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-sm">
                  <span className="text-dark-500">{draw.participant_count || 0} participants</span>
                  {draw.jackpot_amount > 0 && (
                    <span className="text-amber-400">🔄 Jackpot rollover: ₹{draw.jackpot_amount.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎰</div>
                <p className="text-dark-400">No draw scheduled yet for {currentMonth} {currentYear}</p>
                <p className="text-dark-600 text-sm mt-1">Check back later or contact support</p>
              </div>
            )}
          </div>
        </div>

        {/* Draw history */}
        {historyData && historyData.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-5">Draw History</h3>
            <div className="space-y-4">
              {historyData.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div>
                    <div className="text-white text-sm font-medium">
                      {MONTH_NAMES[(entry.monthly_draws?.draw_month || 1) - 1]} {entry.monthly_draws?.draw_year}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {entry.numbers_entered.map((n, j) => {
                        const isWin = entry.monthly_draws?.winning_numbers?.includes(n);
                        return (
                          <span key={j} className={`text-xs font-mono font-bold ${isWin ? 'text-brand-400' : 'text-dark-500'}`}>
                            {n}{j < entry.numbers_entered.length - 1 && ' ·'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    {entry.is_winner ? (
                      <div>
                        <span className="badge-success">{entry.prize_category}</span>
                        <div className="text-brand-400 font-bold text-sm mt-1">₹{entry.prize_amount?.toLocaleString('en-IN')}</div>
                      </div>
                    ) : entry.match_count > 0 ? (
                      <span className="text-dark-400 text-sm">{entry.match_count} match</span>
                    ) : (
                      <span className="text-dark-600 text-sm">No match</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
