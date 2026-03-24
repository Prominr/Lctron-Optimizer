import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Play, CheckCircle, AlertTriangle, Info, RotateCcw, Crown, Lock } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { usePremium } from '../context/PremiumContext';
import './NetworkScriptsPage.css';

const PREMIUM_SCRIPT_IDS = new Set(['optimize-nic', 'optimize-gaming-network', 'optimize-bufferbloat', 'optimize-wifi-adapter']);

const scripts = [
  {
    id: 'optimize-nic',
    title: 'Optimize NIC Settings',
    description: 'This optimizes all of the Windows NIC Settings to the most optimal values. This is designed to run alongside all of the settings inside of the Network Configurator.',
    warnings: [],
    color: '#e03030',
  },
  {
    id: 'optimize-bufferbloat',
    title: 'Optimize Network Bufferbloat Settings',
    description: 'This optimizes your network settings for the lowest possible bufferbloat. However, this drastically lowers network speeds in optimal conditions.',
    warnings: [
      'This tweak drastically lowers network speeds in optimal conditions',
      'Applying this tweak will revert the following tweaks: Enable RSS, Optimize Congestion Window, TCP Timestamps, Enable Network Throttling Index',
    ],
    color: '#e05030',
  },
  {
    id: 'optimize-gaming-network',
    title: 'Gaming Network Profile',
    description: 'Applies a curated set of TCP/IP, DNS and NIC tweaks specifically tuned for low-latency gaming. Reduces ping spikes and jitter in online games.',
    warnings: [],
    color: '#e03030',
  },
  {
    id: 'reset-network-stack',
    title: 'Reset Network Stack',
    description: 'Fully resets the Windows network stack including TCP/IP, Winsock, DNS cache and firewall rules back to defaults. Use this to undo all network tweaks.',
    warnings: ['This will undo all network optimizations and restore Windows defaults'],
    color: '#888',
  },
  {
    id: 'flush-dns',
    title: 'Flush & Optimize DNS',
    description: "Flushes the DNS resolver cache and sets Google's 8.8.8.8 and Cloudflare's 1.1.1.1 as primary DNS servers for faster DNS resolution.",
    warnings: [],
    color: '#e03030',
  },
  {
    id: 'optimize-wifi-adapter',
    title: 'Optimize Wi-Fi Adapter',
    description: 'Disables power saving on the wireless adapter, enables transmit power at maximum, and disables background scanning to reduce wireless latency.',
    warnings: [],
    color: '#e03030',
  },
];

export default function NetworkScriptsPage({ addToast, setActivePage }) {
  const [running, setRunning] = useState(null);
  const [done, setDone] = useState({});
  const { isPremium } = usePremium();

  const runScript = async (script) => {
    if (PREMIUM_SCRIPT_IDS.has(script.id) && !isPremium) {
      setActivePage && setActivePage('premium');
      return;
    }
    setRunning(script.id);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.applyTweak(script.id, true);
        if (result.success) {
          setDone(prev => ({ ...prev, [script.id]: true }));
          addToast(`${script.title} applied successfully!`, 'success');
        } else {
          addToast(`Failed: ${result.error}`, 'error');
        }
      } else {
        await new Promise(r => setTimeout(r, 1200));
        setDone(prev => ({ ...prev, [script.id]: true }));
        addToast(`${script.title} applied (dev mode)`, 'success');
      }
    } catch (e) {
      addToast(`Error: ${e.message}`, 'error');
    }
    setRunning(null);
  };

  const resetScript = (id) => {
    setDone(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  return (
    <div className="netscripts-page">
      <PageHeader icon={Wifi} title="Network Scripts" subtitle="One-click network optimization scripts for gaming and performance" iconColor="#e03030" />

      <div className="netscripts-scroll">
        <div className="netscripts-info-bar">
          <Info size={13} style={{ color: '#888', flexShrink: 0 }} />
          <span>Scripts apply multiple network tweaks at once. Run them in order from top to bottom for best results.</span>
        </div>

        <div className="netscripts-grid">
          {scripts.map((script, i) => {
            const isRunning = running === script.id;
            const isDone = done[script.id];
            return (
              <motion.div
                key={script.id}
                className={`netscript-card ${isDone ? 'done' : ''} ${PREMIUM_SCRIPT_IDS.has(script.id) && !isPremium ? 'premium-locked' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={PREMIUM_SCRIPT_IDS.has(script.id) && !isPremium ? () => setActivePage && setActivePage('premium') : undefined}
                style={PREMIUM_SCRIPT_IDS.has(script.id) && !isPremium ? { cursor: 'pointer', opacity: 0.75 } : {}}
                title={PREMIUM_SCRIPT_IDS.has(script.id) && !isPremium ? 'Premium feature — click to upgrade' : undefined}
              >
                <div className="netscript-card-top">
                  <div className="netscript-icon" style={{ background: PREMIUM_SCRIPT_IDS.has(script.id) && !isPremium ? 'rgba(167,139,250,0.1)' : `${script.color}18`, border: `1px solid ${PREMIUM_SCRIPT_IDS.has(script.id) && !isPremium ? 'rgba(167,139,250,0.25)' : script.color + '30'}` }}>
                    {PREMIUM_SCRIPT_IDS.has(script.id) && !isPremium
                      ? <Lock size={16} style={{ color: '#a78bfa' }} />
                      : <Wifi size={16} style={{ color: script.color }} />}
                  </div>
                  <div className="netscript-title-block">
                    <span className="netscript-title">{script.title}</span>
                    {PREMIUM_SCRIPT_IDS.has(script.id) && !isPremium ? (
                      <span className="netscript-done-badge" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.25)' }}>
                        <Crown size={10} /> PRO
                      </span>
                    ) : isDone ? (
                      <span className="netscript-done-badge">
                        <CheckCircle size={11} /> Applied
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="netscript-desc">{script.description}</p>

                {script.warnings.length > 0 && (
                  <div className="netscript-warnings">
                    {script.warnings.map((w, wi) => (
                      <div key={wi} className="netscript-warning-row">
                        <AlertTriangle size={11} style={{ color: '#e03030', flexShrink: 0 }} />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="netscript-actions">
                  <motion.button
                    className={`netscript-run-btn ${isRunning ? 'loading' : ''} ${isDone ? 'done' : ''}`}
                    style={PREMIUM_SCRIPT_IDS.has(script.id) && !isPremium
                      ? { borderColor: 'rgba(167,139,250,0.3)', color: '#a78bfa', background: 'rgba(167,139,250,0.08)' }
                      : !isDone && !isRunning ? { borderColor: `${script.color}55`, color: script.color, background: `${script.color}12` } : {}}
                    onClick={(e) => { e.stopPropagation(); if (!isRunning && !isDone) runScript(script); }}
                    disabled={isRunning || isDone}
                    whileHover={!isDone && !isRunning ? { scale: 1.02 } : {}}
                    whileTap={!isDone && !isRunning ? { scale: 0.97 } : {}}
                  >
                    {isRunning ? (
                      <><div className="ns-spinner" /> Running...</>
                    ) : isDone ? (
                      <><CheckCircle size={13} /> Applied</>
                    ) : (
                      <><Play size={13} /> Run Script</>
                    )}
                  </motion.button>
                  {isDone && (
                    <button className="netscript-reset-btn" onClick={() => resetScript(script.id)} title="Mark as not applied">
                      <RotateCcw size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
