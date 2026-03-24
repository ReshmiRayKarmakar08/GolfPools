import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { charitiesAPI, subscriptionsAPI } from '../../utils/api';

export default function CharityPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [pct, setPct] = useState(10);

  const { data: sub } = useQuery('subscription', subscriptionsAPI.getCurrent, {
    select: (r) => r.data.subscription,
    onSuccess: (s) => {
      if (s) { setSelected(s.charity_id); setPct(s.charity_percentage); }
    },
  });

  const { data: charities } = useQuery('charities', () => charitiesAPI.getAll(), {
    select: (r) => r.data.charities,
  });

  const updateMutation = useMutation(
    () => subscriptionsAPI.updateCharity({ charity_id: selected, charity_percentage: pct }),
    {
      onSuccess: () => {
        qc.invalidateQueries('subscription');
        toast.success('Charity preference updated!');
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
    }
  );

  const selected_charity = charities?.find((c) => c.id === selected);

  return (
    <DashboardLayout title="My Charity">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-white font-bold text-xl">Your Charity</h2>
          <p className="text-dark-400 mt-1 text-sm">
            Choose which charity receives a portion of your subscription each month.
          </p>
        </div>

        {/* Current impact */}
        {sub && selected_charity && (
          <motion.div
            className="glass-card p-6"
            style={{ border: '1px solid rgba(0,229,204,0.2)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center text-3xl">
                💚
              </div>
              <div>
                <div className="text-dark-400 text-xs uppercase tracking-widest mb-1">
                  Currently Supporting
                </div>
                <div className="text-white font-bold text-lg">{selected_charity.name}</div>
                <div className="text-green-400 font-mono text-sm">
                  ₹
                  {Math.round((sub.amount * sub.charity_percentage) / 100).toLocaleString('en-IN')}
                  /{sub.plan_type === 'monthly' ? 'mo' : 'yr'} · {sub.charity_percentage}%
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Charity picker */}
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4">Select Charity</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {charities?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
                  selected === c.id
                    ? 'border-brand-500/60 bg-brand-500/10'
                    : 'border-white/6 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      selected === c.id ? 'bg-brand-500 border-brand-500' : 'border-dark-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-white font-medium text-sm">{c.name}</div>
                      {c.is_featured && <span className="text-yellow-400 text-xs">⭐ Featured</span>}
                    </div>
                    <div className="text-dark-500 text-xs mt-0.5">{c.short_description}</div>
                    <div className="text-dark-600 text-xs mt-1">
                      {c.category} · ₹{(c.total_raised || 0).toLocaleString('en-IN')} raised
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Percentage slider */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Contribution Percentage</h3>
            <span className="text-brand-400 font-bold font-mono text-lg">{pct}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-full accent-brand-500 cursor-pointer mb-3"
          />
          <div className="flex justify-between text-xs text-dark-600">
            {[10, 15, 20, 25, 30, 35, 40, 45, 50].map((v) => (
              <span key={v} className={pct === v ? 'text-brand-400 font-bold' : ''}>
                {v}%
              </span>
            ))}
          </div>
          {sub && (
            <div className="mt-4 p-3 rounded-xl bg-white/3 text-sm text-dark-300">
              That's{' '}
              <span className="text-brand-400 font-bold">
                ₹{Math.round((sub.amount * pct) / 100).toLocaleString('en-IN')}
              </span>{' '}
              per {sub.plan_type === 'monthly' ? 'month' : 'year'} to{' '}
              {selected_charity?.name || 'your chosen charity'}.
            </div>
          )}
        </div>

        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isLoading || !sub}
          className="btn-primary w-full py-3.5 text-base disabled:opacity-50"
        >
          {updateMutation.isLoading ? 'Saving…' : 'Save Charity Preference'}
        </button>

        {!sub && (
          <p className="text-center text-dark-500 text-sm">
            Subscribe first to set your charity preference.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
