import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Palette, Check, RefreshCw, Download, Zap, Sparkles, Image, HardDrive,
  Upload, FolderOpen, X, RotateCcw, Settings2, Crown, Lock, Monitor,
  Power, Keyboard, Info, ExternalLink, MessageCircle, Github, Cpu, Globe,
  Bell, BellOff, Moon, Package, Gamepad2, Target, BrainCircuit,
  Wrench, AlertCircle, CheckCircle, Code, Activity, Database, Loader
} from 'lucide-react';
import { usePremium } from '../context/PremiumContext';
import './SettingsPage.css';


const WALLPAPERS = [
  { id: 'none',     label: 'None',       icon: '✕',  desc: 'Solid dark background',         preview: 'linear-gradient(135deg,#0a0a0c,#111)' },
  { id: 'aurora',   label: 'Aurora',     icon: '🌌', desc: 'Deep blue & purple cosmos',       preview: 'linear-gradient(-45deg,#02000f,#0a0030,#000d22,#0d0035)' },
  { id: 'nebula',   label: 'Nebula',     icon: '🔮', desc: 'Rich purple nebula',              preview: 'linear-gradient(135deg,#0a0015,#140040,#04000f,#1c0050)' },
  { id: 'ember',    label: 'Ember',      icon: '🔥', desc: 'Dark crimson glow',               preview: 'linear-gradient(-45deg,#0a0000,#200400,#0d0000,#2a0600)' },
  { id: 'cyber',    label: 'Cyber',      icon: '💻', desc: 'Neon cyberpunk blue',             preview: 'linear-gradient(-45deg,#000a14,#001828,#00091a,#002240)' },
  { id: 'ocean',    label: 'Ocean',      icon: '🌊', desc: 'Deep sea teal',                   preview: 'linear-gradient(-45deg,#000810,#001520,#000c18,#001e30)' },
  { id: 'forest',   label: 'Forest',     icon: '🌲', desc: 'Dark green forest',               preview: 'linear-gradient(-45deg,#001a00,#002d00,#001200,#003800)' },
  { id: 'sunset',   label: 'Sunset',     icon: '🌅', desc: 'Warm orange sunset',              preview: 'linear-gradient(-45deg,#1a0800,#2d1500,#120600,#381a00)' },
  { id: 'galaxy',   label: 'Galaxy',     icon: '🌌', desc: 'Deep space purple',               preview: 'linear-gradient(-45deg,#0a0015,#1a0030,#0d001a,#260040)' },
  { id: 'volcano',  label: 'Volcano',    icon: '🌋', desc: 'Molten lava red',                 preview: 'linear-gradient(-45deg,#1a0000,#300000,#0d0000,#400000)' },
  { id: 'arctic',   label: 'Arctic',     icon: '❄️', desc: 'Frozen blue ice',                 preview: 'linear-gradient(-45deg,#001525,#002540,#001a30,#003550)' },
  { id: 'desert',   label: 'Desert',     icon: '🏜️', desc: 'Golden sand dunes',               preview: 'linear-gradient(-45deg,#1a1500,#2d2500,#121a00,#383000)' },
  { id: 'cherry',   label: 'Cherry',     icon: '🌸', desc: 'Sakura pink gradient',             preview: 'linear-gradient(-45deg,#1a0015,#2d0025,#0d001a,#400030)' },
  { id: 'midnight', label: 'Midnight',   icon: '🌙', desc: 'Deep midnight blue',               preview: 'linear-gradient(-45deg,#00000a,#000015,#00000d,#000020)' },
  { id: 'toxic',    label: 'Toxic',      icon: '☢️', desc: 'Radioactive green',               preview: 'linear-gradient(-45deg,#001a00,#003300,#001200,#004400)' },
  { id: 'royal',    label: 'Royal',      icon: '👑', desc: 'Royal purple velvet',             preview: 'linear-gradient(-45deg,#1a0015,#330025,#1a0025,#400030)' },
  { id: 'custom',   label: 'Custom',     icon: '🖼️', desc: 'Your own image or GIF',          preview: null },
];

const PARTICLES = [
  { id: 'none',        label: 'None',            icon: '✕',  desc: 'No effects' },
  { id: 'snow',        label: 'Snow',            icon: '❄️', desc: '6-arm snowflakes' },
  { id: 'stars',       label: 'Stars',           icon: '✨', desc: 'Twinkling starfield' },
  { id: 'shooting',    label: 'Shooting Stars',  icon: '🌠', desc: 'Stars with trails' },
  { id: 'embers',      label: 'Embers',          icon: '🔥', desc: 'Rising sparks' },
  { id: 'matrix',      label: 'Matrix Rain',     icon: '🟩', desc: 'Falling characters' },
  { id: 'rain',        label: 'Rain',            icon: '🌧️', desc: 'Falling rain streaks' },
  { id: 'confetti',    label: 'Confetti',        icon: '🎊', desc: 'Colorful falling confetti' },
  { id: 'fireflies',   label: 'Fireflies',       icon: '✨', desc: 'Glowing fireflies' },
  { id: 'bubbles',     label: 'Bubbles',         icon: '🫧', desc: 'Floating soap bubbles' },
  { id: 'leaves',      label: 'Falling Leaves',   icon: '🍂', desc: 'Autumn falling leaves' },
  { id: 'petals',      label: 'Cherry Petals',    icon: '🌸', desc: 'Pink cherry blossom petals' },
  { id: 'sparks',      label: 'Electric Sparks',  icon: '⚡', desc: 'Blue electric sparks' },
  { id: 'hearts',      label: 'Floating Hearts',  icon: '💖', desc: 'Pink floating hearts' },
  { id: 'diamonds',    label: 'Diamonds',        icon: '💎', desc: 'Rotating diamonds' },
  { id: 'glitch',      label: 'Glitch',          icon: '📺', desc: 'Digital glitch effects' },
  { id: 'smoke',       label: 'Smoke',           icon: '💨', desc: 'Rising smoke particles' },
  { id: 'dust',        label: 'Dust',            icon: '🌫️', desc: 'Floating dust motes' },
];

