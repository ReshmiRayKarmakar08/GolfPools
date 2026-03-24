import { useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { scoresAPI, drawsAPI, winnersAPI, subscriptionsAPI } from '../../utils/api';
import useAuthStore from '../../context/authStore';

function CountUpStat({ value, prefix = '', suffix = '', label, icon, link, delay = 0 }) {
  const numRef = useRef(null);

  useEffect(() => {
    if (!numRef.current || typeof value !== 'number') return;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: value,
      duration: 1.5,
      ease: 'power2.out',
      delay: delay + 0.3,
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.textContent = Number.isInteger(value)
            ? Math.round(obj.v).toLocaleString('en-IN')
            : obj.v.toFixed(1);
        }
      },
    });
  }, [value, delay]);

  const content = (
    <motion.div
      className="glass-card-hover p-6 floating-card"
      initial={{ opacity: 0, y: 30, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay, duration: 0.6 }}
    >
      <div className="flex items-start justify-between mb-3">
        <motion.span
          className="text-3xl"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.5 + delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {icon}
        </motion.span>
        {link && <span className="text-brand-400 text-xs">View →</span>}
      </div>
      <div className="text-3xl font-bold font-mono text-white mb-1">
        {prefix}<span ref={numRef}>0</span>{suffix}
      </div>
      <div className="text-dark-400 text-sm">{label}</div>
    </motion.div>
  );

  return link ? <Link href={link}>{content}</Link> : content;
}

export default function DashboardHome() {
  const { user } = useAuthStore();

  const { data: scoresData } = useQuery('scores', scoresAPI.getScores, {
    select: (r) => r.data.scores,
  });

  const { data: scoreStats } = useQuery('scoreStats', scoresAPI.getStats, {
    select: (r) => r.data.stats,
  });

  const { data: currentDraw } = useQuery('currentDraw', drawsAPI.getCurrent, {
    select: (r) => r.data.draw,
    retry: false,
  });

  const { data: recentWins } = useQuery('myWinnings', winnersAPI.getMy, {
    select: (r) => r.data.winnings || [],
    retry: false,
  });

  const { data: sub } = useQuery('subscription', subscriptionsAPI.getCurrent, {
    select: (r) => r.data.subscription,
    retry: false,
  });

  const stats = {
    scoreCount: scoresData?.length || 0,
    drawsEntered: 0,
    totalWinnings: (recentWins || []).reduce((s, w) => s + (w.prize_amount || 0), 0),
    charityContributed: 0,
  };
  const draw = currentDraw;

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <motion.div
          className="glass-card p-6 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute inset-0 opacity-5"
            style={{ background: 'radial-gradient(circle at top right, #00c6ff, transparent)' }} />
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome back, {user?.first_name} 👋
            </h1>
            <p className="text-dark-400 text-sm">Here's your dashboard overview</p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CountUpStat icon="🎯" label="Active Scores" value={stats.scoreCount || 0} suffix="/5" link="/dashboard/scores" delay={0} />
          <CountUpStat icon="🎰" label="Draws Entered" value={stats.drawsEntered || 0} link="/dashboard/draws" delay={0.1} />
          <CountUpStat icon="🏆" label="Total Won" prefix="₹" value={stats.totalWinnings || 0} link="/dashboard/winnings" delay={0.2} />
          <CountUpStat icon="💚" label="Charity Given" prefix="₹" value={stats.charityContributed || 0} link="/dashboard/charity" delay={0.3} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Score summary */}
          <motion.div
            className="glass-card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Your Scores</h3>
              <Link href="/dashboard/scores" className="text-brand-400 text-xs hover:text-brand-300">Manage →</Link>
            </div>
            {scoresData && scoresData.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {scoresData.map((s, i) => (
                  <motion.div
                    key={s.id}
                    className="score-badge text-brand-300"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1, type: 'spring', stiffness: 200 }}
                    whileHover={{ scale: 1.15, rotate: 5 }}
                  >
                    {s.score}
                  </motion.div>
                ))}
                {Array.from({ length: Math.max(0, 5 - (scoresData?.length || 0)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-12 h-12 rounded-xl border border-dashed border-dark-600 flex items-center justify-center text-dark-600 text-xs">
                    —
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-dark-500 text-sm mb-3">No scores yet</p>
                <Link href="/dashboard/scores" className="btn-primary text-sm px-4 py-2">Add Score</Link>
              </div>
            )}
          </motion.div>

          {/* Current draw */}
          <motion.div
            className="glass-card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Current Draw</h3>
              <Link href="/dashboard/draws" className="text-brand-400 text-xs hover:text-brand-300">View →</Link>
            </div>
            {draw ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold text-lg">
                    {new Date(0, draw.draw_month - 1).toLocaleString('default', { month: 'long' })} {draw.draw_year}
                  </span>
                  <span className={draw.status === 'completed' ? 'badge-success' : 'badge-info'}>{draw.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="glass-card p-3 text-center">
                    <div className="text-brand-400 font-bold font-mono">₹{(draw.total_pool || 0).toLocaleString('en-IN')}</div>
                    <div className="text-dark-500 text-xs">Prize Pool</div>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <div className="text-white font-bold font-mono">{draw.participant_count || 0}</div>
                    <div className="text-dark-500 text-xs">Participants</div>
                  </div>
                </div>
                {draw.winning_numbers && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-dark-500 text-xs mr-1">Winning:</span>
                    {draw.winning_numbers.map((n, i) => (
                      <motion.span
                        key={i}
                        className="number-ball number-ball-winning w-9 h-9 text-sm"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.15, type: 'spring' }}
                      >
                        {n}
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <motion.div
                  className="text-4xl mb-2"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                >🎰</motion.div>
                <p className="text-dark-500 text-sm">Next draw coming soon!</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Winnings */}
        {recentWins?.length > 0 && (
          <motion.div
            className="glass-card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Recent Winnings</h3>
              <Link href="/dashboard/winnings" className="text-brand-400 text-xs">View All →</Link>
            </div>
            <div className="space-y-3">
              {recentWins.slice(0, 3).map((w, i) => (
                <motion.div
                  key={w.id}
                  className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {w.prize_category === '5-match' ? '👑' : w.prize_category === '4-match' ? '🥈' : '🥉'}
                    </span>
                    <div>
                      <div className="text-white font-medium text-sm">{w.prize_category}</div>
                      <div className="text-dark-500 text-xs">{w.monthly_draws ? `${new Date(0, w.monthly_draws.draw_month - 1).toLocaleString('default', { month: 'short' })} ${w.monthly_draws.draw_year}` : '—'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="gradient-text-gold font-bold font-mono">₹{(w.prize_amount || 0).toLocaleString('en-IN')}</div>
                    <span className={w.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}>{w.payment_status}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
