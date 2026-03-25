import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

const STATUS_CONFIG = {
  ok:       { color: '#00E5CC', label: 'System Online',       shadow: 'rgba(0,229,204,0.5)' },
  degraded: { color: '#FFD700', label: 'Connection Degraded', shadow: 'rgba(255,215,0,0.5)' },
  error:    { color: '#FF6B6B', label: 'Connection Lost',     shadow: 'rgba(255,107,107,0.5)' },
  loading:  { color: '#5a6190', label: 'Checking...',         shadow: 'rgba(90,97,144,0.3)' },
};

export default function SystemStatusOrb() {
  const [status, setStatus] = useState('loading');
  const [latency, setLatency] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const orbRef = useRef(null);

  useEffect(() => {
    const check = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        setStatus(data.status || 'error');
        setLatency(data.latency || null);
      } catch {
        setStatus('error');
        setLatency(null);
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // GSAP breathing animation
  useEffect(() => {
    if (!orbRef.current) return;
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.loading;
    gsap.to(orbRef.current, {
      boxShadow: `0 0 20px ${cfg.shadow}, 0 0 40px ${cfg.shadow}`,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, [status]);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.loading;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full right-0 mb-3 whitespace-nowrap"
              style={{
                background: 'rgba(13,18,36,0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '10px 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: cfg.color }}
                />
                <span className="text-white text-sm font-medium">{cfg.label}</span>
              </div>
              {latency != null && (
                <div className="text-dark-500 text-xs font-mono">
                  Latency: {latency}ms
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orb */}
        <motion.div
          ref={orbRef}
          className="w-10 h-10 rounded-full cursor-pointer flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${cfg.color}40, ${cfg.color}15)`,
            border: `1.5px solid ${cfg.color}50`,
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: cfg.color }}
          />
        </motion.div>
      </div>
    </div>
  );
}