const THEMES = [
  { id: 'red',      label: 'Crimson Red',      accent: '#e03030', desc: 'Default classic red' },
  { id: 'blue',     label: 'Electric Blue',    accent: '#3b82f6', desc: 'Cool blue accent' },
  { id: 'purple',   label: 'Deep Purple',      accent: '#8b5cf6', desc: 'Rich purple accent' },
  { id: 'green',    label: 'Matrix Green',     accent: '#22c55e', desc: 'Hacker green' },
  { id: 'orange',   label: 'Blaze Orange',     accent: '#f97316', desc: 'Warm orange accent' },
  { id: 'cyan',     label: 'Neon Cyan',        accent: '#06b6d4', desc: 'Cyber cyan accent' },
  { id: 'pink',     label: 'Hot Pink',         accent: '#ec4899', desc: 'Vibrant pink' },
  { id: 'gold',     label: 'Gold',             accent: '#f59e0b', desc: 'Premium gold accent' },
  { id: 'lime',     label: 'Lime Green',       accent: '#84cc16', desc: 'Fresh lime accent' },
  { id: 'indigo',   label: 'Deep Indigo',      accent: '#6366f1', desc: 'Deep indigo accent' },
  { id: 'rose',     label: 'Rose Pink',        accent: '#f43f5e', desc: 'Soft rose accent' },
  { id: 'teal',     label: 'Teal',             accent: '#14b8a6', desc: 'Calm teal accent' },
  { id: 'amber',    label: 'Amber',            accent: '#d97706', desc: 'Warm amber accent' },
  { id: 'violet',   label: 'Electric Violet',  accent: '#7c3aed', desc: 'Bright violet accent' },
  { id: 'emerald',  label: 'Emerald',          accent: '#10b981', desc: 'Rich emerald accent' },
  { id: 'magenta',  label: 'Magenta',          accent: '#d946ef', desc: 'Bold magenta accent' },
  { id: 'slate',    label: 'Slate Blue',       accent: '#475569', desc: 'Professional slate' },
  { id: 'zinc',     label: 'Zinc Gray',        accent: '#71717a', desc: 'Neutral zinc gray' },
];

const SHORTCUTS = [
  { label: 'Navigate pages',    keys: ['Ctrl', '1–9'] },
  { label: 'Open Settings',     keys: ['Ctrl', ','] },
  { label: 'App Booster',       keys: ['Ctrl', '1'] },
  { label: 'Process Manager',   keys: ['Ctrl', '2'] },
  { label: 'Startup Manager',   keys: ['Ctrl', '3'] },
  { label: 'System Cleaner',    keys: ['Ctrl', '4'] },
  { label: 'Power Plan',        keys: ['Ctrl', '5'] },
  { label: 'Restore Points',    keys: ['Ctrl', '6'] },
];

