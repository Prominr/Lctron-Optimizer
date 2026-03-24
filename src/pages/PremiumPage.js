import React from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, Zap, Gamepad2, MemoryStick, Wifi, Palette, Shield, ExternalLink, X, BarChart2, Lock, Headphones, Star } from 'lucide-react';
import { usePremium } from '../context/PremiumContext';
import './PremiumPage.css';

const FREE_FEATURES = [
  'Basic tweaks & optimizations',
  'App Booster (standard)',
  'System Cleaner',
  'Network Scripts',
  'Power Plans',
  'Process Manager',
  'Debloat tools',
  'Restore points (limited)',
];

const PRO_FEATURES = [
  { label: 'Everything in Free',          icon: CheckCircle, color: '#a78bfa', highlight: true },
  { label: 'Gaming Mode',                  icon: Gamepad2,   color: '#f97316' },
  { label: 'RAM Flush',                    icon: MemoryStick, color: '#22c55e' },
  { label: 'Network Optimizer',            icon: Wifi,        color: '#3b82f6' },
  { label: 'Unlimited restore points',     icon: Shield,      color: '#06b6d4' },
  { label: 'All themes & wallpapers',      icon: Palette,     color: '#f59e0b' },
  { label: 'Pro Dashboard',                icon: BarChart2,   color: '#e03030' },
  { label: 'Ultimate Boost mode',          icon: Zap,         color: '#a78bfa' },
  { label: '24 Pro-only tweaks unlocked',  icon: Lock,        color: '#a78bfa' },
  { label: 'Priority support',             icon: Headphones,  color: '#22c55e' },
];

const WEBSITE = 'https://lctronoptimizer.netlify.app/';

export default function PremiumPage() {
  const { isPremium } = usePremium();

  const openSite = () => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(WEBSITE);
    } else {
      window.open(WEBSITE, '_blank');
    }
  };

  if (isPremium) {
    return (
      <div className="premium-page">
        <div className="premium-hero">
          <div className="premium-hero-glow" />
          <div className="premium-hero-glow2" />
          <div className="premium-crown"><Crown size={26} /></div>
          <div className="premium-hero-title">Lctron Premium</div>
          <div className="premium-hero-sub">You have Premium — all features are unlocked.</div>
          <div className="premium-active-badge"><Crown size={13} /> Premium Active</div>
        </div>
        <div className="pp-section-label">Your plan includes</div>
        <div className="pp-checklist">
          {PRO_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.label} className="pp-check-row" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                <div className="pp-check-icon" style={{ color: f.color, background: `${f.color}15` }}><Icon size={13} /></div>
                <span className="pp-check-label" style={f.highlight ? { color: '#a78bfa', fontWeight: 700 } : {}}>{f.label}</span>
                <CheckCircle size={12} style={{ color: '#22c55e', marginLeft: 'auto', flexShrink: 0 }} />
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="premium-page">
      {/* Hero */}
      <div className="premium-hero">
        <div className="premium-hero-glow" />
        <div className="premium-hero-glow2" />
        <div className="premium-crown"><Crown size={26} /></div>
        <div className="premium-hero-title">Lctron Premium</div>
        <div className="premium-hero-sub">Unlock the full Lctron experience with a one-time payment.</div>
      </div>

      {/* Tier cards */}
      <div className="pp-tiers">

        {/* Free */}
        <motion.div className="pp-tier pp-tier-free" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="pp-tier-header">
            <div className="pp-tier-name">Free</div>
            <div className="pp-tier-price">$0<span className="pp-tier-period"> / forever</span></div>
          </div>
          <div className="pp-tier-divider" />
          <div className="pp-tier-list">
            {FREE_FEATURES.map(f => (
              <div key={f} className="pp-tier-row">
                <CheckCircle size={11} style={{ color: '#444', flexShrink: 0 }} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <div className="pp-tier-current">Current plan</div>
        </motion.div>

        {/* Pro */}
        <motion.div className="pp-tier pp-tier-pro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="pp-tier-popular"><Crown size={9} /> Most Popular</div>
          <div className="pp-tier-header">
            <div className="pp-tier-name" style={{ color: '#c4b5fd' }}>Pro</div>
            <div className="pp-tier-price" style={{ color: '#fff' }}>$12.99<span className="pp-tier-period"> one-time</span></div>
          </div>
          <div className="pp-tier-divider" style={{ borderColor: 'rgba(167,139,250,0.2)' }} />
          <div className="pp-tier-list">
            {PRO_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="pp-tier-row">
                  <Icon size={11} style={{ color: f.color, flexShrink: 0 }} />
                  <span style={f.highlight ? { color: '#c4b5fd', fontWeight: 700 } : {}}>{f.label}</span>
                </div>
              );
            })}
          </div>
          <motion.button
            className="pp-buy-btn"
            onClick={openSite}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Crown size={14} /> Get Premium <ExternalLink size={12} style={{ opacity: 0.6 }} />
          </motion.button>
          <p className="pp-buy-hint">Sign in on our website to purchase</p>
        </motion.div>

      </div>
    </div>
  );
}
