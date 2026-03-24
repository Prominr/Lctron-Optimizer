import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Crown, Cpu, MemoryStick, Thermometer, Zap, Trash2, Wifi, Monitor, Lock, RefreshCw, CheckCircle, Loader, FlameKindling, Shield, Timer, Gamepad2 } from 'lucide-react';
import { usePremium } from '../context/PremiumContext';
import './ProDashboard.css';

function Ring({ pct = 0, color = '#e03030', size = 88 }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(Math.max(pct, 0), 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 88 88">
      <circle cx={44} cy={44} r={r} fill="none" stroke="#1c1c1c" strokeWidth={7} />
      <circle cx={44} cy={44} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 0.7s ease' }}
      />
    </svg>
  );
}

function heatColor(pct) {
  if (pct >= 85) return '#ef4444';
  if (pct >= 60) return '#f97316';
  return '#22c55e';
}

function StatCard({ icon: Icon, label, value, unit, sub, accent }) {
  const numVal = typeof value === 'number' ? value : 0;
  const ringColor = unit === '%' ? heatColor(numVal) : accent;
  return (
    <motion.div className="pd-stat-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="pd-stat-top">
        <div className="pd-stat-icon" style={{ color: accent, background: `${accent}15` }}><Icon size={13} /></div>
        <span className="pd-stat-label">{label}</span>
      </div>
      <div className="pd-ring-wrap">
        <Ring pct={unit === '%' ? numVal : 0} color={ringColor} />
        <div className="pd-ring-center">
          <span className="pd-ring-val">{value ?? '—'}</span>
          <span className="pd-ring-unit">{unit}</span>
        </div>
      </div>
      {sub && <div className="pd-stat-sub">{sub}</div>}
    </motion.div>
  );
}

const QUICK_ACTIONS = [
  { id: 'flush-ram',   label: 'Flush RAM',    desc: 'Reclaim standby memory',        icon: MemoryStick, color: '#22c55e', fn: 'flushRam' },
  { id: 'gaming-mode', label: 'Gaming Mode',  desc: 'Kill bg apps, boost CPU',        icon: Gamepad2,   color: '#f97316', fn: 'gamingModeEnable' },
  { id: 'flush-dns',   label: 'Flush DNS',    desc: 'Clear DNS + fast resolvers',     icon: Wifi,       color: '#3b82f6', tweakId: 'flush-dns' },
  { id: 'bg-apps',     label: 'Kill BG Apps', desc: 'Stop background processes',      icon: Trash2,     color: '#e03030', tweakId: 'disable-background-apps' },
];

const PRO_TWEAKS = [
  { id: 'pro-gpu-hwsched',    icon: Monitor,      color: '#a78bfa', name: 'GPU Hardware Scheduling', desc: 'Enable HAGS for lower GPU latency and better frame pacing' },
  { id: 'pro-timer-res',      icon: Timer,        color: '#f97316', name: 'High-Resolution Timer',   desc: 'Force platform timer ticks, eliminating dynamic tick latency' },
  { id: 'pro-optimize-dx',    icon: Zap,          color: '#e03030', name: 'DirectX Optimizer',       desc: 'Optimize DirectX debug flags and IOMMU GPU memory mapping' },
  { id: 'pro-disable-uwp-bg', icon: Shield,       color: '#22c55e', name: 'Disable UWP Background',  desc: 'Stop all UWP apps from running in the background globally' },
  { id: 'pro-ultimate-clean', icon: FlameKindling,color: '#ef4444', name: 'Ultimate Clean',          desc: 'Deep clean temp, DNS, WU cache, and event logs in one shot' },
];

