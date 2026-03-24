import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Wrench, Sparkles, Shield, ArrowUpCircle } from 'lucide-react';
import './ChangelogModal.css';

export const CHANGELOG = [
  {
    version: '1.6.8',
    date: 'Mar 19, 2026',
    entries: [
      { type: 'fix',  text: 'Fixed "Restart & Install" — installer now runs correctly as per-machine (consistent with admin requirements)' },
      { type: 'fix',  text: 'Update handler simplified to use electron-updater built-in quitAndInstall reliably' },
    ],
  },
  {
    version: '1.6.7',
    date: 'Mar 19, 2026',
    entries: [
      { type: 'new',  text: 'Changelog now appears automatically after each update' },
      { type: 'fix',  text: 'System info (CPU, RAM, Disk, GPU) now loads correctly using native APIs' },
      { type: 'new',  text: '5 new CSS animated wallpapers: Aurora, Nebula, Ember, Cyber, Ocean' },
      { type: 'fix',  text: 'Sidebar no longer invisible against bright wallpapers' },
      { type: 'fix',  text: 'Version badge now shows the real installed version' },
      { type: 'new',  text: 'Launch at Windows Startup toggle in Settings' },
      { type: 'new',  text: 'Custom wallpaper support (your own image or GIF)' },
    ],
  },
];

const TYPE_META = {
  new:      { icon: Sparkles,      label: 'New',      color: '#a78bfa', glow: '#7c3aed' },
  fix:      { icon: Wrench,        label: 'Fixed',    color: '#34d399', glow: '#059669' },
  improve:  { icon: Zap,           label: 'Improved', color: '#60a5fa', glow: '#2563eb' },
  security: { icon: Shield,        label: 'Security', color: '#fbbf24', glow: '#d97706' },
};

export default function ChangelogModal({ version, onClose }) {
  const entry = CHANGELOG.find(c => c.version === version) || CHANGELOG[0];
  const newCount = entry.entries.filter(e => e.type === 'new').length;
  const fixCount = entry.entries.filter(e => e.type === 'fix').length;

  return (
    <AnimatePresence>
      <motion.div
        className="cl-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="cl-modal"
          initial={{ opacity: 0, y: 40, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="cl-header">
            <div className="cl-header-glow" />
            <div className="cl-header-top">
              <div className="cl-header-icon"><ArrowUpCircle size={20} /></div>
              <button className="cl-close" onClick={onClose}><X size={14} /></button>
            </div>
            <div className="cl-version-row">
              <span className="cl-version-label">What's New in</span>
              <span className="cl-version-number">v{entry.version}</span>
            </div>
            <div className="cl-date">{entry.date}</div>
            <div className="cl-stats">
              {newCount > 0 && (
                <span className="cl-stat cl-stat-new">
                  <Sparkles size={10} /> {newCount} new {newCount === 1 ? 'feature' : 'features'}
                </span>
              )}
              {fixCount > 0 && (
                <span className="cl-stat cl-stat-fix">
                  <Wrench size={10} /> {fixCount} {fixCount === 1 ? 'fix' : 'fixes'}
                </span>
              )}
            </div>
          </div>

          {/* Entries */}
          <div className="cl-body">
            {entry.entries.map((e, i) => {
              const meta = TYPE_META[e.type] || TYPE_META.new;
              const Icon = meta.icon;
              return (
                <motion.div
                  key={i}
                  className="cl-entry"
                  style={{ '--entry-color': meta.color, '--entry-glow': meta.glow }}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.045, type: 'spring', stiffness: 300, damping: 24 }}
                >
                  <div className="cl-entry-accent" />
                  <div className="cl-entry-icon-wrap">
                    <Icon size={13} />
                  </div>
                  <div className="cl-entry-body">
                    <span className="cl-entry-type">{meta.label}</span>
                    <span className="cl-entry-text">{e.text}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="cl-footer">
            <span className="cl-footer-hint">This won't show again for v{entry.version}</span>
            <motion.button
              className="cl-btn"
              onClick={onClose}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Zap size={13} />
              Let's go
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
