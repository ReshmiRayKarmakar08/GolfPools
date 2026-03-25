import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { IconGolf } from '../icons/Icons';

const PRODUCT_LINKS = [
  { href: '/#how-it-works', label: 'How it Works' },
  { href: '/#prizes', label: 'Prizes' },
  { href: '/charities', label: 'Charities' },
  { href: '/dashboard', label: 'Leaderboard' },
];

const COMPANY_LINKS = [
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
  { href: '/partnerships', label: 'Partnership Inquiries' },
];

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund-policy', label: 'Refund & Cancellation' },
  { href: '/grievance-redressal', label: 'Grievance Redressal' },
];

const SIMPLE_LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/contact', label: 'Contact Us' },
];

const SocialIcon = ({ d, viewBox = "0 0 24 24" }) => (
  <a href="#" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-dark-300 hover:text-brand-400 hover:bg-white/10 hover:border-brand-500/30 transition-all duration-300 hover:-translate-y-1">
    <svg width="14" height="14" viewBox={viewBox} fill="currentColor">
      <path d={d} />
    </svg>
  </a>
);

export default function LegalFooter({ compact = false, maxWidthClass = 'max-w-6xl', variant = 'corporate' }) {
  const footerRef = useRef(null);

  useEffect(() => {
    if (!footerRef.current) return;

    // Entrance animation
    gsap.fromTo(
      footerRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
    );
  }, []);

  if (variant === 'simple') {
    return (
      <footer className={compact ? 'px-6 py-6' : 'px-6 py-10'}>
        <div
          className={`${maxWidthClass} mx-auto rounded-2xl p-5 md:p-6`}
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-xs md:text-sm text-dark-400">
              Compliance links for subscriptions, payments, and customer support.
            </p>
            <div className="flex flex-wrap gap-2">
              {SIMPLE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm px-3 py-2 rounded-lg text-dark-200 transition-colors hover:text-white"
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(8,12,26,0.55)',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-dark-500 mt-4">
            Data handled in accordance with the Digital Personal Data Protection Act, 2023.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer 
      ref={footerRef}
      className={`relative overflow-hidden px-4 md:px-6 ${compact ? 'pt-6 pb-4 mt-4' : 'pt-10 pb-4 mt-10'}`}
    >
      {/* Background radial glow sitting flush with bottom */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none opacity-[0.12]"
        style={{ background: 'radial-gradient(circle at bottom, rgba(0,198,255,1) 0%, transparent 70%)' }}
      />
      
      <div
        className="w-full mx-auto rounded-2xl p-6 md:p-8 relative z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(16,20,38,0.72), rgba(8,12,24,0.92))',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 md:gap-6 lg:gap-8 mb-8">
          
          {/* Column 1: Brand Identity */}
          <div className="lg:col-span-4 flex flex-col items-start pr-0 lg:pr-6">
            <Link href="/" className="flex items-center gap-2 mb-3 group inline-flex">
              <span className="text-xl"><IconGolf className="text-brand-400" size={20} /></span>
              <span className="font-display tracking-widest text-lg text-white group-hover:text-brand-400 transition-colors">
                GOLFPOOLS
              </span>
            </Link>
            <p className="text-dark-400 text-xs leading-relaxed mb-5 max-w-sm">
              Bridging the gap between performance on the course and impact in the community. Play golf, fund change.
            </p>
            <div className="flex items-center gap-3">
              {/* X (Twitter) */}
              <SocialIcon d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              {/* LinkedIn */}
              <SocialIcon d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              {/* Instagram */}
              <SocialIcon d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </div>
          </div>

          {/* Column 2: Product Navigation */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">Product</h4>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-dark-400 hover:text-brand-400 hover:translate-x-1 inline-block transition-all duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company Navigation */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">Company</h4>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-dark-400 hover:text-brand-400 hover:translate-x-1 inline-block transition-all duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal & Compliance */}
          <div className="lg:col-span-4 lg:pl-4">
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">Legal & Compliance</h4>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
              <span className="text-white text-[13px] font-medium block mb-0.5">GolfPools Platform</span>
              <span className="text-[11px] text-dark-500 block leading-relaxed">
                Registered Merchant Entity<br/>
                Operating under GolfPools India Pvt. Ltd.
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-2 mb-3">
              {LEGAL_LINKS.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[11px] text-dark-300 hover:text-brand-400 hover:translate-x-1 inline-block transition-all duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] text-brand-500/80 leading-relaxed">
                Grievance Officer: Designated Nodal Officer | Response SLA: Within 5 days
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Trust & Contact */}
        <div className="pt-5 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 text-[11px] text-dark-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              support@golfpools.com
            </span>
            <span className="hidden md:inline text-dark-700">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              West Bengal, India
            </span>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1.5 text-center md:text-right">
            <div className="px-2.5 py-1 rounded bg-dark-900/50 border border-white/5 text-[9px] font-medium tracking-wide text-dark-300">
              SECURE <span className="text-white">RAZORPAY</span> CHECKOUT
            </div>
            <p className="text-[9px] text-dark-600">
              © 2026 GolfPools. All rights reserved. Data protection compliant with DPDP Act.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