export default function SettingsPage({ loggedInUser, onLogout, currentTheme, onThemeChange, currentParticle, onParticleChange, currentWallpaper, onWallpaperChange, customWallpaperUrl, setActivePage, updateStatus, updateVersion, downloadPercent, updateDownloaded, onCheckUpdate }) {
  const { isPremium } = usePremium();

  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [minimizeToTray,  setMinimizeToTray]  = useState(() => localStorage.getItem('st_minimizeToTray') === 'true');
  const [notifications,   setNotifications]   = useState(() => localStorage.getItem('st_notifications') !== 'false');
  const [autoBoost,       setAutoBoost]       = useState(() => localStorage.getItem('st_autoBoost') === 'true');
  const [gameMode,        setGameMode]        = useState(() => localStorage.getItem('st_gameMode') === 'true');
  const [hardwareAccel,   setHardwareAccel]   = useState(() => localStorage.getItem('st_hardwareAccel') !== 'false');
  const [autoUpdate,      setAutoUpdate]      = useState(() => localStorage.getItem('st_autoUpdate') !== 'false');
  const [telemetry,       setTelemetry]       = useState(() => localStorage.getItem('st_telemetry') === 'true');
  const [advancedMode,    setAdvancedMode]    = useState(() => localStorage.getItem('st_advancedMode') === 'true');
  const [resetStatus,     setResetStatus]     = useState(null);
  const [backupStatus,    setBackupStatus]    = useState(null);
  const [importStatus,    setImportStatus]    = useState(null);
  const [appearTab,       setAppearTab]       = useState('theme');
  const [diagState,       setDiagState]       = useState('idle');
  const [diagResults,     setDiagResults]     = useState([]);
  const [diagTab,         setDiagTab]         = useState('app');
  const [settingsJson,    setSettingsJson]     = useState('');
  const [jsonSaveStatus,  setJsonSaveStatus]  = useState(null);
  const [jsonLoaded,      setJsonLoaded]       = useState(false);

  useEffect(() => {
    window.electronAPI?.getStartupSetting?.().then(v => setLaunchAtStartup(!!v)).catch(() => {});
  }, []);

  const handleStartupToggle = async () => {
    const next = !launchAtStartup;
    setLaunchAtStartup(next);
    await window.electronAPI?.setStartupSetting?.(next);
  };

  const mkToggle = (setter, key) => () => setter(prev => { const next = !prev; localStorage.setItem(key, next); return next; });
  const handleMinimizeToTray  = mkToggle(setMinimizeToTray,  'st_minimizeToTray');
  const handleNotifications   = mkToggle(setNotifications,   'st_notifications');
  const handleAutoBoost       = mkToggle(setAutoBoost,       'st_autoBoost');
  const handleGameMode        = mkToggle(setGameMode,        'st_gameMode');
  const handleHardwareAccel   = mkToggle(setHardwareAccel,   'st_hardwareAccel');
  const handleAutoUpdate      = mkToggle(setAutoUpdate,      'st_autoUpdate');
  const handleTelemetry       = mkToggle(setTelemetry,       'st_telemetry');
  const handleAdvancedMode    = mkToggle(setAdvancedMode,    'st_advancedMode');

  const handleResetSettings = () => {
    if (!window.confirm('Reset all Lctron settings to defaults? This cannot be undone.')) return;
    localStorage.clear();
    setResetStatus('done');
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleDownload = () => { window.electronAPI?.downloadUpdate(); };
  const handleInstall  = () => { window.electronAPI?.installUpdate(); };

  const handleExport = async () => {
    setBackupStatus('saving');
    try {
      const res = await window.electronAPI?.exportSettings();
      setBackupStatus(res?.success ? 'done' : 'error');
    } catch { setBackupStatus('error'); }
    setTimeout(() => setBackupStatus(null), 3000);
  };

  const handleImport = async () => {
    setImportStatus('loading');
    try {
      const res = await window.electronAPI?.importSettings();
      if (res?.success) { setImportStatus('done'); setTimeout(() => window.location.reload(), 1200); }
      else { setImportStatus(res?.canceled ? null : 'error'); setTimeout(() => setImportStatus(null), 3000); }
    } catch { setImportStatus('error'); setTimeout(() => setImportStatus(null), 3000); }
  };

  const handleBrowseWallpaper = async () => {
    if (window.electronAPI?.browseImage) {
      const filePath = await window.electronAPI.browseImage();
      if (filePath) {
        const url = filePath.startsWith('http') ? filePath : `file:///${filePath.replace(/\\/g, '/')}`;
        onWallpaperChange && onWallpaperChange('custom', url);
      }
    } else {
      const url = prompt('Paste an image or GIF URL:');
      if (url) onWallpaperChange && onWallpaperChange('custom', url);
    }
  };

  const runDiagnostics = async () => {
    setDiagState('scanning');
    setDiagResults([]);
    const checks = [];

    // 1. Theme CSS applied
    const themeAttr = document.documentElement.getAttribute('data-theme') || '';
    const expectedTheme = currentTheme === 'red' ? '' : (currentTheme || '');
    const themeOk = themeAttr === expectedTheme;
    checks.push({
      id: 'theme', label: 'Theme CSS active',
      status: themeOk ? 'ok' : 'warn',
      detail: themeOk ? `Theme "${currentTheme}" applied correctly` : `data-theme="${themeAttr}" (expected "${expectedTheme}")`,
      fix: !themeOk ? () => document.documentElement.setAttribute('data-theme', expectedTheme) : null,
      fixLabel: 'Re-apply theme',
    });

    // 2. CSS variables resolving
    const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
    checks.push({
      id: 'css-vars', label: 'Theme CSS variables',
      status: accentRgb ? 'ok' : 'error',
      detail: accentRgb ? `--accent-rgb: ${accentRgb}` : 'CSS variables not resolving — theme broken',
      fix: !accentRgb ? () => document.documentElement.setAttribute('data-theme', expectedTheme) : null,
      fixLabel: 'Force-reload CSS vars',
    });

    // 3. Wallpaper class
    const hasWpClass = document.body.classList.contains('has-wallpaper');
    const wpActive = currentWallpaper && currentWallpaper !== 'none';
    const wpOk = wpActive ? hasWpClass : !hasWpClass;
    checks.push({
      id: 'wallpaper', label: 'Wallpaper visibility',
      status: wpOk ? 'ok' : 'warn',
      detail: wpActive
        ? (hasWpClass ? `Wallpaper "${currentWallpaper}" rendering correctly` : 'has-wallpaper class missing — wallpaper hidden')
        : 'No wallpaper selected',
      fix: (wpActive && !hasWpClass) ? () => document.body.classList.add('has-wallpaper') : null,
      fixLabel: 'Fix wallpaper class',
    });

    // 4. Electron API
    checks.push({
      id: 'electron', label: 'Electron API',
      status: window.electronAPI ? 'ok' : 'warn',
      detail: window.electronAPI ? 'All IPC channels available' : 'Running in browser/dev mode — no Electron',
      fix: null,
    });

    // 5. Settings persistence
    if (window.electronAPI) {
      try {
        const s = await window.electronAPI.loadSettings();
        checks.push({
          id: 'settings', label: 'Settings persistence',
          status: 'ok',
          detail: `${Object.keys(s || {}).length} keys saved`,
          fix: null,
        });
      } catch (e) {
        checks.push({
          id: 'settings', label: 'Settings persistence',
          status: 'error', detail: `Load failed: ${e.message}`, fix: null,
        });
      }
    }

    // 6. localStorage integrity
    const lsKeys = ['lctron-theme', 'lctron-wallpaper', 'lctron-particle'];
    const missing = lsKeys.filter(k => !localStorage.getItem(k));
    checks.push({
      id: 'localstorage', label: 'localStorage state',
      status: missing.length === 0 ? 'ok' : 'warn',
      detail: missing.length === 0 ? `All ${lsKeys.length} preference keys present` : `Missing: ${missing.join(', ')}`,
      fix: missing.length > 0 ? () => {
        if (!localStorage.getItem('lctron-theme')) localStorage.setItem('lctron-theme', 'red');
        if (!localStorage.getItem('lctron-wallpaper')) localStorage.setItem('lctron-wallpaper', 'none');
        if (!localStorage.getItem('lctron-particle')) localStorage.setItem('lctron-particle', 'none');
      } : null,
      fixLabel: 'Initialize missing keys',
    });

    await new Promise(r => setTimeout(r, 600));
    setDiagResults(checks);
    setDiagState('done');
  };

  const applyDiagFix = (check) => {
    if (check.fix) {
      check.fix();
      setDiagResults(prev => prev.map(c => c.id === check.id ? { ...c, status: 'ok', detail: 'Fixed — ' + c.detail, fix: null } : c));
    }
  };

  const loadSettingsJson = async () => {
    try {
      let data = {};
      if (window.electronAPI) {
        data = await window.electronAPI.loadSettings() || {};
      } else {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          try { data[k] = JSON.parse(localStorage.getItem(k)); }
          catch { data[k] = localStorage.getItem(k); }
        }
      }
      setSettingsJson(JSON.stringify(data, null, 2));
      setJsonLoaded(true);
    } catch (e) {
      setSettingsJson(`// Error: ${e.message}`);
      setJsonLoaded(true);
    }
  };

  const saveSettingsJson = async () => {
    try {
      const parsed = JSON.parse(settingsJson);
      if (window.electronAPI) await window.electronAPI.saveSettings(parsed);
      setJsonSaveStatus('saved');
    } catch (e) {
      setJsonSaveStatus('error');
    }
    setTimeout(() => setJsonSaveStatus(null), 2500);
  };

  const openLink = (url) => {
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    else window.open(url, '_blank');
  };

  const anim = (delay = 0) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.28, delay },
  });

  return (
    <div className="settings-page">
      <div className="settings-layout">

        {/* ── Left sidebar ─────────────────────────────── */}
        <aside className="settings-sidebar">

          {/* Profile card */}
          <motion.div className="st-profile-card" {...anim(0.04)}>
            <div className="st-avatar-wrap">
              {loggedInUser?.picture
                ? <img src={loggedInUser.picture} alt={loggedInUser.name} className="st-avatar" referrerPolicy="no-referrer" />
                : <div className="st-avatar-placeholder">{loggedInUser?.name?.[0] || 'U'}</div>
              }
            </div>
            <div className="st-profile-name">{loggedInUser?.name || 'User'}</div>
            {loggedInUser?.email && <div className="st-profile-email">{loggedInUser.email}</div>}
            <span className="st-plan-badge free">Free</span>
            <motion.button className="st-logout-btn" onClick={onLogout} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <LogOut size={13} /> Sign Out
            </motion.button>
          </motion.div>

          {/* App info */}
          <motion.div className="st-app-card" {...anim(0.07)}>
            <div className="st-app-card-title"><Package size={10} /> App Info</div>
            <div className="st-app-row"><span className="st-app-row-label">Version</span><span className="st-app-row-val">v1.7.39</span></div>
            <div className="st-app-row"><span className="st-app-row-label">Platform</span><span className="st-app-row-val">Windows</span></div>
            <div className="st-app-row"><span className="st-app-row-label">Engine</span><span className="st-app-row-val">Electron 30</span></div>
            <div className="st-app-row"><span className="st-app-row-label">Channel</span><span className="st-app-row-val" style={{color:'#22c55e'}}>Stable</span></div>
          </motion.div>

          {/* Quick links */}
          <motion.div className="st-links-card" {...anim(0.1)}>
            <button className="st-link-row" onClick={() => openLink('https://discord.gg/7J62ArFa75')}>
              <MessageCircle size={13} className="st-link-row-icon" style={{color:'#5865F2'}} /> Discord Server
            </button>
            <button className="st-link-row" onClick={() => openLink('https://github.com/Prominr/Lctron-Optimizer/releases')}>
              <Github size={13} className="st-link-row-icon" /> Changelog
            </button>
            <button className="st-link-row" onClick={() => openLink('https://lctronoptimizer.netlify.app')}>
              <Globe size={13} className="st-link-row-icon" /> Website
            </button>
            {!isPremium && (
              <button className="st-link-row" onClick={() => setActivePage && setActivePage('premium')} style={{color:'#a78bfa'}}>
                <Crown size={13} className="st-link-row-icon" style={{color:'#a78bfa'}} /> Upgrade to PRO
              </button>
            )}
          </motion.div>

        </aside>

        {/* ── Main content ─────────────────────────────── */}
        <div className="settings-main">

          {/* Appearance — tabbed */}
          <motion.div className="st-section" {...anim(0.05)}>
            <div className="st-section-label"><Palette size={12} /> Appearance</div>
            <div className="st-card">
              <div className="st-tabs">
                {[
                  { id: 'theme',     label: 'Theme',     icon: <Palette size={12} /> },
                  { id: 'wallpaper', label: 'Wallpaper',  icon: <Image size={12} /> },
                  { id: 'particles', label: 'Particles',  icon: <Sparkles size={12} /> },
                ].map(t => (
                  <button key={t.id} className={`st-tab ${appearTab === t.id ? 'active' : ''}`} onClick={() => setAppearTab(t.id)}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {appearTab === 'theme' && (
                  <motion.div key="theme" className="st-tab-body" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}>
                    {!isPremium && <div className="st-appear-notice"><Crown size={11} /> All themes except Crimson Red require <button className="st-appear-upgrade" onClick={() => setActivePage?.('premium')}>Premium</button></div>}
                    <div className="settings-theme-grid">
                      {THEMES.map((theme, i) => {
                        const locked = !isPremium && theme.id !== 'red';
                        return (
                          <motion.button
                            key={theme.id}
                            className={`settings-theme-card ${currentTheme === theme.id ? 'active' : ''} ${locked ? 'appear-locked' : ''}`}
                            onClick={() => locked ? setActivePage?.('premium') : onThemeChange(theme.id)}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                            whileHover={{ y: locked ? 0 : -2 }} whileTap={{ scale: 0.97 }}
                          >
                            <div className="settings-theme-swatch" style={{ background: theme.accent, boxShadow: locked ? 'none' : `0 0 10px ${theme.accent}55`, opacity: locked ? 0.4 : 1 }} />
                            <div className="settings-theme-info">
                              <span className="settings-theme-name">{theme.label}</span>
                              <span className="settings-theme-desc">{theme.desc}</span>
                            </div>
                            {locked
                              ? <div className="appear-lock-badge"><Lock size={10} /></div>
                              : currentTheme === theme.id && <div className="settings-theme-check" style={{ color: theme.accent }}><Check size={13} /></div>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {appearTab === 'wallpaper' && (
                  <motion.div key="wallpaper" className="st-tab-body" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}>
                    {!isPremium && <div className="st-appear-notice"><Crown size={11} /> Animated wallpapers require <button className="st-appear-upgrade" onClick={() => setActivePage?.('premium')}>Premium</button></div>}
                    <div className="settings-wallpaper-grid">
                      {WALLPAPERS.map((wp, i) => {
                        const locked = !isPremium && wp.id !== 'none';
                        return (
                          <motion.button
                            key={wp.id}
                            className={`settings-wallpaper-card ${currentWallpaper === wp.id ? 'active' : ''} ${locked ? 'appear-locked' : ''}`}
                            onClick={() => {
                              if (locked) { setActivePage?.('premium'); return; }
                              if (wp.id === 'custom') handleBrowseWallpaper(); else onWallpaperChange?.(wp.id);
                            }}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                            whileHover={{ y: locked ? 0 : -2 }} whileTap={{ scale: 0.97 }}
                          >
                            <div
                              className="settings-wallpaper-preview"
                              style={
                                wp.id === 'custom' && customWallpaperUrl
                                  ? { backgroundImage: `url("${customWallpaperUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
                                  : wp.preview ? { background: wp.preview } : { background: 'linear-gradient(135deg,#0a0a0a,#111)' }
                              }
                            >
                              {locked && <div className="appear-wp-lock"><Lock size={12} style={{ color: '#a78bfa' }} /></div>}
                              {!locked && wp.id === 'custom' && !customWallpaperUrl && <FolderOpen size={16} style={{ color: '#555' }} />}
                              {!locked && wp.id === 'custom' && customWallpaperUrl && (
                                <button className="settings-wallpaper-clear" onClick={e => { e.stopPropagation(); onWallpaperChange?.('none', ''); }}><X size={10} /></button>
                              )}
                            </div>
                            <div className="settings-wallpaper-info">
                              <span className="settings-wallpaper-name" style={locked ? { color: '#444' } : {}}>{wp.label}</span>
                              <span className="settings-wallpaper-desc">{locked ? 'PRO' : wp.desc}</span>
                            </div>
                            {!locked && currentWallpaper === wp.id && <div className="settings-wallpaper-check"><Check size={11} /></div>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {appearTab === 'particles' && (
                  <motion.div key="particles" className="st-tab-body" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}>
                    {!isPremium && <div className="st-appear-notice"><Crown size={11} /> Particle effects require <button className="st-appear-upgrade" onClick={() => setActivePage?.('premium')}>Premium</button></div>}
                    <div className="settings-particles-grid">
                      {PARTICLES.map((p, i) => {
                        const locked = !isPremium && p.id !== 'none';
                        return (
                          <motion.button
                            key={p.id}
                            className={`settings-particle-card ${currentParticle === p.id ? 'active' : ''} ${locked ? 'appear-locked' : ''}`}
                            onClick={() => locked ? setActivePage?.('premium') : onParticleChange?.(p.id)}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                            whileHover={{ y: locked ? 0 : -2 }} whileTap={{ scale: 0.97 }}
                          >
                            <span className="settings-particle-icon" style={{ opacity: locked ? 0.3 : 1 }}>{p.icon}</span>
                            <div className="settings-particle-info">
                              <span className="settings-particle-name" style={locked ? { color: '#444' } : {}}>{p.label}</span>
                              <span className="settings-particle-desc">{locked ? 'PRO' : p.desc}</span>
                            </div>
                            {locked
                              ? <div className="appear-lock-badge"><Lock size={10} /></div>
                              : currentParticle === p.id && <div className="settings-particle-check"><Check size={12} /></div>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* System */}
          <motion.div className="st-section" {...anim(0.08)}>
            <div className="st-section-label"><Settings2 size={12} /> System</div>
            <div className="st-card">
              <div className="st-toggle-row">
                <div className="st-toggle-left">
                  <Power size={15} className="st-toggle-icon" />
                  <div className="st-toggle-info">
                    <span className="st-toggle-label">Launch at Windows Startup</span>
                    <span className="st-toggle-desc">Start Lctron automatically when Windows boots</span>
                  </div>
                </div>
                <button className={`settings-toggle-btn ${launchAtStartup ? 'on' : ''}`} onClick={handleStartupToggle}>
                  <div className="settings-toggle-knob" />
                </button>
              </div>
              <div className="st-toggle-row">
                <div className="st-toggle-left">
                  <Monitor size={15} className="st-toggle-icon" />
                  <div className="st-toggle-info">
                    <span className="st-toggle-label">Minimize to System Tray</span>
                    <span className="st-toggle-desc">Keep running in background when window is closed</span>
                  </div>
                </div>
                <button className={`settings-toggle-btn ${minimizeToTray ? 'on' : ''}`} onClick={handleMinimizeToTray}>
                  <div className="settings-toggle-knob" />
                </button>
              </div>
              <div className="st-toggle-row">
                <div className="st-toggle-left">
                  <Bell size={15} className="st-toggle-icon" />
                  <div className="st-toggle-info">
                    <span className="st-toggle-label">Toast Notifications</span>
                    <span className="st-toggle-desc">Show action confirmations and alerts in-app</span>
                  </div>
                </div>
                <button className={`settings-toggle-btn ${notifications ? 'on' : ''}`} onClick={handleNotifications}>
                  <div className="settings-toggle-knob" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Performance */}
          <motion.div className="st-section" {...anim(0.09)}>
            <div className="st-section-label"><Cpu size={12} /> Performance</div>
            <div className="st-card">
              <div className="st-toggle-row">
                <div className="st-toggle-left">
                  <Gamepad2 size={15} className="st-toggle-icon" />
                  <div className="st-toggle-info">
                    <span className="st-toggle-label">Auto-Boost Games</span>
                    <span className="st-toggle-desc">Automatically boost detected games when launched</span>
                  </div>
                </div>
                <button className={`settings-toggle-btn ${autoBoost ? 'on' : ''}`} onClick={handleAutoBoost}>
                  <div className="settings-toggle-knob" />
                </button>
              </div>
              <div className="st-toggle-row">
                <div className="st-toggle-left">
                  <Target size={15} className="st-toggle-icon" />
                  <div className="st-toggle-info">
                    <span className="st-toggle-label">Game Mode</span>
                    <span className="st-toggle-desc">Optimize system settings for gaming performance</span>
                  </div>
                </div>
                <button className={`settings-toggle-btn ${gameMode ? 'on' : ''}`} onClick={handleGameMode}>
                  <div className="settings-toggle-knob" />
                </button>
              </div>
              <div className="st-toggle-row">
                <div className="st-toggle-left">
                  <Monitor size={15} className="st-toggle-icon" />
                  <div className="st-toggle-info">
                    <span className="st-toggle-label">Hardware Acceleration</span>
                    <span className="st-toggle-desc">Use GPU for rendering and animations</span>
                  </div>
                </div>
                <button className={`settings-toggle-btn ${hardwareAccel ? 'on' : ''}`} onClick={handleHardwareAccel}>
                  <div className="settings-toggle-knob" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Advanced */}
          <motion.div className="st-section" {...anim(0.1)}>
            <div className="st-section-label"><Settings2 size={12} /> Advanced</div>
            <div className="st-card">
              <div className="st-toggle-row">
                <div className="st-toggle-left">
                  <Zap size={15} className="st-toggle-icon" />
                  <div className="st-toggle-info">
                    <span className="st-toggle-label">Auto-Update</span>
                    <span className="st-toggle-desc">Automatically download and install updates</span>
                  </div>
                </div>
                <button className={`settings-toggle-btn ${autoUpdate ? 'on' : ''}`} onClick={handleAutoUpdate}>
                  <div className="settings-toggle-knob" />
                </button>
              </div>
              <div className="st-toggle-row">
                <div className="st-toggle-left">
                  <BellOff size={15} className="st-toggle-icon" />
                  <div className="st-toggle-info">
                    <span className="st-toggle-label">Telemetry</span>
                    <span className="st-toggle-desc">Share anonymous usage data to improve Lctron</span>
                  </div>
                </div>
                <button className={`settings-toggle-btn ${telemetry ? 'on' : ''}`} onClick={handleTelemetry}>
                  <div className="settings-toggle-knob" />
                </button>
              </div>
              <div className="st-toggle-row">
                <div className="st-toggle-left">
                  <BrainCircuit size={15} className="st-toggle-icon" />
                  <div className="st-toggle-info">
                    <span className="st-toggle-label">Advanced Mode</span>
                    <span className="st-toggle-desc">Unlock expert-level tweaks and settings</span>
                  </div>
                </div>
                <button className={`settings-toggle-btn ${advancedMode ? 'on' : ''}`} onClick={handleAdvancedMode}>
                  <div className="settings-toggle-knob" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Software Update */}
          <motion.div className="st-section" {...anim(0.1)}>
            <div className="st-section-label"><Zap size={12} /> Software Update</div>
            <div className="st-card">
              <div className="st-update-body">
                <div className="st-update-icon-wrap">
                  <Zap size={18} />
                </div>
                <div className="st-update-info">
                  <span className="st-update-title">Lctron Optimizer</span>
                  <span className="st-update-sub">v1.7.39 installed</span>
                  {updateStatus === 'not-available' && <span className="st-update-ok">✓ You're up to date</span>}
                  {updateStatus === 'available'     && <span className="st-update-new">v{updateVersion} available!</span>}
                  {updateStatus === 'downloading'   && (
                    <>
                      <span className="st-update-prog">Downloading... {downloadPercent}%</span>
                      <div className="st-update-bar-wrap"><div className="st-update-bar" style={{ width: `${downloadPercent}%` }} /></div>
                    </>
                  )}
                  {updateStatus === 'downloaded' && <span className="st-update-new">Ready to install v{updateVersion}</span>}
                  {updateStatus === 'error'      && <span className="st-update-err">Update check failed</span>}
                </div>
                {(updateStatus === 'not-available' || updateStatus === 'error') && (
                  <motion.button className="settings-update-btn" onClick={onCheckUpdate} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <RefreshCw size={13} /> Check Again
                  </motion.button>
                )}
                {(updateStatus === null || updateStatus === 'checking') && (
                  <motion.button className="settings-update-btn" disabled>
                    <RefreshCw size={13} className="settings-spin" /> Checking...
                  </motion.button>
                )}
                {updateStatus === 'available' && (
                  <motion.button className="settings-update-btn settings-update-btn-download" onClick={handleDownload} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Download size={13} /> Download
                  </motion.button>
                )}
                {updateStatus === 'downloaded' && (
                  <motion.button className="settings-update-btn settings-update-btn-install" onClick={handleInstall} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Zap size={13} /> Restart &amp; Install
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Backup & Restore */}
          <motion.div className="st-section" {...anim(0.12)}>
            <div className="st-section-label"><HardDrive size={12} /> Data &amp; Backup</div>
            <div className="st-card">
              <div className="st-backup-row">
                <div className="st-backup-icon" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' }}>
                  <Upload size={16} />
                </div>
                <div className="st-backup-info">
                  <span className="st-backup-title">Export Settings</span>
                  <span className="st-backup-desc">Save your theme, preferences and tweaks to a file</span>
                </div>
                <motion.button
                  className={`st-backup-btn ${backupStatus === 'done' ? 'success' : backupStatus === 'error' ? 'error' : ''}`}
                  onClick={handleExport}
                  disabled={backupStatus === 'saving'}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                >
                  {backupStatus === 'saving' ? <><RefreshCw size={12} className="settings-spin" /> Saving...</>
                   : backupStatus === 'done'  ? <><Check size={12} /> Saved!</>
                   : backupStatus === 'error' ? 'Failed'
                   : <><Upload size={12} /> Export</>}
                </motion.button>
              </div>
              <div className="st-backup-row">
                <div className="st-backup-icon" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
                  <Download size={16} />
                </div>
                <div className="st-backup-info">
                  <span className="st-backup-title">Import Settings</span>
                  <span className="st-backup-desc">Restore settings from a previously exported file</span>
                </div>
                <motion.button
                  className={`st-backup-btn ${importStatus === 'done' ? 'success' : importStatus === 'error' ? 'error' : ''}`}
                  onClick={handleImport}
                  disabled={importStatus === 'loading'}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                >
                  {importStatus === 'loading' ? <><RefreshCw size={12} className="settings-spin" /> Loading...</>
                   : importStatus === 'done'   ? <><Check size={12} /> Imported!</>
                   : importStatus === 'error'  ? 'Failed'
                   : <><Download size={12} /> Import</>}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Keyboard Shortcuts */}
          <motion.div className="st-section" {...anim(0.14)}>
            <div className="st-section-label"><Keyboard size={12} /> Keyboard Shortcuts</div>
            <div className="st-card">
              <div className="st-shortcuts-grid">
                {SHORTCUTS.map((s, i) => (
                  <div key={i} className="st-shortcut-item">
                    <span className="st-shortcut-label">{s.label}</span>
                    <div className="st-kbd">
                      {s.keys.map((k, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && <span style={{ fontSize: 9, color: '#444', margin: '0 1px' }}>+</span>}
                          <span className="st-key">{k}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Support */}
          <motion.div className="st-section" {...anim(0.15)}>
            <div className="st-section-label"><MessageCircle size={12} /> Support &amp; Community</div>
            <div className="st-card">
              <div className="st-about-row">
                <span className="st-about-label">Discord Server</span>
                <button className="st-about-link" onClick={() => openLink('https://discord.gg/7J62ArFa75')}>
                  Join — get help &amp; updates <ExternalLink size={10} style={{marginLeft:3}} />
                </button>
              </div>
              <div className="st-about-row">
                <span className="st-about-label">GitHub Releases</span>
                <button className="st-about-link" onClick={() => openLink('https://github.com/Prominr/Lctron-Optimizer/releases')}>
                  View changelog <ExternalLink size={10} style={{marginLeft:3}} />
                </button>
              </div>
              <div className="st-about-row">
                <span className="st-about-label">Priority Support</span>
                <span className="st-about-val">
                  {isPremium
                    ? <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700 }}>✦ Active</span>
                    : <span style={{ color: '#555', fontSize: 11 }}>PRO only</span>}
                </span>
              </div>
            </div>
          </motion.div>

          {/* About */}
          <motion.div className="st-section" {...anim(0.16)}>
            <div className="st-section-label"><Info size={12} /> About</div>
            <div className="st-card">
              <div className="st-about-row"><span className="st-about-label">Application</span><span className="st-about-val">Lctron Optimizer</span></div>
              <div className="st-about-row"><span className="st-about-label">Version</span><span className="st-about-val">v1.7.39</span></div>
              <div className="st-about-row"><span className="st-about-label">Build</span><span className="st-about-val">Stable</span></div>
              <div className="st-about-row"><span className="st-about-label">Framework</span><span className="st-about-val">Electron 30 + React</span></div>
              <div className="st-about-row"><span className="st-about-label">Platform</span><span className="st-about-val">Windows 10 / 11</span></div>
              <div className="st-about-row"><span className="st-about-label">Author</span><span className="st-about-val">Prominr</span></div>
            </div>
          </motion.div>

          {/* ── Diagnostics & Auto-Fix ───────────────────────────── */}
          <motion.div className="st-section" {...anim(0.155)}>
            <div className="st-section-label"><Wrench size={12} /> Diagnostics &amp; Auto-Fix</div>
            <div className="st-card st-diag-card">

              {/* Tab bar */}
              <div className="st-diag-tabs">
                <button className={`st-diag-tab${diagTab === 'app' ? ' active' : ''}`} onClick={() => setDiagTab('app')}>
                  <Activity size={11} /> App Diagnostics
                </button>
                <button className={`st-diag-tab${diagTab === 'editor' ? ' active' : ''}`} onClick={() => { setDiagTab('editor'); if (!jsonLoaded) loadSettingsJson(); }}>
                  <Code size={11} /> Settings Editor
                </button>
              </div>

              {/* App Diagnostics tab */}
              {diagTab === 'app' && (
                <div className="st-diag-body">
                  <div className="st-diag-top">
                    <p className="st-diag-desc">Scans theme, wallpaper, Electron API, settings persistence and localStorage for issues — and fixes them automatically.</p>
                    {diagState === 'idle' && (
                      <motion.button className="st-diag-scan-btn" onClick={runDiagnostics} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                        <Zap size={12} /> Run Diagnostics
                      </motion.button>
                    )}
                    {diagState === 'scanning' && (
                      <div className="st-diag-scanning">
                        <Loader size={12} className="spin-anim" /> Scanning...
                      </div>
                    )}
                    {diagState === 'done' && (
                      <motion.button className="st-diag-scan-btn st-diag-rescan" onClick={runDiagnostics} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                        <RefreshCw size={12} /> Re-scan
                      </motion.button>
                    )}
                  </div>

                  {diagState === 'done' && diagResults.length > 0 && (
                    <div className="st-diag-results">
                      {diagResults.map(check => (
                        <div key={check.id} className={`st-diag-row st-diag-${check.status}`}>
                          <div className="st-diag-icon">
                            {check.status === 'ok'    && <CheckCircle size={13} />}
                            {check.status === 'warn'  && <AlertCircle size={13} />}
                            {check.status === 'error' && <AlertCircle size={13} />}
                          </div>
                          <div className="st-diag-info">
                            <span className="st-diag-label">{check.label}</span>
                            <span className="st-diag-detail">{check.detail}</span>
                          </div>
                          {check.fix && (
                            <motion.button className="st-diag-fix-btn" onClick={() => applyDiagFix(check)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
                              <Wrench size={10} /> {check.fixLabel || 'Fix'}
                            </motion.button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {diagState === 'done' && diagResults.every(c => c.status === 'ok') && (
                    <div className="st-diag-clean">
                      <CheckCircle size={18} style={{ color: '#4ade80' }} />
                      <span>All checks passed — app is healthy</span>
                    </div>
                  )}
                </div>
              )}

              {/* Settings Editor tab */}
              {diagTab === 'editor' && (
                <div className="st-diag-body">
                  <div className="st-diag-top">
                    <p className="st-diag-desc">View and edit the raw settings JSON. Changes are saved directly to disk via Electron IPC.</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <motion.button className="st-diag-scan-btn" onClick={loadSettingsJson} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                        <RefreshCw size={11} /> Reload
                      </motion.button>
                      <motion.button
                        className={`st-diag-scan-btn${jsonSaveStatus === 'saved' ? ' st-diag-saved' : jsonSaveStatus === 'error' ? ' st-diag-err' : ''}`}
                        onClick={saveSettingsJson}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                      >
                        <Database size={11} />
                        {jsonSaveStatus === 'saved' ? 'Saved!' : jsonSaveStatus === 'error' ? 'Invalid JSON' : 'Save'}
                      </motion.button>
                    </div>
                  </div>
                  <textarea
                    className="st-diag-json"
                    value={settingsJson}
                    onChange={e => setSettingsJson(e.target.value)}
                    placeholder="Click Reload to load current settings..."
                    spellCheck={false}
                  />
                </div>
              )}

            </div>
          </motion.div>

          {/* Danger zone */}
          <motion.div className="st-section" {...anim(0.17)}>
            <div className="st-section-label" style={{ color: '#ef4444' }}><RotateCcw size={12} /> Danger Zone</div>
            <div className="st-card">
              <div className="st-backup-row">
                <div className="st-backup-icon" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  <RotateCcw size={16} />
                </div>
                <div className="st-backup-info">
                  <span className="st-backup-title">Reset All Settings</span>
                  <span className="st-backup-desc">Clear all preferences, theme, wallpaper and tweaks</span>
                </div>
                <motion.button
                  className="st-danger-btn"
                  onClick={handleResetSettings}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                >
                  <RotateCcw size={13} />
                  {resetStatus === 'done' ? 'Resetting...' : 'Reset'}
                </motion.button>
              </div>
            </div>
          </motion.div>

        </div>{/* settings-main */}
      </div>{/* settings-layout */}
    </div>
  );
}