export default function ProDashboard({ addToast, setActivePage }) {
  const { isPremium } = usePremium();
  const [stats, setStats]               = useState(null);
  const [fetching, setFetching]         = useState(false);
  const [actionRunning, setActionRunning] = useState(null);
  const [tweakDone, setTweakDone]       = useState({});
  const [tweakLoading, setTweakLoading] = useState({});
  const intervalRef = useRef(null);

  const fetchStats = useCallback(async () => {
    if (!window.electronAPI?.getLiveStats) return;
    setFetching(true);
    try {
      const data = await window.electronAPI.getLiveStats();
      if (data && Object.keys(data).length) setStats(data);
    } catch {}
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!isPremium) return;
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 3000);
    return () => clearInterval(intervalRef.current);
  }, [isPremium, fetchStats]);

  const runAction = async (action) => {
    setActionRunning(action.id);
    try {
      let result;
      if (action.fn && window.electronAPI?.[action.fn]) {
        result = await window.electronAPI[action.fn]();
      } else if (action.tweakId && window.electronAPI?.applyTweak) {
        result = await window.electronAPI.applyTweak(action.tweakId, true);
      } else {
        await new Promise(r => setTimeout(r, 1000));
        result = { success: true };
      }
      if (result?.success !== false) addToast?.(`${action.label} applied!`, 'success');
      else addToast?.(`Failed: ${result.error}`, 'error');
    } catch (e) { addToast?.(`Error: ${e.message}`, 'error'); }
    setActionRunning(null);
  };

  const runProTweak = async (tweak) => {
    setTweakLoading(p => ({ ...p, [tweak.id]: true }));
    try {
      let result;
      if (window.electronAPI?.applyTweak) {
        result = await window.electronAPI.applyTweak(tweak.id, true);
      } else {
        await new Promise(r => setTimeout(r, 900));
        result = { success: true };
      }
      if (result?.success !== false) {
        setTweakDone(p => ({ ...p, [tweak.id]: true }));
        addToast?.(`${tweak.name} applied!`, 'success');
      } else {
        addToast?.(`Failed: ${result.error}`, 'error');
      }
    } catch (e) { addToast?.(`Error: ${e.message}`, 'error'); }
    setTweakLoading(p => ({ ...p, [tweak.id]: false }));
  };

  if (!isPremium) {
    return (
      <div className="pro-dashboard">
        <div className="pd-lock">
          <div className="pd-lock-icon"><Lock size={26} /></div>
          <div className="pd-lock-title">Pro Dashboard</div>
          <div className="pd-lock-sub">Upgrade to Premium to access live system monitoring and Pro-only tweaks</div>
          <button className="pd-lock-btn" onClick={() => setActivePage?.('premium')}>
            <Crown size={13} /> Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  const cpuPct   = stats?.CPU   ?? null;
  const ramUsed  = stats?.RAM_USED  ?? null;
  const ramTotal = stats?.RAM_TOTAL ?? null;
  const ramPct   = ramTotal ? Math.round((ramUsed / ramTotal) * 100) : null;
  const gpuPct   = (stats?.GPU != null && stats.GPU >= 0) ? stats.GPU : null;
  const tempC    = (stats?.TEMP != null && stats.TEMP > 0) ? Math.round(stats.TEMP) : null;
  const procs    = stats?.PROCS ?? null;

  return (
    <div className="pro-dashboard">
      {/* Header */}
      <div className="pd-header">
        <div className="pd-header-left">
          <div className="pd-header-icon"><Crown size={16} /></div>
          <div>
            <div className="pd-header-title">Pro Dashboard</div>
            <div className="pd-header-sub">Live system monitoring &amp; exclusive tools</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pd-badge"><Crown size={10} /> Premium</div>
          <button className={`pd-refresh-btn${fetching ? ' spinning' : ''}`} onClick={fetchStats} title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="pd-section-label">Live System Stats</div>
      <div className="pd-stats-grid">
        <StatCard icon={Cpu}         label="CPU Usage"  value={cpuPct ?? '—'}  unit="%"  accent="#e03030" sub={procs != null ? `${procs} processes` : 'Loading...'} />
        <StatCard icon={MemoryStick} label="RAM Usage"  value={ramPct ?? '—'}  unit="%"  accent="#3b82f6" sub={ramUsed != null ? `${(ramUsed/1024).toFixed(1)} / ${(ramTotal/1024).toFixed(1)} GB used` : 'Loading...'} />
        <StatCard icon={Monitor}     label="GPU Load"   value={gpuPct ?? '—'}  unit={gpuPct != null ? '%' : ''}  accent="#a78bfa" sub={gpuPct == null ? 'No GPU counter' : undefined} />
        <StatCard icon={Thermometer} label="CPU Temp"   value={tempC ?? '—'}   unit={tempC != null ? '°C' : ''}  accent="#f97316" sub={tempC == null ? 'Sensor unavailable' : tempC >= 85 ? '⚠ Running hot' : tempC >= 70 ? 'Warm' : 'Good'} />
      </div>

      {/* Quick Actions */}
      <div className="pd-section-label">Quick Actions</div>
      <div className="pd-actions-grid">
        {QUICK_ACTIONS.map(action => {
          const Icon = action.icon;
          const running = actionRunning === action.id;
          return (
            <motion.button
              key={action.id}
              className={`pd-action-card${running ? ' running' : ''}`}
              onClick={() => !running && runAction(action)}
              disabled={!!actionRunning}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="pd-action-icon" style={{ background: `${action.color}15`, color: action.color }}>
                {running ? <Loader size={16} className="pd-action-spin" /> : <Icon size={16} />}
              </div>
              <div className="pd-action-name">{action.label}</div>
              <div className="pd-action-desc">{action.desc}</div>
            </motion.button>
          );
        })}
      </div>

      {/* Pro-Exclusive Tweaks */}
      <div className="pd-section-label">Pro-Exclusive Tweaks</div>
      <div className="pd-tweaks-list">
        {PRO_TWEAKS.map(tweak => {
          const Icon = tweak.icon;
          const done = tweakDone[tweak.id];
          const loading = tweakLoading[tweak.id];
          return (
            <motion.div key={tweak.id} className="pd-tweak-row" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
              <div className="pd-tweak-icon" style={{ background: `${tweak.color}15`, color: tweak.color }}><Icon size={14} /></div>
              <div className="pd-tweak-body">
                <div className="pd-tweak-name">{tweak.name}</div>
                <div className="pd-tweak-desc">{tweak.desc}</div>
              </div>
              <button
                className={`pd-tweak-apply ${done ? 'done' : loading ? 'loading' : 'idle'}`}
                onClick={() => !loading && !done && runProTweak(tweak)}
                disabled={loading || done}
              >
                {loading ? <Loader size={11} className="pd-action-spin" /> : done ? <><CheckCircle size={11} /> Applied</> : 'Apply'}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
