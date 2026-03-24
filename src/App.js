import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from './components/ParticleBackground';
import WallpaperBackground from './components/WallpaperBackground';
import ChangelogModal, { CHANGELOG } from './components/ChangelogModal';
import { PremiumProvider, usePremium } from './context/PremiumContext';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
const HomePage = lazy(() => import('./pages/HomePage'));
const OptimizePage = lazy(() => import('./pages/OptimizePage'));
const GeneralPage = lazy(() => import('./pages/GeneralPage'));
const LatencyPage = lazy(() => import('./pages/LatencyPage'));
const NvidiaPage = lazy(() => import('./pages/NvidiaPage'));
const GpuPage = lazy(() => import('./pages/GpuPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const AppBoosterPage = lazy(() => import('./pages/AppBoosterPage'));
const PowerPlanPage = lazy(() => import('./pages/PowerPlanPage'));
const CleanerPage = lazy(() => import('./pages/CleanerPage'));
const NetworkScriptsPage = lazy(() => import('./pages/NetworkScriptsPage'));
const RegistryPage = lazy(() => import('./pages/RegistryPage'));
const StartupPage = lazy(() => import('./pages/StartupPage'));
const ProcessPage = lazy(() => import('./pages/ProcessPage'));
const RestorePage = lazy(() => import('./pages/RestorePage'));
const DebloatPage = lazy(() => import('./pages/DebloatPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PremiumPage = lazy(() => import('./pages/PremiumPage'));
const ProDashboard = lazy(() => import('./pages/ProDashboard'));
import { getIncompatibleTweaks } from './utils/compatibilityRules';
import './App.css';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = {
  duration: 0.12,
};

function SplashScreen() {
  return (
    <motion.div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080808', gap: 28 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        {/* Outer spinning ring */}
        <motion.div
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#e03030', borderRightColor: 'rgba(224,48,48,0.3)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
        />
        {/* Inner pulsing glow ring */}
        <motion.div
          style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'rgba(224,48,48,0.08)', border: '1px solid rgba(224,48,48,0.2)' }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Center icon */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={22} style={{ color: '#e03030', filter: 'drop-shadow(0 0 10px #e03030)' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <motion.span
          style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 3, textTransform: 'uppercase' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >LCTRON</motion.span>
        <motion.span
          style={{ fontSize: 11, color: '#444', letterSpacing: 1 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.35 }}
        >Loading...</motion.span>
      </div>
      {/* Progress bar */}
      <motion.div
        style={{ width: 160, height: 2, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          style={{ height: '100%', background: 'linear-gradient(90deg, #e03030, #ff6060)', borderRadius: 2, boxShadow: '0 0 8px #e03030' }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.8, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  return (
    <PremiumProvider>
      <AppInner />
    </PremiumProvider>
  );
}

function AppInner() {
  const { refreshPremium, clearPremium } = usePremium();
  const [activePage, setActivePage] = useState('home');
  const [systemInfo, setSystemInfo] = useState(null);
  const [tweakStates, setTweakStates] = useState({});
  const [toasts, setToasts] = useState([]);
  const [systemProfile, setSystemProfile] = useState(null);
  const [profileScanning, setProfileScanning] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('lctron-theme') || 'red');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [currentParticle, setCurrentParticle] = useState(() => localStorage.getItem('lctron-particle') || 'none');
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelogVersion, setChangelogVersion] = useState('');
  const [currentWallpaper, setCurrentWallpaper] = useState(() => {
    const saved = localStorage.getItem('lctron-wallpaper') || 'none';
    if (saved.startsWith('gif-')) { localStorage.setItem('lctron-wallpaper', 'aurora'); return 'aurora'; }
    return saved;
  });
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState(() => localStorage.getItem('lctron-wallpaper-custom') || '');
  const [appReady, setAppReady] = useState(false);

  const THEME_ACCENT_MAP = {
    red: '#e03030', blue: '#3b82f6', purple: '#8b5cf6', green: '#22c55e',
    orange: '#f97316', cyan: '#06b6d4', pink: '#ec4899', gold: '#f59e0b',
    lime: '#84cc16', indigo: '#6366f1', rose: '#f43f5e', teal: '#14b8a6',
    amber: '#d97706', violet: '#7c3aed', emerald: '#10b981', magenta: '#d946ef',
    slate: '#64748b', zinc: '#a1a1aa',
  };
  const accentColor = THEME_ACCENT_MAP[currentTheme] || '#e03030';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme === 'red' ? '' : currentTheme);
    localStorage.setItem('lctron-theme', currentTheme);
  }, [currentTheme]);

  const handleCheckUpdate = () => {
    setUpdateStatus('checking');
    window.electronAPI?.checkForUpdates();
  };

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    let fallbackTimer = null;
    const unsub = window.electronAPI.onUpdateStatus((data) => {
      setUpdateStatus(data.status);
      if (data.status === 'available') {
        setUpdateAvailable(true);
        if (data.version) setUpdateVersion(data.version);
      }
      if (data.status === 'downloading' && data.percent !== undefined) {
        const pct = Math.round(data.percent);
        setDownloadPercent(pct);
        if (pct >= 100) {
          clearTimeout(fallbackTimer);
          fallbackTimer = setTimeout(() => setUpdateDownloaded(prev => prev || true), 2000);
        }
      }
      if (data.status === 'downloaded') {
        clearTimeout(fallbackTimer);
        setUpdateDownloaded(true);
        if (data.version) setUpdateVersion(data.version);
      }
    });
    handleCheckUpdate();
    return () => { if (unsub) unsub(); clearTimeout(fallbackTimer); };
  }, []);

  useEffect(() => {
    if (currentWallpaper && currentWallpaper !== 'none') {
      document.body.classList.add('has-wallpaper');
    } else {
      document.body.classList.remove('has-wallpaper');
    }
  }, [currentWallpaper]);

  const handleThemeChange = (themeId) => setCurrentTheme(themeId);

  const handleParticleChange = (particleId) => {
    setCurrentParticle(particleId);
    localStorage.setItem('lctron-particle', particleId);
  };

  const handleWallpaperChange = (wallpaperId, url) => {
    setCurrentWallpaper(wallpaperId);
    localStorage.setItem('lctron-wallpaper', wallpaperId);
    if (url !== undefined) {
      setCustomWallpaperUrl(url);
      localStorage.setItem('lctron-wallpaper-custom', url);
    }
  };

  const handleLogout = async () => {
    if (window.electronAPI) await window.electronAPI.logoutUser();
    setLoggedInUser(null);
    clearPremium();
  };

  useEffect(() => {
    if (loggedInUser?.email) {
      refreshPremium(loggedInUser.email);
    }
  }, [loggedInUser?.email]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSavedUser().then(user => {
        if (user) setLoggedInUser(user);
        setAuthChecked(true);
      }).catch(() => setAuthChecked(true));
      window.electronAPI.loadSettings().then(saved => {
        if (saved && saved.tweakStates) setTweakStates(saved.tweakStates);
        setSettingsLoaded(true);
        setTimeout(() => setAppReady(true), 200);
      }).catch(() => { setSettingsLoaded(true); setAppReady(true); });
      window.electronAPI.getSystemInfo().then(info => setSystemInfo(info));
      window.electronAPI.getAppVersion().then(v => {
        if (!v) return;
        const seen = localStorage.getItem('lctron-seen-version');
        const hasEntry = CHANGELOG.some(c => c.version === v);
        if (seen !== v && hasEntry) {
          setChangelogVersion(v);
          setShowChangelog(true);
        }
      }).catch(() => {});
      window.electronAPI.getSystemProfile().then(profile => {
        setSystemProfile(profile);
        setProfileScanning(false);
      }).catch(() => setProfileScanning(false));
    } else {
      setAuthChecked(true);
      setSettingsLoaded(true);
      setTimeout(() => setAppReady(true), 300);
      setSystemInfo({
        cpu: '12th Gen Intel Core i5-12400',
        cpuCores: 6, cpuThreads: 12, cpuSpeed: '4.4 GHz', cpuLoad: 23,
        gpu: 'NVIDIA GeForce GTX 1650',
        gpuVram: '4 GB', gpuDriver: '31.0.15.3623',
        ramTotal: 16, ramUsed: 8.6,
        diskCapacity: 464, diskFree: 224,
        totalDisk: 928, freeDisk: 412,
        osName: 'Windows 11 Pro', osBuild: '22631',
        uptime: '2d 4h 17m',
        audioDevice: 'Realtek High Definition Audio',
        battPct: -1, battCharging: false,
        netAdapter: 'Intel Wi-Fi 6 AX201', netSpeed: '1000 Mbps',
      });
      setSystemProfile({ isNvidia: true, isAmd: false, isIntelGpu: true, isIntelCpu: true, isLaptop: false, isWin11: true, hasWifi: true, hasBt: true, hasHyperV: false, ramGB: 16, hasTouch: false });
      setProfileScanning(false);
    }
  }, []);

  const incompatibleTweaks = useMemo(() => getIncompatibleTweaks(systemProfile), [systemProfile]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleTweakToggle = useCallback(async (tweakId, enabled) => {
    setTweakStates(prev => ({ ...prev, [tweakId]: { ...prev[tweakId], loading: true } }));
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.applyTweak(tweakId, enabled);
        if (result.success) {
          setTweakStates(prev => {
            const next = { ...prev, [tweakId]: { enabled, loading: false } };
            window.electronAPI.loadSettings().then(existing => {
              window.electronAPI.saveSettings({ ...existing, tweakStates: next });
            });
            return next;
          });
          addToast('Tweak applied successfully', 'success');
        } else {
          setTweakStates(prev => ({ ...prev, [tweakId]: { ...prev[tweakId], loading: false } }));
          addToast(`Error: ${result.error}`, 'error');
        }
      } else {
        setTimeout(() => {
          setTweakStates(prev => ({ ...prev, [tweakId]: { enabled, loading: false } }));
          addToast('Tweak simulated (dev mode)', 'info');
        }, 600);
      }
    } catch (e) {
      setTweakStates(prev => ({ ...prev, [tweakId]: { ...prev[tweakId], loading: false } }));
      addToast(`Error: ${e.message}`, 'error');
    }
  }, [addToast]);

  // Parse category from page IDs like 'optimize?cat=Main'
  const optimizeCat = activePage.startsWith('optimize?cat=')
    ? activePage.replace('optimize?cat=', '')
    : null;
  const resolvedPage = optimizeCat ? 'optimize' : activePage;

  const pageElement = useMemo(() => {
    switch (resolvedPage) {
      case 'home': return <HomePage systemInfo={systemInfo} setActivePage={setActivePage} tweakStates={tweakStates} onToggle={handleTweakToggle} systemProfile={systemProfile} addToast={addToast} loggedInUser={loggedInUser} />;
      case 'optimize': return <OptimizePage tweakStates={tweakStates} onToggle={handleTweakToggle} incompatibleTweaks={incompatibleTweaks} initialCategory={optimizeCat || 'All'} setActivePage={setActivePage} />;
      case 'general': return <GeneralPage tweakStates={tweakStates} onToggle={handleTweakToggle} incompatibleTweaks={incompatibleTweaks} setActivePage={setActivePage} />;
      case 'latency': return <LatencyPage tweakStates={tweakStates} onToggle={handleTweakToggle} incompatibleTweaks={incompatibleTweaks} />;
      case 'nvidia': return <NvidiaPage tweakStates={tweakStates} onToggle={handleTweakToggle} incompatibleTweaks={incompatibleTweaks} />;
      case 'gpu': return <GpuPage tweakStates={tweakStates} onToggle={handleTweakToggle} incompatibleTweaks={incompatibleTweaks} />;
      case 'services': return <ServicesPage tweakStates={tweakStates} onToggle={handleTweakToggle} incompatibleTweaks={incompatibleTweaks} />;
      case 'booster': return <AppBoosterPage addToast={addToast} />;
      case 'powerplan': return <PowerPlanPage addToast={addToast} />;
      case 'cleaner': return <CleanerPage addToast={addToast} />;
      case 'netscripts': return <NetworkScriptsPage addToast={addToast} setActivePage={setActivePage} />;
      case 'registry': return <RegistryPage addToast={addToast} />;
      case 'startup': return <StartupPage addToast={addToast} />;
      case 'processes': return <ProcessPage addToast={addToast} />;
      case 'restore': return <RestorePage addToast={addToast} setActivePage={setActivePage} />;
      case 'debloat': return <DebloatPage addToast={addToast} />;
      case 'appsettings': return <SettingsPage loggedInUser={loggedInUser} onLogout={handleLogout} currentTheme={currentTheme} onThemeChange={handleThemeChange} currentParticle={currentParticle} onParticleChange={handleParticleChange} currentWallpaper={currentWallpaper} onWallpaperChange={handleWallpaperChange} customWallpaperUrl={customWallpaperUrl} setActivePage={setActivePage} updateStatus={updateStatus} updateVersion={updateVersion} downloadPercent={downloadPercent} updateDownloaded={updateDownloaded} onCheckUpdate={handleCheckUpdate} />;
      case 'premium': return <PremiumPage />;
      case 'prodashboard': return <ProDashboard addToast={addToast} setActivePage={setActivePage} />;
      default: return null;
    }
  }, [resolvedPage, optimizeCat, systemInfo, tweakStates, systemProfile, incompatibleTweaks, loggedInUser, currentTheme, currentParticle, currentWallpaper, customWallpaperUrl, updateStatus, updateVersion, downloadPercent, updateDownloaded]);

  if (!authChecked) return (
    <div className="app-container">
      <TitleBar />
      <SplashScreen />
    </div>
  );

  if (updateAvailable) return (
    <div className="app-container">
      <TitleBar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', flexDirection: 'column', gap: 0 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '40px 48px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, maxWidth: 420, width: '100%', textAlign: 'center' }}
        >
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(224,48,48,0.12)', border: '1px solid rgba(224,48,48,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={24} style={{ color: '#e03030' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Update Required</span>
            <span style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
              A new version of Lctron Optimizer is available.<br />
              You must update to <strong style={{ color: '#fff' }}>v{updateVersion}</strong> to continue using the app.
            </span>
          </div>
          {!updateDownloaded ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
              <div style={{ width: '100%', height: 6, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', background: '#e03030', borderRadius: 3 }}
                  animate={{ width: `${downloadPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span style={{ fontSize: 12, color: '#555' }}>Downloading update... {downloadPercent}%</span>
            </div>
          ) : (
            <motion.button
              onClick={() => window.electronAPI?.installUpdate()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ padding: '10px 28px', background: 'rgba(224,48,48,0.12)', border: '1px solid rgba(224,48,48,0.4)', borderRadius: 10, color: '#e03030', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Zap size={14} /> Restart &amp; Install v{updateVersion}
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );

  if (!loggedInUser) return (
    <div className="app-container">
      <TitleBar />
      <LoginPage onLogin={(user) => setLoggedInUser(user)} />
    </div>
  );

  return (
    <motion.div
      className="app-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: appReady ? 1 : 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <WallpaperBackground type={currentWallpaper} customUrl={customWallpaperUrl} />
      <ParticleBackground type={currentParticle} accentColor={accentColor} />
      {showChangelog && (
        <ChangelogModal
          version={changelogVersion}
          onClose={() => {
            setShowChangelog(false);
            localStorage.setItem('lctron-seen-version', changelogVersion);
          }}
        />
      )}
      <TitleBar />
      {profileScanning && (
        <div className="profile-scan-overlay">
          <div className="profile-scan-box">
            <div className="profile-scan-spinner" />
            <span>Scanning your system for compatible optimizations...</span>
          </div>
        </div>
      )}
      <div className="app-body">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={resolvedPage + (optimizeCat || '')}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              style={{ height: '100%', width: '100%' }}
            >
              <Suspense fallback={<div style={{ height: '100%' }} />}>
                {pageElement}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              className={`toast toast-${toast.type}`}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <span className="toast-dot" />
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
