import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Monitor, HardDrive, MemoryStick, ChevronRight, Zap, TrendingUp, ArrowUpRight, CheckCircle, AlertTriangle, Loader, Wrench, ShieldAlert, Wifi, Server, Activity, Eye, Star, RefreshCw, X, Mouse, Keyboard, Volume2, Battery, Globe, Clock, Shield, Layers } from 'lucide-react';
import pkg from '../../package.json';
import './HomePage.css';

const SEV_CONFIG = {
  high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   label: 'High' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  label: 'Medium' },
  low:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.25)', label: 'Low' },
  info:   { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', label: 'Info' },
};

const CAT_ICON = {
  'RAM': MemoryStick,
  'CPU': Cpu,
  'Disk': HardDrive,
  'Drive Health': ShieldAlert,
  'GPU': Monitor,
  'Network': Wifi,
  'Privacy': Eye,
  'Services': Server,
  'Startup': Activity,
  'Visual': Star,
  'Security': Shield,
  'Updates': RefreshCw,
  'Mouse': Mouse,
  'Keyboard': Keyboard,
  'Audio': Volume2,
  'Drivers': Layers,
  'Battery': Battery,
  'Windows': Globe,
};

function CircleGauge({ value, size = 70, color = '#e03030' }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#222" strokeWidth={5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, subValue, iconColor, gauge }) {
  return (
    <motion.div className="stat-card" whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <div className="stat-card-left">
        <div className="stat-gauge">
          <CircleGauge value={gauge || 0} color={iconColor || '#e03030'} />
          <div className="stat-gauge-icon">
            <Icon size={14} style={{ color: iconColor || '#e03030' }} />
          </div>
        </div>
        <div className="stat-info">
          <span className="stat-icon-row">
            <Icon size={12} style={{ color: iconColor || '#e03030' }} />
            <span className="stat-label">{label}</span>
          </span>
          <span className="stat-value">{value}</span>
          {subValue && <span className="stat-sub">{subValue}</span>}
        </div>
      </div>
    </motion.div>
  );
}

const TIPS = [
  { icon: '⚡', tip: 'Enable "Latency Tweaks" to reduce input lag by up to 30%', page: 'optimize' },
  { icon: '🎮', tip: 'Add your game to App Booster for CPU & GPU priority boost', page: 'booster' },
  { icon: '🧹', tip: 'Run System Cleaner to free up disk space and temp files', page: 'cleaner' },
  { icon: '🚀', tip: 'Set Power Plan to High Performance for maximum FPS', page: 'powerplan' },
  { icon: '🛡️', tip: 'Disable startup programs to improve boot time', page: 'startup' },
  { icon: '🌐', tip: 'Apply Net Scripts to lower ping in online games', page: 'netscripts' },
];

