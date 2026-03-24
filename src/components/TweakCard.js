import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, AlertTriangle, Ban, Settings, Zap, Monitor, Cpu, Server, Shield, Crown, Lock } from 'lucide-react';
import './TweakCard.css';

const CAT_ICON_MAP = {
  Main: Settings,
  Latency: Zap,
  Nvidia: Monitor,
  GPU: Cpu,
  Services: Server,
};

export default function TweakCard({ id, title, description, badge, warning, enabled, loading, onToggle, iconColor, incompatible, category, isPremium, userHasPremium, onUpgrade }) {
  const isLocked = isPremium && !userHasPremium;
  const isOn = enabled ?? false;
  const color = incompatible ? '#444' : isLocked ? '#a78bfa' : (iconColor || 'var(--red-primary)');
  const Icon = CAT_ICON_MAP[category] || Wrench;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isLocked) { onUpgrade?.(); return; }
    if (!loading && !incompatible) onToggle(id, !isOn);
  };

  return (
    <motion.div
      className={`tweak-card ${isOn ? 'enabled' : ''} ${incompatible ? 'incompatible' : ''} ${isLocked ? 'premium-locked' : ''}`}
      style={{ '--tweak-accent': color }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
      onClick={isLocked ? onUpgrade : undefined}
    >
      <div className="tweak-card-body">
        {/* Top: icon + title + badges */}
        <div className="tweak-card-top">
          <div className="tweak-card-icon">
            <Icon size={14} style={{ color }} />
          </div>
          <span className="tweak-title">{title}</span>
          {isLocked && (
            <span className="premium-badge"><Crown size={8} /> Pro</span>
          )}
          {incompatible && (
            <span className="incompatible-badge"><Ban size={9} /> N/A</span>
          )}
        </div>

        {/* Description */}
        <p className="tweak-desc">{description}</p>

        {/* Warning block */}
        {warning && !isLocked && (
          <div className="tweak-warning">
            <AlertTriangle size={10} />
            <span>{warning}</span>
          </div>
        )}

        {isLocked && (
          <div className="tweak-premium-hint">
            <Lock size={9} />
            <span>Premium feature — click to upgrade</span>
          </div>
        )}
      </div>

      {/* Bottom footer: status label + toggle */}
      <div className="tweak-card-bottom">
        <span style={{ fontSize: 10, fontWeight: 600, color: isLocked ? '#a78bfa' : isOn ? color : '#444', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {isLocked ? 'Pro Only' : isOn ? 'Active' : 'Inactive'}
        </span>
        <button
          className={`toggle-switch ${isLocked ? 'locked' : isOn ? 'on' : 'off'} ${loading ? 'loading' : ''}`}
          onClick={handleToggle}
          disabled={loading || incompatible}
          title={isLocked ? 'Upgrade to Premium to use this tweak' : incompatible ? 'Not applicable to your system' : undefined}
        >
          {isLocked ? (
            <Lock size={11} style={{ color: '#a78bfa' }} />
          ) : (
            <>
              <motion.div
                className="toggle-thumb"
                animate={{ x: isOn ? 21 : 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 30 }}
              />
              {loading && <div className="toggle-spinner" />}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
