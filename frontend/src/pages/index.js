import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import gsap from 'gsap';
import { charitiesAPI } from '../utils/api';
import useAuthStore from '../context/authStore';
import MagneticButton from '../components/effects/MagneticButton';

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '₹999',
    period: '/month',
    features: ['5 score slots', 'Monthly draw entry', 'Charity contribution', 'Winner notifications', 'Mobile app access'],
    cta: 'Start Monthly',
    highlight: false,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '₹9,999',
    period: '/year',
    savings: 'Save ₹1,989',
    features: ['5 score slots', 'Every monthly draw', 'Priority charity match', 'Winner notifications', 'Mobile app access', 'Exclusive yearly badge'],
    cta: 'Go Yearly',
    highlight: true,
  },
];

const STATS = [
  { value: 12.4, suffix: 'L', prefix: '₹', label: 'Total Donated' },
  { value: 2847, suffix: '', prefix: '', label: 'Active Players' },
  { value: 3.2, suffix: 'L', prefix: '₹', label: 'Prize Pool This Month' },
  { value: 6, suffix: '', prefix: '', label: 'Charities Supported' },
];

const HOW_IT_WORKS = [
  { icon: '🚀', title: 'Subscribe', desc: 'Pick a monthly or yearly plan and choose your charity.' },
  { icon: '🎯', title: 'Enter Scores', desc: 'Log your last 5 Stableford scores (1–45).' },
  { icon: '✨', title: 'Monthly Draw', desc: 'Your scores enter the automated monthly draw automatically.' },
  { icon: '🏆', title: 'Win & Give', desc: 'Win prize money and watch your charity impact grow.' },
];

// GSAP count-up hook
function useCountUp(ref, target, duration = 2) {
  useEffect(() => {
    if (!ref.current) return;
    const obj = { val: 0 };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.to(obj, {
            val: target,
            duration,
            ease: 'power2.out',
            onUpdate: () => {
              if (ref.current) {
                ref.current.textContent = Number.isInteger(target)
                  ? Math.round(obj.val).toLocaleString('en-IN')
                  : obj.val.toFixed(1);
              }
            },
          });
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, target, duration]);
}

function StatCard({ stat, index }) {
  const numRef = useRef(null);
  useCountUp(numRef, stat.value);

  return (
    <motion.div
      className="glass-card p-6 text-center floating-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
    >
      <div className="text-3xl font-bold gradient-text mb-1">
        {stat.prefix}<span ref={numRef}>0</span>{stat.suffix}
      </div>
      <div className="text-sm text-dark-400">{stat.label}</div>
    </motion.div>
  );
}