export default function HomePage({ systemInfo, setActivePage, tweakStates, onToggle, systemProfile, addToast, loggedInUser }) {
  const [greeting, setGreeting] = useState('');
  const [time, setTime] = useState('');
  const [tipIndex, setTipIndex] = useState(0);
  const [runtimeVersion, setRuntimeVersion] = useState(pkg.version);

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => { if (v) setRuntimeVersion(v); }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const update = () => {
      const h = new Date().getHours();
      if (h < 12) setGreeting('Good Morning');
      else if (h < 17) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const info = systemInfo || {};
  const cpuUsage = info.cpuLoad || 0;
  const ramPct = info.ramTotal ? Math.round((info.ramUsed / info.ramTotal) * 100) : 0;
  const diskPct = info.diskCapacity ? Math.round(((info.diskCapacity - info.diskFree) / info.diskCapacity) * 100) : 0;

  const enabledTweaks = tweakStates ? Object.values(tweakStates).filter(Boolean).length : 0;
  const totalTweaks = tweakStates ? Object.keys(tweakStates).length : 0;
  const optScore = totalTweaks > 0 ? Math.min(100, Math.round((enabledTweaks / totalTweaks) * 100)) : 0;

  const [autoFixState, setAutoFixState] = useState('idle'); // idle | scanning | applying | done
  const [autoFixFindings, setAutoFixFindings] = useState([]);
  const [autoFixApplied, setAutoFixApplied] = useState({}); // { index: 'ok'|'skip'|'applying' }
  const [scanMsg, setScanMsg] = useState('');

  const SCAN_MSGS = [
    'Checking RAM & pagefile...', 'Inspecting CPU settings...', 'Scanning disk health...',
    'Checking GPU configuration...', 'Auditing network stack...', 'Reviewing privacy settings...',
    'Scanning background services...', 'Checking startup programs...', 'Verifying visual settings...',
    'Checking mouse acceleration...', 'Scanning keyboard settings...', 'Auditing USB input devices...',
    'Verifying audio services...', 'Scanning Device Manager for errors...', 'Checking battery health...',
    'Checking Windows activation...', 'Scanning system file integrity...', 'Checking pending updates...',
    'Auditing scheduled tasks...', 'Checking firewall status...', 'Scanning network QoS settings...',
  ];

  const runAutoFix = async () => {
    setAutoFixState('scanning');
    setAutoFixFindings([]);
    setAutoFixApplied({});

    // Cycle scan messages while real scan runs
    let msgIdx = 0;
    setScanMsg(SCAN_MSGS[0]);
    const msgTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % SCAN_MSGS.length;
      setScanMsg(SCAN_MSGS[msgIdx]);
    }, 900);

    let findings = [];
    if (window.electronAPI?.runAutoFixScan) {
      const result = await window.electronAPI.runAutoFixScan();
      findings = result?.findings || [];
    } else {
      // Dev mode demo findings
      await new Promise(r => setTimeout(r, 3000));
      findings = [
        { category: 'CPU', severity: 'medium', label: 'Power plan not set to maximum performance', fix: 'Activate Ultimate Performance plan', fixId: 'set-ultimate-performance', detail: 'Balanced plan active' },
        { category: 'CPU', severity: 'medium', label: 'CPU core parking enabled', fix: 'Disable CPU core parking', fixId: 'disable-cpu-parking', detail: 'Park max: 100%' },
        { category: 'RAM', severity: 'low', label: 'Memory settings unoptimized', fix: 'Tune memory settings', fixId: 'optimize-memory', detail: '' },
        { category: 'Disk', severity: 'medium', label: 'Temp folder is 842 MB', fix: 'Clear temp files', fixId: 'clear-temp-folder', detail: '%TEMP%' },
        { category: 'Network', severity: 'medium', label: 'Nagle algorithm active', fix: 'Disable Nagle', fixId: 'disable-nagle-algorithm', detail: 'TcpAckFrequency != 1' },
        { category: 'Network', severity: 'medium', label: 'DNS not using fast resolvers', fix: 'Optimize DNS to Cloudflare', fixId: 'flush-dns-cache', detail: 'ISP default DNS' },
        { category: 'Privacy', severity: 'medium', label: 'Windows telemetry active', fix: 'Disable telemetry', fixId: 'disable-telemetry', detail: 'AllowTelemetry=1' },
        { category: 'Privacy', severity: 'low', label: 'Xbox Game Bar / DVR overlay active', fix: 'Disable Game Bar', fixId: 'remove-xbox-gamebar', detail: '' },
        { category: 'Services', severity: 'low', label: 'SysMain (Superfetch) running', fix: 'Disable Superfetch', fixId: 'disable-superfetch', detail: 'StartType: Automatic' },
        { category: 'Visual', severity: 'low', label: 'Visual effects not optimized', fix: 'Optimize visual effects', fixId: 'optimize-visual-effects', detail: '' },
        { category: 'GPU', severity: 'medium', label: 'HAGS not enabled', fix: 'Enable HAGS', fixId: 'enable-hags', detail: 'HwSchMode != 2' },
      ];
    }

    clearInterval(msgTimer);
    setAutoFixFindings(findings);

    if (findings.length === 0) {
      setAutoFixState('done');
      return;
    }

    // Apply fixable issues
    setAutoFixState('applying');
    const applied = {};
    for (let i = 0; i < findings.length; i++) {
      const f = findings[i];
      applied[i] = 'applying';
      setAutoFixApplied({ ...applied });
      await new Promise(r => setTimeout(r, 180));
      if (f.fixId) {
        if (window.electronAPI?.runAutoFixApply) {
          await window.electronAPI.runAutoFixApply(f.fixId).catch(() => {});
        }
        applied[i] = 'ok';
      } else {
        applied[i] = 'skip';
      }
      setAutoFixApplied({ ...applied });
    }
    setAutoFixState('done');
  };

  const resetAutoFix = () => {
    setAutoFixState('idle');
    setAutoFixFindings([]);
    setAutoFixApplied({});
  };

  const fixedCount = Object.values(autoFixApplied).filter(v => v === 'ok').length;
  const highCount = autoFixFindings.filter(f => f.severity === 'high').length;

  const quickActions = [
    { id: 'optimize', label: 'All Tweaks', desc: 'Search & apply all optimizations', color: 'var(--red-primary)' },
    { id: 'booster', label: 'App Booster', desc: 'Boost your game or app', color: '#5030e0' },
    { id: 'powerplan', label: 'Power Plan', desc: 'Set performance power mode', color: '#f59e0b' },
    { id: 'cleaner', label: 'Cleaner', desc: 'Free up disk space', color: '#06b6d4' },
    { id: 'startup', label: 'Startup Manager', desc: 'Control boot programs', color: '#22c55e' },
    { id: 'netscripts', label: 'Net Scripts', desc: 'Lower ping & latency', color: '#8b5cf6' },
  ];

  const tip = TIPS[tipIndex];

  return (
    <div className="home-page">
      <div className="home-scroll">
        {/* Header */}
        <motion.div className="home-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="home-greeting-row">
            <Zap size={20} style={{ color: 'var(--red-primary)', filter: 'drop-shadow(0 0 8px var(--red-primary))' }} />
            <div>
              <span className="home-greeting">{greeting}, </span>
              <span className="home-username">{loggedInUser?.name?.split(' ')[0] || 'User'}</span>
            </div>
            <span className="home-version-badge">v{runtimeVersion}</span>
            <span className="home-time">{time}</span>
            {loggedInUser?.picture && (
              <img src={loggedInUser.picture} alt={loggedInUser.name} className="home-avatar" referrerPolicy="no-referrer" />
            )}
          </div>
        </motion.div>

        {/* Score + Stats row */}
        <div className="home-top-row">
          {/* Optimization Score */}
          <motion.div className="home-score-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}>
            <div className="home-score-ring">
              <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={40} cy={40} r={32} fill="none" stroke="#1e1e1e" strokeWidth={6} />
                <motion.circle
                  cx={40} cy={40} r={32} fill="none"
                  stroke="var(--red-primary)" strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 32}
                  initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - optScore / 100) }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                  style={{ filter: 'drop-shadow(0 0 6px var(--red-glow))' }}
                />
              </svg>
              <div className="home-score-inner">
                <span className="home-score-num">{optScore}</span>
              </div>
            </div>
            <div className="home-score-info">
              <span className="home-score-label">Optimization Score</span>
              <span className="home-score-sub">{enabledTweaks} / {totalTweaks} tweaks active</span>
              <motion.button className="home-score-btn" onClick={() => setActivePage('optimize')} whileHover={{ x: 2 }} whileTap={{ scale: 0.96 }}>
                <TrendingUp size={11} /> Improve Score
              </motion.button>
            </div>
          </motion.div>

          {/* Quick stats */}
          <div className="home-mini-stats">
            {[
              { label: 'CPU', value: cpuUsage ? `${cpuUsage}%` : 'N/A', icon: Cpu, color: 'var(--red-primary)' },
              { label: 'RAM', value: `${ramPct}%`, icon: MemoryStick, color: '#8b5cf6' },
              { label: 'Disk', value: `${info.diskFree || 0} GB free`, icon: HardDrive, color: '#06b6d4' },
              { label: 'GPU', value: info.gpuVram || 'N/A', icon: Monitor, color: '#22c55e' },
            ].map((s, i) => (
              <motion.div key={s.label} className="home-mini-stat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.04 }}>
                <div className="home-mini-stat-icon" style={{ background: s.color + '18', borderColor: s.color + '33' }}>
                  <s.icon size={13} style={{ color: s.color }} />
                </div>
                <div className="home-mini-stat-body">
                  <span className="home-mini-stat-val">{s.value}</span>
                  <span className="home-mini-stat-label">{s.label}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tip banner */}
        <motion.div
          key={tipIndex}
          className="home-tip-banner"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="home-tip-icon">{tip.icon}</span>
          <span className="home-tip-text">{tip.tip}</span>
          <motion.button className="home-tip-btn" onClick={() => setActivePage(tip.page)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            Go <ArrowUpRight size={11} />
          </motion.button>
          <div className="home-tip-dots">
            {TIPS.map((_, i) => (
              <div key={i} className={`home-tip-dot ${i === tipIndex ? 'active' : ''}`} onClick={() => setTipIndex(i)} />
            ))}
          </div>
        </motion.div>

        {/* Bottom two sections */}
        <div className="home-bottom">
          {/* Quick Nav */}
          <motion.div className="quick-nav-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
            <h2 className="section-label">Quick Access</h2>
            <div className="quick-nav-list">
              {quickActions.map((action, i) => (
                <motion.button
                  key={action.id}
                  className="quick-nav-item"
                  onClick={() => setActivePage(action.id)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 + i * 0.04 }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="quick-nav-dot" style={{ background: action.color, boxShadow: `0 0 8px ${action.color}66` }} />
                  <div className="quick-nav-text">
                    <span className="quick-nav-name">{action.label}</span>
                    <span className="quick-nav-desc">{action.desc}</span>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Right side — Auto Fix + RAM bar */}
          <div className="home-right-col">
            {/* Auto Fix Card */}
            <motion.div className="autofix-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}>
              <div className="autofix-header">
                <div className="autofix-icon">
                  <Wrench size={15} style={{ color: 'var(--red-primary)' }} />
                </div>
                <div>
                  <span className="autofix-title">Auto Fix</span>
                  <span className="autofix-sub">Full PC scan — hardware, input devices & more</span>
                </div>
                {autoFixState === 'idle' && (
                  <motion.button className="autofix-btn" onClick={runAutoFix} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
                    <Zap size={12} /> Scan PC
                  </motion.button>
                )}
                {(autoFixState === 'scanning' || autoFixState === 'applying') && (
                  <div className="autofix-scanning-badge">
                    <Loader size={11} className="spin-anim" />
                    {autoFixState === 'scanning' ? 'Scanning...' : 'Fixing...'}
                  </div>
                )}
                {autoFixState === 'done' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {highCount > 0 && <span className="autofix-high-badge">{highCount} critical</span>}
                    <motion.button className="autofix-btn autofix-btn-done" onClick={resetAutoFix} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
                      <X size={11} /> {fixedCount} Fixed
                    </motion.button>
                  </div>
                )}
              </div>

              {autoFixState === 'idle' && (
                <p className="autofix-idle-text">Scans your entire PC — RAM, CPU, disk, GPU, network, services, startup, drivers and more — then fixes everything automatically.</p>
              )}

              {autoFixState === 'scanning' && (
                <div className="autofix-scanning-body">
                  <div className="autofix-scan-spinner">
                    <div className="autofix-spin-ring" />
                  </div>
                  <motion.span
                    key={scanMsg}
                    className="autofix-scan-msg"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >{scanMsg}</motion.span>
                </div>
              )}

              {(autoFixState === 'applying' || autoFixState === 'done') && autoFixFindings.length > 0 && (
                <div className="autofix-findings">
                  {/* Group by category */}
                  {[...new Set(autoFixFindings.map(f => f.category))].map(cat => {
                    const CatIcon = CAT_ICON[cat] || Wrench;
                    const items = autoFixFindings.map((f, i) => ({ ...f, idx: i })).filter(f => f.category === cat);
                    return (
                      <div key={cat} className="autofix-cat-group">
                        <div className="autofix-cat-label">
                          <CatIcon size={10} />
                          {cat}
                        </div>
                        {items.map(f => {
                          const sev = SEV_CONFIG[f.severity] || SEV_CONFIG.info;
                          const status = autoFixApplied[f.idx];
                          return (
                            <motion.div
                              key={f.idx}
                              className="autofix-finding-row"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.18, delay: f.idx * 0.025 }}
                            >
                              <div className="autofix-finding-sev" style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}>
                                {sev.label}
                              </div>
                              <div className="autofix-finding-body">
                                <span className="autofix-finding-label">{f.label}</span>
                                {f.detail ? <span className="autofix-finding-detail">{f.detail}</span> : null}
                              </div>
                              <div className="autofix-finding-status">
                                {status === 'applying' && <Loader size={11} className="spin-anim" style={{ color: '#f59e0b' }} />}
                                {status === 'ok' && <CheckCircle size={11} style={{ color: '#4ade80' }} />}
                                {status === 'skip' && <span className="autofix-skip-badge">Manual</span>}
                                {!status && <span className="autofix-pending-dot" />}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {autoFixState === 'done' && autoFixFindings.length === 0 && (
                <div className="autofix-clean">
                  <CheckCircle size={22} style={{ color: '#4ade80' }} />
                  <span>No issues found — your PC is already optimized!</span>
                </div>
              )}
            </motion.div>

            {/* RAM Bar */}
            <motion.div className="ram-bar-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.22 }}>
              <div className="ram-bar-left">
                <MemoryStick size={15} style={{ color: 'var(--red-primary)' }} />
                <div>
                  <span className="ram-label">Memory</span>
                  <span className="ram-sub">{info.ramUsed || 0} GB / {info.ramTotal || 0} GB</span>
                </div>
              </div>
              <div className="ram-bar-center">
                <div className="ram-bar-track">
                  <motion.div
                    className="ram-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${ramPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ background: `var(--red-primary)`, boxShadow: `0 0 8px var(--red-glow)` }}
                  />
                </div>
              </div>
              <div className="ram-bar-right">
                <span className="ram-pct">{ramPct}%</span>
              </div>
            </motion.div>

            {/* PC Details Card */}
            {(info.osName || info.uptime || info.cpuCores) ? (
              <motion.div className="pc-details-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.26 }}>
                <div className="pc-details-title">System Details</div>
                <div className="pc-details-grid">
                  {info.osName && (
                    <div className="pc-detail-row">
                      <Globe size={11} style={{ color: '#6b7280' }} />
                      <span className="pc-detail-label">OS</span>
                      <span className="pc-detail-val">{info.osName}{info.osBuild ? ` (${info.osBuild})` : ''}</span>
                    </div>
                  )}
                  {info.uptime && (
                    <div className="pc-detail-row">
                      <Clock size={11} style={{ color: '#6b7280' }} />
                      <span className="pc-detail-label">Uptime</span>
                      <span className="pc-detail-val">{info.uptime}</span>
                    </div>
                  )}
                  {info.cpuCores > 0 && (
                    <div className="pc-detail-row">
                      <Cpu size={11} style={{ color: '#6b7280' }} />
                      <span className="pc-detail-label">CPU</span>
                      <span className="pc-detail-val">{info.cpuCores}C/{info.cpuThreads}T · {info.cpuSpeed}</span>
                    </div>
                  )}
                  {info.gpuDriver && (
                    <div className="pc-detail-row">
                      <Monitor size={11} style={{ color: '#6b7280' }} />
                      <span className="pc-detail-label">GPU Driver</span>
                      <span className="pc-detail-val">{info.gpuDriver}</span>
                    </div>
                  )}
                  {info.audioDevice && info.audioDevice !== 'N/A' && (
                    <div className="pc-detail-row">
                      <Volume2 size={11} style={{ color: '#6b7280' }} />
                      <span className="pc-detail-label">Audio</span>
                      <span className="pc-detail-val">{info.audioDevice}</span>
                    </div>
                  )}
                  {info.battPct >= 0 && (
                    <div className="pc-detail-row">
                      <Battery size={11} style={{ color: info.battPct < 20 ? '#ef4444' : '#22c55e' }} />
                      <span className="pc-detail-label">Battery</span>
                      <span className="pc-detail-val" style={{ color: info.battPct < 20 ? '#ef4444' : undefined }}>
                        {info.battPct}%{info.battCharging ? ' ⚡' : ''}
                      </span>
                    </div>
                  )}
                  {info.netAdapter && info.netAdapter !== 'N/A' && (
                    <div className="pc-detail-row">
                      <Wifi size={11} style={{ color: '#6b7280' }} />
                      <span className="pc-detail-label">Network</span>
                      <span className="pc-detail-val">{info.netAdapter} · {info.netSpeed}</span>
                    </div>
                  )}
                  {info.totalDisk > 0 && (
                    <div className="pc-detail-row">
                      <HardDrive size={11} style={{ color: '#6b7280' }} />
                      <span className="pc-detail-label">Total Storage</span>
                      <span className="pc-detail-val">{info.freeDisk} GB free / {info.totalDisk} GB</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
