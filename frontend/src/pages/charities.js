import Head from 'next/head';
import Link from 'next/link';
import { useQuery } from 'react-query';
import { charitiesAPI } from '../utils/api';

export default function CharitiesPage() {
  const { data: charities, isLoading } = useQuery(
    'allCharitiesPage',
    () => charitiesAPI.getAll(),
    {
      select: (r) => r.data.charities || [],
      retry: false,
    }
  );

  return (
    <>
      <Head>
        <title>Charities | GolfPools</title>
        <meta
          name="description"
          content="Explore all charities supported by GolfPools and choose where your contribution creates impact."
        />
      </Head>

      <main className="relative z-10 px-6 pt-32 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 text-center">
            <p className="text-brand-400 text-xs uppercase tracking-[0.2em] mb-2">Impact Partners</p>
            <h1 className="section-heading mb-3">All Charities</h1>
            <p className="text-dark-300">
              Choose your preferred organization during subscription.
            </p>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card h-40 shimmer" />
              ))}
            </div>
          ) : charities?.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {charities.map((charity) => (
                <div key={charity.id} className="glass-card p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-white font-semibold leading-snug">{charity.name}</h3>
                    {charity.is_featured && <span className="badge-success">Featured</span>}
                  </div>
                  <p className="text-brand-400 text-xs mb-2">{charity.category}</p>
                  <p className="text-dark-300 text-sm leading-relaxed min-h-[56px]">
                    {charity.short_description || 'Working to create sustainable social impact.'}
                  </p>
                  <div className="mt-4 pt-3 border-t border-white/8 flex items-center justify-between">
                    <span className="text-dark-500 text-xs">Total raised</span>
                    <span className="text-white font-mono text-sm">
                      ₹{(charity.total_raised || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-10 text-center">
              <p className="text-dark-300">No charities available right now.</p>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link href="/#charities" className="btn-secondary px-6 py-3">
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