function PrizeOrb({ tier, emoji, pct, desc, delay, glowColor }) {
  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.6 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        className="glassmorphic-orb w-40 h-40 md:w-48 md:h-48 mb-4 animate-levitate"
        style={{
          '--orb-glow': glowColor,
          animationDelay: `${delay * 2}s`,
        }}
      >
        <div className="text-4xl mb-1">{emoji}</div>
        <div className="text-3xl font-display gradient-text-gold">{pct}</div>
        <div className="text-xs text-dark-400 mt-1">{tier}</div>
      </div>
      <p className="text-dark-400 text-sm text-center max-w-[200px]">{desc}</p>
    </motion.div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const heroRef = useRef(null);
  const galleryRef = useRef(null);

  const { data } = useQuery('featuredCharities', () => charitiesAPI.getAll({ featured: true }), {
    select: (r) => r.data.charities?.slice(0, 6),
    retry: false,
  });

  // GSAP hero text stagger
  useEffect(() => {
    if (!heroRef.current) return;
    const words = heroRef.current.querySelectorAll('.hero-word');
    gsap.set(words, { opacity: 0, y: 40, rotateX: -20 });
    gsap.to(words, {
      opacity: 1,
      y: 0,
      rotateX: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: 'back.out(1.7)',
      delay: 0.3,
    });
  }, []);

  // Horizontal scroll with momentum (mouse wheel)
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    let velocity = 0;
    let isScrolling = false;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        velocity += e.deltaY * 0.5;
      }
    };

    const animate = () => {
      if (Math.abs(velocity) > 0.5) {
        gallery.scrollLeft += velocity;
        velocity *= 0.92; // friction
      }
      requestAnimationFrame(animate);
    };

    gallery.addEventListener('wheel', handleWheel, { passive: false });
    animate();

    return () => gallery.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <>
      <Head>
        <title>GolfPools — Play. Win. Give Back.</title>
        <meta name="description" content="Subscribe, enter your scores, win monthly prizes, and donate to charity. The most exciting golf subscription platform." />
      </Head>

      <div className="relative z-10">
        {/* ═══════════════════════════════════════════
            HERO SECTION
            ═══════════════════════════════════════════ */}
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Live badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium mb-10"
              style={{
                background: 'rgba(0,198,255,0.08)',
                border: '1px solid rgba(0,198,255,0.15)',
                color: '#00c6ff',
                backdropFilter: 'blur(8px)',
              }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              Monthly draw now open — ₹3.2 Lakh prize pool
            </motion.div>

            {/* Hero heading — GSAP stagger */}
            <h1
              ref={heroRef}
              className="font-display tracking-wider text-6xl md:text-8xl lg:text-9xl text-white leading-none mb-8"
              style={{ perspective: '800px' }}
            >
              <span className="hero-word inline-block">PLAY.</span>{' '}
              <span className="hero-word inline-block gradient-text">WIN.</span>{' '}
              <br className="hidden md:block" />
              <span className="hero-word inline-block">GIVE</span>{' '}
              <span className="hero-word inline-block">BACK.</span>
            </h1>

            <motion.p
              className="text-lg md:text-xl text-dark-300 max-w-2xl mx-auto mb-12 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.7 }}
            >
              Subscribe, enter your Stableford scores, and compete in monthly prize draws —
              while a portion of every subscription goes to the charity you choose.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.6 }}
            >
              <MagneticButton strength={0.3}>
                <Link href="/register" className="btn-primary text-base px-10 py-4 relative z-10">
                  Start Playing for ₹999/mo →
                </Link>
              </MagneticButton>
              <Link href="#how-it-works" className="btn-secondary text-base px-8 py-4">
                See How It Works
              </Link>
            </motion.div>
          </motion.div>

          {/* Floating score balls */}
          <motion.div
            className="mt-16 flex items-center gap-3 flex-wrap justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.8 }}
          >
            {[28, 33, 31, 29, 35].map((n, i) => (
              <motion.div
                key={i}
                className="number-ball w-14 h-14 text-xl text-brand-300"
                animate={{ y: [0, -12, 0], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
              >
                {n}
              </motion.div>
            ))}
            <span className="text-dark-400 text-sm ml-2">← Your 5 scores enter the draw</span>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════
            STATS — Count Up
            ═══════════════════════════════════════════ */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <StatCard key={i} stat={stat} index={i} />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            HOW IT WORKS
            ═══════════════════════════════════════════ */}
        <section id="how-it-works" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-brand-400 font-semibold uppercase tracking-widest text-sm mb-3">Simple Process</p>
              <h2 className="section-heading mb-4">How It Works</h2>
              <p className="text-dark-300 max-w-xl mx-auto">Four simple steps from subscription to making a difference</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((step, i) => (
                <motion.div
                  key={i}
                  className="glass-card-hover p-8 text-center relative floating-card"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                >
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden md:block absolute top-10 -right-3 text-dark-600 text-2xl z-10">→</div>
                  )}
                  <motion.div
                    className="text-5xl mb-4"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {step.icon}
                  </motion.div>
                  <div className="text-xs font-mono text-brand-500 mb-2">STEP 0{i + 1}</div>
                  <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-dark-400 text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            PRIZES — Glassmorphic Orbs
            ═══════════════════════════════════════════ */}
        <section id="prizes" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-brand-400 font-semibold uppercase tracking-widest text-sm mb-3">Monthly Draws</p>
              <h2 className="section-heading mb-4">Prize Structure</h2>
              <p className="text-dark-300 max-w-xl mx-auto">Match your golf scores to the winning numbers. Three ways to win every month.</p>
            </div>

            {/* Orbs */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-12">
              <PrizeOrb
                tier="5 Match" emoji="👑" pct="40%"
                desc="Match all 5 numbers. Jackpot rolls over if no winner!"
                delay={0} glowColor="rgba(255,215,0,0.25)"
              />
              <PrizeOrb
                tier="4 Match" emoji="🥈" pct="35%"
                desc="Match 4 of 5 numbers. Split equally among winners."
                delay={0.15} glowColor="rgba(192,192,192,0.25)"
              />
              <PrizeOrb
                tier="3 Match" emoji="🥉" pct="25%"
                desc="Match any 3 numbers. Most common winner tier."
                delay={0.3} glowColor="rgba(205,127,50,0.25)"
              />
            </div>

            <motion.div
              className="glass-card p-6 flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <motion.span
                className="text-3xl"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              >🔄</motion.span>
              <div>
                <div className="text-white font-bold">Jackpot Rollover</div>
                <div className="text-dark-400 text-sm">If nobody matches all 5 numbers, the 40% jackpot rolls over to the next month — growing the prize pool!</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            CHARITIES — Horizontal Scroll Gallery
            ═══════════════════════════════════════════ */}
        {data && data.length > 0 && (
          <section id="charities" className="py-24 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <p className="text-brand-400 font-semibold uppercase tracking-widest text-sm mb-3">Your Impact</p>
                <h2 className="section-heading mb-4">Choose Your Charity</h2>
                <p className="text-dark-300 max-w-xl mx-auto">At least 10% of your subscription goes to the charity you select. You choose where your money does good.</p>
              </div>

              {/* Horizontal scroll gallery */}
              <div ref={galleryRef} className="horizontal-scroll-gallery pb-4 mb-8">
                {data.map((charity, i) => (
                  <motion.div
                    key={charity.id}
                    className="glass-card-hover p-6 w-[300px] md:w-[340px] floating-card"
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <motion.div
                        className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-xl"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
                      >
                        💚
                      </motion.div>
                      <div>
                        <div className="text-white font-semibold text-sm">{charity.name}</div>
                        <div className="text-brand-500 text-xs">{charity.category}</div>
                      </div>
                    </div>
                    <p className="text-dark-400 text-sm leading-relaxed min-h-[40px]">{charity.short_description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-dark-500">Total raised</div>
                      <div className="text-brand-400 font-mono font-bold text-sm">₹{(charity.total_raised || 0).toLocaleString('en-IN')}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="text-center">
                <Link href="/charities" className="btn-secondary">View All Charities →</Link>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════
            PLANS
            ═══════════════════════════════════════════ */}
        <section id="plans" className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-brand-400 font-semibold uppercase tracking-widest text-sm mb-3">Pricing</p>
              <h2 className="section-heading mb-4">Simple Plans</h2>
              <p className="text-dark-300 max-w-xl mx-auto">No hidden fees. Cancel anytime. Every subscription includes full draw access.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {PLANS.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  className={`relative rounded-2xl p-8 floating-card ${plan.highlight
                    ? 'border-2 border-brand-500/50 bg-gradient-to-br from-brand-500/10 to-brand-900/20'
                    : 'glass-card'}`}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                >
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <motion.span
                        className="bg-gradient-to-r from-brand-500 to-brand-700 text-dark-950 text-xs font-bold px-4 py-1.5 rounded-full"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        MOST POPULAR
                      </motion.span>
                    </div>
                  )}
                  {plan.savings && (
                    <div className="absolute top-4 right-4">
                      <span className="badge-success">{plan.savings}</span>
                    </div>
                  )}
                  <h3 className="text-white font-bold text-xl mb-2">{plan.label}</h3>
                  <div className="flex items-end gap-1 mb-6">
                    <span className="text-5xl font-display text-white">{plan.price}</span>
                    <span className="text-dark-400 pb-1">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-dark-300">
                        <span className="text-brand-400 font-bold">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <MagneticButton strength={0.2} className="w-full">
                    <Link
                      href={`/register?plan=${plan.id}`}
                      className={`block text-center py-3 rounded-xl font-semibold transition-all duration-300 relative z-10 ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {plan.cta}
                    </Link>
                  </MagneticButton>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-dark-500 text-sm mt-8">
              💚 Minimum 10% of every subscription goes directly to your chosen charity
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            FINAL CTA
            ═══════════════════════════════════════════ */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              className="glass-card p-12 relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 opacity-10"
                style={{ background: 'radial-gradient(circle at center, #00c6ff 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <motion.div
                  className="text-5xl mb-6"
                  animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ⛳
                </motion.div>
                <h2 className="section-heading text-4xl md:text-5xl mb-4">Ready to play?</h2>
                <p className="text-dark-300 mb-8">Join thousands of golfers making a difference. Your subscription, your scores, your chance to win.</p>
                <MagneticButton strength={0.35}>
                  <Link href="/register" className="btn-gold text-base px-10 py-4 inline-block relative z-10">
                    Join Now — From ₹999/month
                  </Link>
                </MagneticButton>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            FOOTER
            ═══════════════════════════════════════════ */}
        <footer className="py-12 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl">⛳</span>
              <span className="font-display tracking-widest text-white">GOLFPOOLS</span>
            </div>
            <div className="flex items-center gap-6 text-dark-500 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
            <p className="text-dark-600 text-sm">© 2024 GolfPools Platform. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
