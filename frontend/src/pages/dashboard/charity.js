import { useRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { charitiesAPI, subscriptionsAPI } from '../../utils/api';
import useAuthStore from '../../context/authStore';

function CharityRing({ percentage, size = 120, strokeWidth = 8 }) {
  const ringRef = useRef(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (!ringRef.current) return;
    const offset = circumference - (percentage / 100) * circumference;
    gsap.to(ringRef.current, {
      strokeDashoffset: offset,
      duration: 1.2,
      delay: 0.5,
      ease: 'power2.out',
    });
  }, [percentage, circumference]);

  return (
    <div className="charity-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className="charity-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          ref={ringRef}
          className="charity-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="url(#charityGradient)"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
        <defs>
          <linearGradient id="charityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00c6ff" />
            <stop offset="100%" stopColor="#00E5CC" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold gradient-text">{percentage}%</span>
        <span className="text-dark-500 text-xs">Contribution</span>
      </div>
    </div>
  );
}

export default function CharityPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: sub } = useQuery('subscription', subscriptionsAPI.getCurrent, {
    select: (r) => r.data.subscription,
  });

  const { data: charities } = useQuery('charities', () => charitiesAPI.getAll(), {
    select: (r) => r.data.charities,
  });

  const [selectedCharity, setSelectedCharity] = useState(null);
  const [charityPct, setCharityPct] = useState(sub?.charity_percentage || 10);

  useEffect(() => {
    if (sub) {
      setSelectedCharity(sub.charity_id);
      setCharityPct(sub.charity_percentage || 10);
    }
  }, [sub]);

  const updateMutation = useMutation(
    (data) => subscriptionsAPI.updateCharity(data),
    {
      onSuccess: () => {
        qc.invalidateQueries('subscription');
        toast.success('Charity updated!');
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
    }
  );

  const currentCharity = charities?.find((c) => c.id === selectedCharity);
  const totalRef = useRef(null);

  useEffect(() => {
    if (!totalRef.current || !sub?.total_charity_given) return;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: sub.total_charity_given,
      duration: 1.5,
      ease: 'power2.out',
      delay: 0.3,
      onUpdate: () => {
        if (totalRef.current) totalRef.current.textContent = Math.round(obj.v).toLocaleString('en-IN');
      },
    });
  }, [sub?.total_charity_given]);

  return (
    <DashboardLayout title="Charity">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Current charity + ring */}
        <motion.div
          className="glass-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <CharityRing percentage={charityPct} />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-white font-bold text-lg mb-1">
                {currentCharity?.name || 'No Charity Selected'}
              </h3>
              <p className="text-dark-400 text-sm mb-3">
                {currentCharity?.category || 'Choose a charity below'}
              </p>
              <div className="glass-card p-3 inline-flex items-center gap-2">
                <span className="text-dark-400 text-xs">Total donated</span>
                <span className="gradient-text font-bold font-mono" ref={totalRef}>0</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Percentage slider */}
        <motion.div
          className="glass-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-white font-semibold mb-4">Contribution Percentage</h3>
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-300 text-sm">
              Your contribution: <span className="text-brand-400 font-bold">{charityPct}%</span>
            </span>
            <span className="text-dark-500 text-xs">min 10%</span>
          </div>
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={charityPct}
            onChange={(e) => setCharityPct(Number(e.target.value))}
            className="w-full accent-brand-500 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-dark-600 mt-1">
            <span>10%</span>
            <span>30%</span>
            <span>50%</span>
          </div>
        </motion.div>

        {/* Charity directory */}
        <motion.div
          className="glass-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-white font-semibold mb-4">Choose a Charity</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {charities?.map((c, i) => (
              <motion.button
                key={c.id}
                onClick={() => setSelectedCharity(c.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  selectedCharity === c.id
                    ? 'border-brand-500/60 bg-brand-500/10'
                    : 'border-white/6 hover:border-white/20'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      selectedCharity === c.id ? 'bg-brand-500 border-brand-500' : 'border-dark-500'
                    }`} />
                    <div>
                      <div className="text-white text-sm font-medium">{c.name}</div>
                      <div className="text-dark-500 text-xs">{c.category}</div>
                    </div>
                  </div>
                  {c.is_featured && <span className="text-yellow-400 text-xs">⭐ Featured</span>}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Save button */}
        <motion.button
          onClick={() => updateMutation.mutate({ charity_id: selectedCharity, charity_percentage: charityPct })}
          disabled={updateMutation.isLoading || !selectedCharity}
          className="btn-primary w-full py-3 disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {updateMutation.isLoading ? 'Saving…' : 'Save Charity Preference'}
        </motion.button>
      </div>
    </DashboardLayout>
  );
}
