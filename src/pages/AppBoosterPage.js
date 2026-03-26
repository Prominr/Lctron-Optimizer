import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Plus, Trash2, Zap, Wifi, Cpu, Monitor, CheckCircle, Search, Gamepad2, RefreshCw, ChevronLeft, Settings, Target, Flame, Save, FolderOpen, BrainCircuit, Lightbulb, AlertTriangle, Crown, Lock, TrendingDown, Activity, Info, ScanLine, Sparkles } from 'lucide-react';
import { usePremium } from '../context/PremiumContext';
import PageHeader from '../components/PageHeader';
import './AppBoosterPage.css';
import './PageSidebar.css';

const STEAM_HDR = (id) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`;

// Tweaks available to free (basic) users
const BASIC_FREE_KEYS = new Set([
  'disableCO','optimizeDSCP','optimizePriority','optimizeIO',
  'optimizeScheduler','disablePowerThrottling','disableIdleTasks',
  'clearRAM','trimWorkingSet',
  'optimizeGpuDriver','enableHags',
  'optimizeTcpIp','disableNagle','optimizeDns','setQosPriority',
  'disableFullscreenOpt','disableGameBar','disableXboxServices','disableAnimations',
  'gameMode','highPerfMode','disableBackgroundApps',
  'optimizeAudio','disableAudioEnhancements',
  'fixLagSpikes','antiMicrostutter','reducePingSpikes',
]);

const GAME_DB = [
  { name: 'Fortnite',            exe: 'FortniteClient-Win64-Shipping.exe', path: 'C:\\Program Files\\Epic Games\\Fortnite\\FortniteGame\\Binaries\\Win64\\FortniteClient-Win64-Shipping.exe', logo: 'https://cdn2.unrealengine.com/fortnite-chapter-4-keyart-full-bleed-1920x1080-1920x1080-9b4611fcf587.jpg', emoji: '🎮', publisher: 'Epic Games' },
  { name: 'Roblox',              exe: 'RobloxPlayerBeta.exe',              path: 'C:\\Users\\User\\AppData\\Local\\Roblox\\Versions\\RobloxPlayerBeta.exe',                                   logo: 'https://images.rbxcdn.com/91bcdef49b8cbeefd39c5bc3a628f0ec.png', emoji: '🧱', publisher: 'Roblox' },
  { name: 'Minecraft',           exe: 'javaw.exe',                         path: 'C:\\Program Files (x86)\\Minecraft Launcher\\javaw.exe',                                                      logo: 'https://www.minecraft.net/content/dam/games/minecraft/logos/Logo_Merchandise_Transparent.png', emoji: '⛏️', publisher: 'Mojang' },
  { name: 'Valorant',            exe: 'VALORANT-Win64-Shipping.exe',       path: 'C:\\Riot Games\\VALORANT\\live\\ShooterGame\\Binaries\\Win64\\VALORANT-Win64-Shipping.exe',                  logo: 'https://www.riotgames.com/darkroom/576/valorant-702x336:41b9b3db46c0e1d0da2963bd66b8a07d.jpg', emoji: '🔫', publisher: 'Riot Games' },
  { name: 'League of Legends',   exe: 'League of Legends.exe',             path: 'C:\\Riot Games\\League of Legends\\Game\\League of Legends.exe',                                             logo: 'https://www.riotgames.com/darkroom/576/lol-702x336:df9c8e1840cf0dd6f5e8e0e64abdc2d9.jpg', emoji: '⚔️', publisher: 'Riot Games' },
  { name: 'CS2',                 exe: 'cs2.exe',                           path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\bin\\win64\\cs2.exe', logo: STEAM_HDR(730), emoji: '💣', publisher: 'Valve' },
  { name: 'Apex Legends',        exe: 'r5apex.exe',                        path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Apex Legends\\r5apex.exe',                                logo: STEAM_HDR(1172470), emoji: '🏹', publisher: 'EA' },
  { name: 'Overwatch 2',         exe: 'Overwatch.exe',                     path: 'C:\\Program Files (x86)\\Overwatch\\Overwatch.exe',                                                           logo: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt2dec521e3616d55a/Overwatch_Keyart_Horizontal.jpg', emoji: '🦸', publisher: 'Blizzard' },
  { name: 'GTA V',               exe: 'GTA5.exe',                          path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Grand Theft Auto V\\GTA5.exe',                            logo: STEAM_HDR(271590), emoji: '🚗', publisher: 'Rockstar' },
  { name: 'Cyberpunk 2077',      exe: 'Cyberpunk2077.exe',                 path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe',             logo: STEAM_HDR(1091500), emoji: '🤖', publisher: 'CD Projekt Red' },
  { name: 'Elden Ring',          exe: 'eldenring.exe',                     path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\ELDEN RING\\Game\\eldenring.exe',                         logo: STEAM_HDR(1245620), emoji: '🗡️', publisher: 'FromSoftware' },
  { name: 'Rocket League',       exe: 'RocketLeague.exe',                  path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\rocketleague\\Binaries\\Win64\\RocketLeague.exe',          logo: STEAM_HDR(252950), emoji: '🚀', publisher: 'Psyonix' },
  { name: 'Dota 2',              exe: 'dota2.exe',                         path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\dota 2 beta\\game\\bin\\win64\\dota2.exe',                logo: STEAM_HDR(570), emoji: '⚔️', publisher: 'Valve' },
  { name: 'PUBG',                exe: 'TslGame.exe',                       path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\PUBG\\TslGame\\Binaries\\Win64\\TslGame.exe',             logo: STEAM_HDR(578080), emoji: '🎯', publisher: 'Krafton' },
  { name: 'Discord',             exe: 'Discord.exe',                       path: 'C:\\Users\\User\\AppData\\Local\\Discord\\app-1.0.9035\\Discord.exe',                                        logo: 'https://logo.clearbit.com/discord.com', emoji: '💬', publisher: 'Discord', isApp: true },
  { name: 'Chrome',              exe: 'chrome.exe',                        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',                                                  logo: 'https://logo.clearbit.com/google.com', emoji: '🌐', publisher: 'Google', isApp: true },
  { name: 'OBS Studio',          exe: 'obs64.exe',                         path: 'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',                                                        logo: 'https://logo.clearbit.com/obsproject.com', emoji: '📹', publisher: 'OBS Project', isApp: true },
  { name: 'Spotify',             exe: 'Spotify.exe',                       path: 'C:\\Users\\User\\AppData\\Roaming\\Spotify\\Spotify.exe',                                                     logo: 'https://logo.clearbit.com/spotify.com', emoji: '🎵', publisher: 'Spotify', isApp: true },
];

const DEFAULT_BASIC = {
  // Core (safe, auto-on)
  disableCO: true, optimizeDSCP: true, optimizePriority: true, optimizeIO: true,
  disablePowerThrottling: true, disableIdleTasks: true, optimizeScheduler: true,
  // Memory
  clearRAM: true, trimWorkingSet: false, disablePaging: false, largePages: false,
  // CPU
  disableCpuParking: true,
  disableHyperThreading: false, disableSmt: false, cpuAffinity: false, boostCpuClock: false,
  // GPU
  disableMpo: true,
  optimizeGpuDriver: true, enableHags: true, optimizeShaderCache: true, optimizeFramePacing: true,
  gpuBoost: false, disableGpuTimeout: false, setGpuPowerMode: false,
  disableGpuRecovery: false, setGpuPreemption: false, disableGpuScalling: false,
  // Network (safe subset only)
  optimizeTcpIp: true, disableNagle: true, setQosPriority: true,
  optimizeDns: false, optimizeTcpWindow: false, disableTcpAutoTuning: false, optimizeNetworkBuffer: false,
  setDnsCache: false, disableLso: false, optimizeAckFrequency: false, optimizeTcpStack: false,
  // Windows
  disableFullscreenOpt: true, disableGameBar: true, disableXboxServices: false,
  disableTelemetry: false, disableDiagnostics: false, disableCompatTelemetry: false,
  disableAnimations: true, disableWindowsInk: false, disableFax: false, disableSmartCard: false,
  disableDefender: false, disableSysMain: false, disableSearchIndexing: false,
  disableWindowsUpdate: false, disableIndexing: false,
  disableLocation: false, disableCamera: false, disableMicrophone: false,
  disablePrintSpooler: false, disableBluetooth: false, disableBiometrics: false,
  // Advanced (safe only)
  optimizeInterrupts: false, setTimerResolution: false, disableHpet: false, disableCStates: false,
  // Storage
  optimizeSsd: true, trimDisks: false, disableWriteCache: false,
  // Display
  disableVsync: false, setRefreshRate: false,
  // Audio
  optimizeAudio: true, disableAudioEnhancements: false,
  // Registry
  optimizeRegistry: false, disablePrefetch: false,
  // Game
  gameMode: true, highPerfMode: true, disableBackgroundApps: true,
  // System advanced
  optimizeBootPerformance: false, disableStartupDelay: false, optimizeKernelMode: false,
  disableSystemRestore: false, disableFileHistory: false, disableDefenderCloud: false,
  // Roblox
  robloxGpuBoost: false, robloxNetworkOpt: false, robloxCpuBoost: false,
  // Anti-Lag
  fixLagSpikes: true, antiMicrostutter: true, reducePingSpikes: true,
};
const DEFAULT_CUSTOM = {
  // Core performance
  disableCO: true, optimizeDSCP: true, optimizePriority: true, optimizeIO: true,
  // Memory optimizations
  clearRAM: false, disablePaging: false, largePages: false, trimWorkingSet: false,
  // CPU optimizations
  disableCpuParking: false,
  disableHyperThreading: false, disableSmt: false, cpuAffinity: false, boostCpuClock: false,
  // GPU optimizations
  disableMpo: false,
  gpuBoost: false, disableGpuTimeout: false, optimizeGpuDriver: false, setGpuPowerMode: false,
  // Network optimizations
  optimizeTcpIp: false, disableNagle: false, optimizeDns: false, setQosPriority: false,
  // System optimizations
  disablePowerThrottling: false, disableIdleTasks: false, optimizeScheduler: false,
  // Windows optimizations
  disableFullscreenOpt: false, disableGameBar: false, disableXboxServices: false,
  disableSearchIndexing: false, disableDefender: false, disableTelemetry: false,
  disableSysMain: false, disableDiagnostics: false,
  // Advanced optimizations
  disableHpet: false, disableCStates: false, optimizeInterrupts: false, setTimerResolution: false,
  // Storage optimizations
  optimizeSsd: false, disableWriteCache: false, trimDisks: false,
  // Display optimizations
  disableVsync: false, setRefreshRate: false, disableAnimations: false,
  // Audio optimizations
  optimizeAudio: false, disableAudioEnhancements: false,
  // Registry optimizations
  optimizeRegistry: false, disablePrefetch: false, optimizeTcpStack: false,
  // Roblox specific optimizations
  robloxGpuBoost: false, robloxNetworkOpt: false, robloxCpuBoost: false,
  // Anti-Lag
  fixLagSpikes: false, antiMicrostutter: false, reducePingSpikes: false,
  // Game specific optimizations
  gameMode: false, highPerfMode: false, disableBackgroundApps: false,
  // Additional system optimizations
  disableWindowsUpdate: false, disableIndexing: false, disableCompatTelemetry: false,
  disableLocation: false, disableCamera: false, disableMicrophone: false,
  disablePrintSpooler: false, disableFax: false, disableBluetooth: false,
  disableSmartCard: false, disableBiometrics: false, disableWindowsInk: false,
  // Network advanced optimizations
  optimizeTcpWindow: false, disableTcpAutoTuning: false, optimizeNetworkBuffer: false,
  setDnsCache: false, disableLso: false, optimizeAckFrequency: false,
  // Graphics advanced optimizations
  enableHags: false, optimizeShaderCache: false, disableGpuRecovery: false,
  setGpuPreemption: false, optimizeFramePacing: false, disableGpuScalling: false,
  // System advanced optimizations
  disableSystemRestore: false, disableFileHistory: false, disableDefenderCloud: false,
  optimizeBootPerformance: false, disableStartupDelay: false, optimizeKernelMode: false,
};

function GameArt({ logo, emoji, name, size = 'card' }) {
  const [failed, setFailed] = React.useState(false);
  const isIcon = logo && logo.startsWith('data:');
  if (logo && !failed) {
    if (isIcon) {
      return (
        <div className={`game-art-icon-wrap game-art-${size}`}>
          <img
            src={logo}
            alt={name}
            className="game-art-icon-img"
            onError={() => setFailed(true)}
            draggable={false}
          />
          <span className="game-art-icon-label">{name}</span>
        </div>
      );
    }
    return (
      <img
        src={logo}
        alt={name}
        className={`game-art-img game-art-${size}`}
        onError={() => setFailed(true)}
        draggable={false}
      />
    );
  }
  return <div className={`game-art-fallback game-art-${size}`}>{emoji || '⚡'}</div>;
}

function LockedRow({ label, desc, tag }) {
  return (
    <div className="ab-row ab-row-locked">
      <div className="ab-row-info">
        <span className="ab-row-label">{label}</span>
        {tag && <span className="ab-pro-tag"><Crown size={8} /> PRO</span>}
        {desc && <span className="ab-row-desc">{desc}</span>}
      </div>
      <div className="ab-lock-icon"><Lock size={12} /></div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button className={`ab-toggle ${checked ? 'on' : 'off'}`} onClick={() => onChange(!checked)}>
      <span className="ab-toggle-thumb" />
    </button>
  );
}

function BoostRow({ label, desc, checked, onChange, recommended, risky }) {
  return (
    <div className="ab-row ab-row-free">
      <div className="ab-row-info">
        <span className="ab-row-label">{label}</span>
        {recommended && <span className="ab-recommended"><Gamepad2 size={9} /> Recommended</span>}
        {risky && <span className="ab-risky"><AlertTriangle size={9} /> Use Caution</span>}
        {desc && <span className="ab-row-desc">{desc}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

const BOOST_STAGES = [
  { label: 'Elevating process priority', icon: Cpu },
  { label: 'Optimizing GPU scheduling', icon: Monitor },
  { label: 'Setting DSCP / QoS tags', icon: Wifi },
  { label: 'Boosting I/O priority', icon: Zap },
  { label: 'Disabling power throttle', icon: Flame },
  { label: 'Clearing RAM & memory', icon: BrainCircuit },
  { label: 'Applying CPU optimizations', icon: Settings },
  { label: 'Fixing lag spikes & stutter', icon: Activity },
  { label: 'Minimizing ping & latency', icon: TrendingDown },
  { label: 'Maximizing FPS output', icon: Rocket },
];

const SCAN_STAGES = [
  { label: 'Analyzing executable', icon: Search },
  { label: 'Detecting game engine', icon: Cpu },
  { label: 'Scanning system resources', icon: Monitor },
  { label: 'Building recommendations', icon: Lightbulb },
];

const GAME_PROFILES = {
  fps: {
    label: 'Competitive FPS', icon: '🎯', color: '#e03030',
    desc: 'Tuned for lowest latency, max FPS, and zero lag spikes.',
    highlights: ['Disable MPO — kills DX11/12 stutter','Disable CPU parking — all cores active','Disable Nagle — min network latency','Realtime CPU priority','0.5ms timer resolution','Disable fullscreen optimizations','GPU driver + HAGS optimization'],
    tweaks: { disableMpo:true,disableCpuParking:true,setTimerResolution:true,disableNagle:true,setQosPriority:true,disableGameBar:true,disableFullscreenOpt:true,highPerfMode:true,fixLagSpikes:true,antiMicrostutter:true,reducePingSpikes:true,clearRAM:true,optimizePriority:true,disablePowerThrottling:true,optimizeTcpIp:true,optimizeGpuDriver:true,disableAnimations:true,optimizeScheduler:true,optimizeInterrupts:true },
  },
  moba: {
    label: 'MOBA', icon: '⚔️', color: '#a78bfa',
    desc: 'Stable FPS and consistent network for MOBA matches.',
    highlights: ['Network QoS for stable ping','CPU thread optimization','Disable background apps','Fix lag spikes','Game Mode enabled','Disable Game Bar overlay'],
    tweaks: { disableMpo:true,disableCpuParking:true,setQosPriority:true,gameMode:true,disableGameBar:true,disableBackgroundApps:true,fixLagSpikes:true,antiMicrostutter:true,optimizePriority:true,optimizeDns:true,highPerfMode:true,disableXboxServices:true,clearRAM:true,optimizeScheduler:true,optimizeNetworkBuffer:true },
  },
  br: {
    label: 'Battle Royale', icon: '🏆', color: '#f59e0b',
    desc: 'Max FPS and low ping for fast-paced battle royale games.',
    highlights: ['TCP/IP network optimization','Reduce ping spikes','GPU driver optimization','RAM trim on start','Disable background services','Max performance power plan'],
    tweaks: { disableMpo:true,disableCpuParking:true,optimizeTcpIp:true,disableNagle:true,reducePingSpikes:true,optimizeGpuDriver:true,clearRAM:true,trimWorkingSet:true,highPerfMode:true,disableGameBar:true,disableFullscreenOpt:true,gameMode:true,fixLagSpikes:true,antiMicrostutter:true,optimizeInterrupts:true,disableLso:true },
  },
  openworld: {
    label: 'Open World / RPG', icon: '🗺️', color: '#22c55e',
    desc: 'Smooth frames and fast loading for open world games.',
    highlights: ['Anti micro-stutter for smooth frames','RAM clear & trim','SSD I/O optimization','GPU frame pacing','Disable idle tasks','High Performance plan'],
    tweaks: { disableMpo:true,disableCpuParking:true,antiMicrostutter:true,clearRAM:true,trimWorkingSet:true,optimizeSsd:true,optimizeGpuDriver:true,highPerfMode:true,disableIdleTasks:true,gameMode:true,disableBackgroundApps:true,disableAnimations:true,fixLagSpikes:true,optimizeKernelMode:true,disablePrefetch:true },
  },
  roblox: {
    label: 'Roblox', icon: '🧱', color: '#06b6d4',
    desc: 'Roblox-specific engine and network optimizations.',
    highlights: ['Roblox GPU Boost enabled','Roblox network optimization','Roblox CPU Boost','Disable fullscreen optimizations','Anti lag spike fix','Game Mode + High Perf plan'],
    tweaks: { disableMpo:true,disableCpuParking:true,robloxGpuBoost:true,robloxNetworkOpt:true,robloxCpuBoost:true,disableFullscreenOpt:true,fixLagSpikes:true,gameMode:true,highPerfMode:true,optimizePriority:true,clearRAM:true,antiMicrostutter:true,setQosPriority:true,setTimerResolution:true },
  },
  app: {
    label: 'Desktop App', icon: '🖥️', color: '#06b6d4',
    desc: 'Performance tuning for productivity and background apps.',
    highlights: ['CPU priority boost','RAM working set trim','Disable power throttling','I/O priority optimization','Disable idle background tasks'],
    tweaks: { optimizePriority:true,trimWorkingSet:true,disablePowerThrottling:true,optimizeIO:true,disableIdleTasks:true,optimizeScheduler:true },
  },
  generic: {
    label: 'Game', icon: '🎮', color: '#a78bfa',
    desc: 'Balanced performance profile with all core optimizations.',
    highlights: ['Core performance tweaks','Anti-lag & micro-stutter fix','Network QoS priority','High Performance power plan','Disable Game Bar overlay','RAM optimization on launch'],
    tweaks: { disableMpo:true,disableCpuParking:true,fixLagSpikes:true,antiMicrostutter:true,reducePingSpikes:true,disableCO:true,optimizePriority:true,optimizeIO:true,highPerfMode:true,gameMode:true,disableGameBar:true,disableFullscreenOpt:true,clearRAM:true,setQosPriority:true,optimizeGpuDriver:true,optimizeScheduler:true },
  },
};

function getGameProfile(app) {
  const n = (app.name || '').toLowerCase();
  if (n.includes('roblox')) return GAME_PROFILES.roblox;
  if (n.includes('valorant') || n.includes('cs2') || n.includes('apex') || n.includes('fortnite') || n.includes('overwatch')) return GAME_PROFILES.fps;
  if (n.includes('league') || n.includes('dota') || n.includes('rocket league')) return GAME_PROFILES.moba;
  if (n.includes('pubg') || n.includes('warzone') || n.includes('battlegrounds')) return GAME_PROFILES.br;
  if (n.includes('gta') || n.includes('cyberpunk') || n.includes('elden ring') || n.includes('minecraft') || n.includes('witcher')) return GAME_PROFILES.openworld;
  if (app.isApp) return GAME_PROFILES.app;
  return GAME_PROFILES.generic;
}

export default function AppBoosterPage({ addToast }) {
  const [apps, setApps] = useState([]);
  const [selected, setSelected] = useState(null); // app id currently in config view
  const [configTab, setConfigTab] = useState('basic'); // 'basic' | 'custom' | 'focus'
  const [appConfigs, setAppConfigs] = useState({}); // per-app config overrides
  const [boosting, setBoosting] = useState(null);
  const [boostStage, setBoostStage] = useState(0);
  const [boosted, setBoosted] = useState({});
  const [detecting, setDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusActive, setFocusActive] = useState({});
  const [runningApps, setRunningApps] = useState(new Set());
  const runCheckRef = useRef(null);
  const [scanState, setScanState] = useState(null);

  useEffect(() => {
    const checkRunning = async () => {
      if (!window.electronAPI?.getProcesses) return;
      try {
        const res = await window.electronAPI.getProcesses();
        const procs = res.procs || [];
        const procNames = new Set(procs.map(p => (p.Name || '').toLowerCase()));
        setApps(current => {
          const running = new Set();
          for (const app of current) {
            const exeName = (app.exe || app.path?.split('\\').pop() || '').toLowerCase();
            if (exeName && procNames.has(exeName.replace('.exe', ''))) running.add(app.id);
          }
          setRunningApps(running);
          return current;
        });
      } catch {}
    };
    checkRunning();
    runCheckRef.current = setInterval(checkRunning, 3000);
    return () => clearInterval(runCheckRef.current);
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.loadSettings().then(saved => {
      if (saved?.appConfigs) setAppConfigs(saved.appConfigs);
      if (saved?.boosterApps?.length > 0) {
        setApps(saved.boosterApps);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line

  const saveApps = useCallback(async (newApps, newConfigs) => {
    if (!window.electronAPI) return;
    const existing = await window.electronAPI.loadSettings().catch(() => ({}));
    window.electronAPI.saveSettings({ ...existing, boosterApps: newApps, appConfigs: newConfigs ?? appConfigs });
  }, [appConfigs]);

  const addEntry = useCallback((entry) => {
    setApps(prev => {
      if (prev.find(a => a.path === entry.path)) return prev;
      const newApps = [...prev, entry];
      saveApps(newApps);
      return newApps;
    });
  }, [saveApps]);

  const startScan = useCallback((entry) => {
    setScanState({ app: entry, stageIdx: 0, done: false, profile: null });
    let i = 0;
    const tick = setInterval(() => {
      i++;
      if (i >= SCAN_STAGES.length) {
        clearInterval(tick);
        const profile = getGameProfile(entry);
        setScanState(prev => prev ? { ...prev, stageIdx: SCAN_STAGES.length - 1, done: true, profile } : prev);
      } else {
        setScanState(prev => prev ? { ...prev, stageIdx: i } : prev);
      }
    }, 620);
  }, []);

  const applyScanRecommendations = useCallback((app, profile) => {
    setAppConfigs(prev => {
      const existing = prev[app.id] || { basic: { ...DEFAULT_BASIC }, custom: { ...DEFAULT_CUSTOM } };
      const newBasic = { ...existing.basic, ...profile.tweaks };
      const next = { ...prev, [app.id]: { ...existing, basic: newBasic } };
      saveApps(apps, next);
      return next;
    });
    setScanState(null);
    setSelected(app.id);
    setConfigTab('basic');
    addToast(`Smart settings applied for ${app.name}!`, 'success');
  }, [apps, saveApps, addToast]);

  const handleRemoveAll = () => {
    if (window.confirm(`Remove all ${apps.length} programs from the library?`)) {
      saveApps([]);
      setApps([]);
      setSelected(null);
      addToast('Library cleared', 'success');
    }
  };

  const handleAddApp = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.browseExe();
      if (filePath) {
        const exeName = filePath.split('\\').pop();
        const name = exeName.replace('.exe', '');
        const known = GAME_DB.find(g => g.exe.toLowerCase() === exeName.toLowerCase());
        let logo = known?.logo || null;
        if (!logo && window.electronAPI?.getFileIcon) {
          try { logo = await window.electronAPI.getFileIcon(filePath); } catch {}
        }
        const entry = { path: filePath, exe: exeName, name: known?.name || name, emoji: known?.emoji || '⚡', logo, publisher: known?.publisher || '', isApp: known?.isApp || false, id: Date.now(), manuallyAdded: true };
        addEntry(entry);
        startScan(entry);
      }
    } else {
      const entry = { path: `C:\\Games\\Game_${apps.length + 1}.exe`, name: `Game ${apps.length + 1}`, emoji: '🎮', publisher: 'Unknown', isApp: false, id: Date.now(), manuallyAdded: true };
      addEntry(entry);
      startScan(entry);
    }
  };

  const handleDetectReplace = async (showToast = false) => {
    setDetecting(true);
    try {
      let detected = [];
      if (window.electronAPI?.detectInstalledApps) {
        detected = await window.electronAPI.detectInstalledApps();
      }
      const detectedApps = await Promise.all(detected.map(async g => {
        let logo = g.steamAppId ? STEAM_HDR(g.steamAppId) : null;
        if (!logo && window.electronAPI?.getFileIcon) {
          try { logo = await window.electronAPI.getFileIcon(g.path); } catch {}
        }
        return { ...g, logo, id: Date.now() + Math.random() };
      }));
      setApps(prev => {
        const manualApps = prev.filter(a => a.manuallyAdded);
        const merged = [...manualApps];
        for (const app of detectedApps) {
          if (!merged.find(a => a.path?.toLowerCase() === app.path?.toLowerCase())) {
            merged.push(app);
          }
        }
        saveApps(merged);
        return merged;
      });
      if (showToast) {
        addToast(detectedApps.length > 0 ? `Found ${detectedApps.length} installed program${detectedApps.length !== 1 ? 's' : ''}` : 'No installed programs found', detectedApps.length > 0 ? 'success' : 'info');
      }
    } catch (e) {
      if (showToast) addToast('Detection failed', 'error');
    }
    setDetecting(false);
  };

  const handleDetect = () => handleDetectReplace(true);

  const handleRemove = (id) => {
    setApps(prev => {
      const next = prev.filter(a => a.id !== id);
      saveApps(next);
      return next;
    });
    if (selected === id) setSelected(null);
    setBoosted(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const getConfig = (appId) => appConfigs[appId] || { basic: { ...DEFAULT_BASIC }, custom: { ...DEFAULT_CUSTOM } };

  const updateConfig = (appId, tab, key, val) => {
    setAppConfigs(prev => {
      const cfg = { ...getConfig(appId) };
      cfg[tab] = { ...cfg[tab], [key]: val };
      const next = { ...prev, [appId]: cfg };
      saveApps(apps, next);
      return next;
    });
  };

  const handleBoost = async (app, mode = 'basic') => {
    setBoosting(app.id);
    setBoostStage(0);
    const cfg = getConfig(app.id);

    try {
      const stageAnim = (async () => {
        for (let i = 0; i < BOOST_STAGES.length; i++) {
          setBoostStage(i);
          await new Promise(r => setTimeout(r, 350));
        }
      })();

      let result;
      if (window.electronAPI) {
        if (mode === 'ultimate') {
          result = await window.electronAPI.boostFocusMode(app.path);
          const ultimateOpts = { ...cfg.basic, disableCO: true, optimizeDSCP: true, optimizePriority: true, optimizeIO: true, robloxGpuBoost: true, robloxNetworkOpt: true, robloxCpuBoost: true, ultimatePerf: true, highPerfMode: false };
          await window.electronAPI.boostAppAdvanced(app.path, ultimateOpts);
          for (const tweakId of ['pro-gpu-hwsched', 'pro-timer-res', 'pro-disable-uwp-bg']) {
            await window.electronAPI.applyTweak(tweakId, true).catch(() => {});
          }
          setFocusActive(prev => ({ ...prev, [app.id]: true }));
        } else if (mode === 'focus') {
          result = await window.electronAPI.boostFocusMode(app.path);
          setFocusActive(prev => ({ ...prev, [app.id]: true }));
        } else if (mode === 'custom') {
          result = await window.electronAPI.boostAppAdvanced(app.path, cfg.custom);
        } else {
          result = await window.electronAPI.boostAppAdvanced(app.path, cfg.basic);
        }
      } else {
        await new Promise(r => setTimeout(r, 1800));
        result = { success: true, running: true };
      }
      await stageAnim;

      if (result?.success) {
        setBoosted(prev => ({ ...prev, [app.id]: mode }));
        const msg = mode === 'ultimate'
          ? `Ultimate Boost activated for ${app.name} — all Pro optimizations applied`
          : mode === 'focus'
            ? `Focus Mode activated for ${app.name} — background apps killed`
            : result.running
              ? `${app.name} boosted!`
              : `${app.name} configured — launch to apply`;
        addToast(msg, 'success');
      } else {
        addToast(`Boost failed: ${result?.error || 'Unknown error'}`, 'error');
      }
    } catch (e) {
      addToast(`Error: ${e.message}`, 'error');
    }
    setBoosting(null);
    setBoostStage(0);
  };

  const { isPremium } = usePremium();
  const selectedApp = apps.find(a => a.id === selected);
  const filteredApps = searchQuery
    ? apps.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : apps;

  if (selectedApp) {
    const cfg = getConfig(selectedApp.id);
    const isBoosting = boosting === selectedApp.id;
    const boostedMode = boosted[selectedApp.id];

    return (
      <div className="booster-page">
        <div className="ab-config-layout">
          {/* Left panel */}
          <div className="ab-config-left">
            <div className="ab-config-art-wrap">
              <GameArt logo={selectedApp.logo} emoji={selectedApp.emoji} name={selectedApp.name} size="detail" />
              <div className="ab-config-art-overlay">
                <span className="ab-config-art-name">{selectedApp.name}</span>
                {selectedApp.publisher && <span className="ab-config-art-pub">{selectedApp.publisher}</span>}
              </div>
            </div>
            <button className="ab-save-btn" onClick={() => {
              saveApps(apps, appConfigs);
              addToast('Configuration saved', 'success');
            }}>
              <Save size={13} /> Save Configuration
            </button>
            <button className="ab-delete-btn" onClick={() => handleRemove(selectedApp.id)}>
              <Trash2 size={13} /> Delete Configuration
            </button>
            <button className="ab-back-btn" onClick={() => setSelected(null)}>
              <ChevronLeft size={13} /> Back to Library
            </button>
          </div>

          {/* Right panel */}
          <div className="ab-config-right">
            <div className="ab-config-field">
              <label className="ab-field-label">Program Name</label>
              <input className="ab-field-input" value={selectedApp.name} readOnly />
            </div>
            <div className="ab-config-field">
              <label className="ab-field-label">Path to Program</label>
              <div className="ab-path-row">
                <input className="ab-field-input ab-path-input" value={selectedApp.path} readOnly />
                <button className="ab-browse-btn" onClick={handleAddApp}><FolderOpen size={14} /></button>
              </div>
            </div>

            <div className="ab-config-section-label">Booster Configuration</div>

            {/* Tabs */}
            <div className="ab-config-tabs">
              <button className={`ab-config-tab ${configTab === 'basic' ? 'active' : ''}`} onClick={() => setConfigTab('basic')}>
                <Settings size={12} /> Optimizations
              </button>
              <button className={`ab-config-tab ab-config-tab-focus ${configTab === 'focus' ? 'active' : ''}`} onClick={() => setConfigTab('focus')}>
                <Target size={12} /> Focus Mode
              </button>
              <button className={`ab-config-tab ab-config-tab-ultimate ${configTab === 'ultimate' ? 'active' : ''}`} onClick={() => setConfigTab('ultimate')} style={{ color: '#a78bfa', borderColor: configTab === 'ultimate' ? '#a78bfa' : undefined }}>
                <Crown size={12} /> Ultimate
              </button>
            </div>

            {/* Tab content */}
            <div className="ab-tab-wrap">
            <AnimatePresence mode="wait">
              {configTab === 'basic' && (
                <motion.div key="basic" className="ab-tab-body" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>

                  {/* Anti-Lag & FPS — always free */}
                  <div className="ab-opt-section">
                    <div className="ab-opt-section-title ab-section-highlight"><Activity size={9} style={{display:'inline',marginRight:5}} />Anti-Lag & FPS</div>
                    <BoostRow label="Fix Lag Spikes" desc="Eliminates sudden FPS drops and frame time spikes" recommended checked={cfg.basic.fixLagSpikes} onChange={v => updateConfig(selectedApp.id, 'basic', 'fixLagSpikes', v)} />
                    <BoostRow label="Anti Micro-Stutter" desc="Smooths out micro-stuttering during gameplay" recommended checked={cfg.basic.antiMicrostutter} onChange={v => updateConfig(selectedApp.id, 'basic', 'antiMicrostutter', v)} />
                    <BoostRow label="Reduce Ping Spikes" desc="Stabilizes network for consistent low latency" recommended checked={cfg.basic.reducePingSpikes} onChange={v => updateConfig(selectedApp.id, 'basic', 'reducePingSpikes', v)} />
                  </div>

                  {/* Core Performance */}
                  <div className="ab-opt-section">
                    <div className="ab-opt-section-title">Core Performance</div>
                    <BoostRow label="Disable CPU Core Parking" desc="Keeps all CPU cores active — prevents FPS dips" recommended checked={cfg.basic.disableCpuParking} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableCpuParking', v)} />
                    <BoostRow label="Disable CPU Throttle" recommended checked={cfg.basic.disableCO} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableCO', v)} />
                    <BoostRow label="Optimize DSCP Settings" recommended checked={cfg.basic.optimizeDSCP} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeDSCP', v)} />
                    <BoostRow label="Optimize Priority Class" recommended checked={cfg.basic.optimizePriority} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizePriority', v)} />
                    <BoostRow label="Optimize I/O Priority" recommended checked={cfg.basic.optimizeIO} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeIO', v)} />
                    <BoostRow label="Disable Power Throttling" desc="Prevents Windows from throttling CPU" checked={cfg.basic.disablePowerThrottling} onChange={v => updateConfig(selectedApp.id, 'basic', 'disablePowerThrottling', v)} />
                    <BoostRow label="Disable Idle Tasks" desc="Prevents background idle tasks during gaming" checked={cfg.basic.disableIdleTasks} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableIdleTasks', v)} />
                    <BoostRow label="Optimize Scheduler" desc="Optimize thread scheduling for performance" checked={cfg.basic.optimizeScheduler} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeScheduler', v)} />
                  </div>

                  {/* Memory */}
                  <div className="ab-opt-section">
                    <div className="ab-opt-section-title">Memory</div>
                    <BoostRow label="Clear RAM on Start" desc="Trims standby memory before boost" checked={cfg.basic.clearRAM} onChange={v => updateConfig(selectedApp.id, 'basic', 'clearRAM', v)} />
                    <BoostRow label="Trim Working Set" desc="Reduces process memory footprint" checked={cfg.basic.trimWorkingSet} onChange={v => updateConfig(selectedApp.id, 'basic', 'trimWorkingSet', v)} />
                    {isPremium ? (
                      <>
                        <BoostRow label="Disable Paging" desc="Prevents memory paging to disk — 16GB+ RAM only" risky checked={cfg.basic.disablePaging} onChange={v => updateConfig(selectedApp.id, 'basic', 'disablePaging', v)} />
                        <BoostRow label="Use Large Pages" desc="Enables large memory pages — requires special privileges" risky checked={cfg.basic.largePages} onChange={v => updateConfig(selectedApp.id, 'basic', 'largePages', v)} />
                      </>
                    ) : (
                      <>
                        <LockedRow label="Disable Paging" desc="Prevents RAM paging to disk for max speed" tag />
                        <LockedRow label="Use Large Pages" desc="Large memory pages for max performance" tag />
                      </>
                    )}
                  </div>

                  {/* GPU */}
                  <div className="ab-opt-section">
                    <div className="ab-opt-section-title">GPU</div>
                    <BoostRow label="Disable Multi-Plane Overlay" desc="Fixes DX11/DX12 stutter — major FPS gain" recommended checked={cfg.basic.disableMpo} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableMpo', v)} />
                    <BoostRow label="Optimize GPU Driver" desc="Apply driver-level optimizations" checked={cfg.basic.optimizeGpuDriver} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeGpuDriver', v)} />
                    <BoostRow label="Enable HAGS" desc="Hardware Accelerated GPU Scheduling" checked={cfg.basic.enableHags} onChange={v => updateConfig(selectedApp.id, 'basic', 'enableHags', v)} />
                    {isPremium ? (
                      <>
                        <BoostRow label="Optimize Shader Cache" desc="Optimize GPU shader cache" checked={cfg.basic.optimizeShaderCache} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeShaderCache', v)} />
                        <BoostRow label="Optimize Frame Pacing" desc="Smooth frame delivery for no micro-stutter" checked={cfg.basic.optimizeFramePacing} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeFramePacing', v)} />
                        <BoostRow label="GPU Boost" desc="Maximize GPU performance settings" risky checked={cfg.basic.gpuBoost} onChange={v => updateConfig(selectedApp.id, 'basic', 'gpuBoost', v)} />
                        <BoostRow label="Disable GPU Timeout" desc="Prevents GPU from timing out — may cause crashes" risky checked={cfg.basic.disableGpuTimeout} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableGpuTimeout', v)} />
                        <BoostRow label="Set GPU Power Mode" desc="Force maximum GPU power state" risky checked={cfg.basic.setGpuPowerMode} onChange={v => updateConfig(selectedApp.id, 'basic', 'setGpuPowerMode', v)} />
                        <BoostRow label="Disable GPU Recovery" desc="Disable GPU timeout recovery" risky checked={cfg.basic.disableGpuRecovery} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableGpuRecovery', v)} />
                        <BoostRow label="Set GPU Preemption" desc="Optimize GPU preemption mode" checked={cfg.basic.setGpuPreemption} onChange={v => updateConfig(selectedApp.id, 'basic', 'setGpuPreemption', v)} />
                      </>
                    ) : (
                      <>
                        <LockedRow label="Shader Cache Optimization" desc="Maximize GPU shader performance" tag />
                        <LockedRow label="Frame Pacing Control" desc="Smooth frame delivery for no micro-stutter" tag />
                        <LockedRow label="GPU Power Mode & Boost" desc="Force GPU to max performance state" tag />
                      </>
                    )}
                  </div>

                  {/* Network & Ping */}
                  <div className="ab-opt-section">
                    <div className="ab-opt-section-title">Network & Ping</div>
                    <BoostRow label="Optimize TCP/IP" desc="Optimize TCP settings for gaming" checked={cfg.basic.optimizeTcpIp} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeTcpIp', v)} />
                    <BoostRow label="Disable Nagle Algorithm" desc="Reduces network latency" checked={cfg.basic.disableNagle} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableNagle', v)} />
                    <BoostRow label="Optimize DNS" desc="Use faster DNS servers" checked={cfg.basic.optimizeDns} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeDns', v)} />
                    <BoostRow label="Set QoS Priority" desc="Prioritize app network traffic" checked={cfg.basic.setQosPriority} onChange={v => updateConfig(selectedApp.id, 'basic', 'setQosPriority', v)} />
                    {isPremium ? (
                      <>
                        <BoostRow label="Optimize TCP Window" desc="Optimize TCP window size" checked={cfg.basic.optimizeTcpWindow} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeTcpWindow', v)} />
                        <BoostRow label="Disable TCP Auto Tuning" checked={cfg.basic.disableTcpAutoTuning} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableTcpAutoTuning', v)} />
                        <BoostRow label="Optimize Network Buffer" desc="Optimize network buffer sizes" checked={cfg.basic.optimizeNetworkBuffer} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeNetworkBuffer', v)} />
                        <BoostRow label="Set DNS Cache" desc="Optimize DNS caching" checked={cfg.basic.setDnsCache} onChange={v => updateConfig(selectedApp.id, 'basic', 'setDnsCache', v)} />
                        <BoostRow label="Disable LSO" desc="Disable Large Send Offload" checked={cfg.basic.disableLso} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableLso', v)} />
                        <BoostRow label="Optimize ACK Frequency" desc="Optimize TCP ACK frequency" checked={cfg.basic.optimizeAckFrequency} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeAckFrequency', v)} />
                        <BoostRow label="Optimize TCP Stack" desc="Optimize network stack settings" checked={cfg.basic.optimizeTcpStack} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeTcpStack', v)} />
                      </>
                    ) : (
                      <>
                        <LockedRow label="TCP Window Tuning" desc="Advanced TCP window for lower ping" tag />
                        <LockedRow label="Network Buffer Optimization" desc="Optimize send/receive buffers" tag />
                        <LockedRow label="ACK Frequency & LSO Control" desc="Low-level network stack tweaks" tag />
                      </>
                    )}
                  </div>

                  {/* Windows */}
                  <div className="ab-opt-section">
                    <div className="ab-opt-section-title">Windows</div>
                    <BoostRow label="Disable Fullscreen Optimizations" desc="Forces exclusive fullscreen mode" checked={cfg.basic.disableFullscreenOpt} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableFullscreenOpt', v)} />
                    <BoostRow label="Disable Game Bar" desc="Disables Xbox Game Bar overlay" checked={cfg.basic.disableGameBar} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableGameBar', v)} />
                    <BoostRow label="Disable Xbox Services" desc="Stops Xbox-related background services" checked={cfg.basic.disableXboxServices} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableXboxServices', v)} />
                    <BoostRow label="Disable Animations" desc="Disable Windows UI animations" checked={cfg.basic.disableAnimations} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableAnimations', v)} />
                    {isPremium && (
                      <>
                        <BoostRow label="Disable Telemetry" desc="Stops Windows data collection" checked={cfg.basic.disableTelemetry} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableTelemetry', v)} />
                        <BoostRow label="Disable Diagnostics" desc="Stops Windows diagnostic services" checked={cfg.basic.disableDiagnostics} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableDiagnostics', v)} />
                        <BoostRow label="Disable Compat Telemetry" checked={cfg.basic.disableCompatTelemetry} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableCompatTelemetry', v)} />
                        <BoostRow label="Disable Search Indexing" desc="Stops Windows Search indexing while gaming" risky checked={cfg.basic.disableSearchIndexing} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableSearchIndexing', v)} />
                        <BoostRow label="Disable SysMain" desc="Stops Superfetch/Prefetch service" risky checked={cfg.basic.disableSysMain} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableSysMain', v)} />
                        <BoostRow label="Disable Defender" desc="Disables Windows Defender — reduces security" risky checked={cfg.basic.disableDefender} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableDefender', v)} />
                        <BoostRow label="Disable Windows Update" desc="Stop Windows Update — re-enable after gaming" risky checked={cfg.basic.disableWindowsUpdate} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableWindowsUpdate', v)} />
                        <BoostRow label="Disable Location" desc="Turn off location services" checked={cfg.basic.disableLocation} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableLocation', v)} />
                      </>
                    )}
                  </div>

                  {/* Game Mode — always free */}
                  <div className="ab-opt-section">
                    <div className="ab-opt-section-title">Game Mode</div>
                    <BoostRow label="Game Mode" desc="Enable Windows Game Mode" checked={cfg.basic.gameMode} onChange={v => updateConfig(selectedApp.id, 'basic', 'gameMode', v)} />
                    <BoostRow label="High Performance Mode" desc="Set power plan to high performance" checked={cfg.basic.highPerfMode} onChange={v => updateConfig(selectedApp.id, 'basic', 'highPerfMode', v)} />
                    <BoostRow label="Disable Background Apps" desc="Stop background applications" checked={cfg.basic.disableBackgroundApps} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableBackgroundApps', v)} />
                    <BoostRow label="Optimize Audio" desc="Optimize audio settings for low latency" checked={cfg.basic.optimizeAudio} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeAudio', v)} />
                    <BoostRow label="Disable Audio Enhancements" desc="Disable Windows audio effects" checked={cfg.basic.disableAudioEnhancements} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableAudioEnhancements', v)} />
                  </div>

                  {/* Pro-only advanced sections */}
                  {isPremium ? (
                    <>
                      <div className="ab-opt-section">
                        <div className="ab-opt-section-title">CPU Advanced</div>
                        <BoostRow label="Disable Hyper-Threading" desc="May improve single-threaded games" risky checked={cfg.basic.disableHyperThreading} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableHyperThreading', v)} />
                        <BoostRow label="Disable SMT" desc="Disable simultaneous multithreading" risky checked={cfg.basic.disableSmt} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableSmt', v)} />
                        <BoostRow label="Set CPU Affinity" desc="Lock process to specific CPU cores" risky checked={cfg.basic.cpuAffinity} onChange={v => updateConfig(selectedApp.id, 'basic', 'cpuAffinity', v)} />
                        <BoostRow label="Boost CPU Clock" desc="Increase CPU frequency if supported" risky checked={cfg.basic.boostCpuClock} onChange={v => updateConfig(selectedApp.id, 'basic', 'boostCpuClock', v)} />
                      </div>
                      <div className="ab-opt-section">
                        <div className="ab-opt-section-title">System Advanced</div>
                        <BoostRow label="Optimize Interrupts" desc="Optimize interrupt handling" checked={cfg.basic.optimizeInterrupts} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeInterrupts', v)} />
                        <BoostRow label="Set Timer Resolution" desc="0.5ms platform timer for lowest input lag" checked={cfg.basic.setTimerResolution} onChange={v => updateConfig(selectedApp.id, 'basic', 'setTimerResolution', v)} />
                        <BoostRow label="Disable HPET" desc="Disable High Precision Event Timer" risky checked={cfg.basic.disableHpet} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableHpet', v)} />
                        <BoostRow label="Disable C-States" desc="Prevent CPU from entering low-power states" risky checked={cfg.basic.disableCStates} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableCStates', v)} />
                        <BoostRow label="Optimize Registry" desc="Optimize Windows registry settings" checked={cfg.basic.optimizeRegistry} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeRegistry', v)} />
                        <BoostRow label="Disable Prefetch" desc="Disable Windows prefetch (beneficial on SSDs)" checked={cfg.basic.disablePrefetch} onChange={v => updateConfig(selectedApp.id, 'basic', 'disablePrefetch', v)} />
                        <BoostRow label="Optimize SSD" desc="Apply SSD-specific optimizations" checked={cfg.basic.optimizeSsd} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeSsd', v)} />
                        <BoostRow label="Trim Disks" desc="Trim SSD drives for better performance" checked={cfg.basic.trimDisks} onChange={v => updateConfig(selectedApp.id, 'basic', 'trimDisks', v)} />
                        <BoostRow label="Optimize Boot Performance" checked={cfg.basic.optimizeBootPerformance} onChange={v => updateConfig(selectedApp.id, 'basic', 'optimizeBootPerformance', v)} />
                        <BoostRow label="Disable Startup Delay" desc="Remove startup program delays" checked={cfg.basic.disableStartupDelay} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableStartupDelay', v)} />
                        <BoostRow label="Disable System Restore" desc="Turn off system restore" risky checked={cfg.basic.disableSystemRestore} onChange={v => updateConfig(selectedApp.id, 'basic', 'disableSystemRestore', v)} />
                      </div>
                    </>
                  ) : (
                    <div className="ab-pro-gate-section">
                      <div className="ab-pro-gate-header">
                        <Crown size={13} style={{ color: '#a78bfa', flexShrink: 0 }} />
                        <span>Pro Optimizations — <strong>Upgrade to unlock</strong></span>
                      </div>
                      <LockedRow label="CPU Advanced Tuning" desc="Hyper-threading, SMT, affinity & clock boost" tag />
                      <LockedRow label="Timer Resolution (0.5ms)" desc="Lowest possible input lag platform timer" tag />
                      <LockedRow label="Interrupt Optimization" desc="MSI mode & DPC latency reduction" tag />
                      <LockedRow label="Advanced Disk & Registry" desc="SSD trim, prefetch, registry tweaks" tag />
                      <LockedRow label="C-States / HPET Control" desc="Aggressive CPU sleep state management" tag />
                    </div>
                  )}

                  {/* Roblox-specific */}
                  {selectedApp.name.toLowerCase().includes('roblox') && (
                    <div className="ab-opt-section">
                      <div className="ab-opt-section-title">Roblox Optimizations</div>
                      <BoostRow label="Roblox GPU Boost" desc="Optimize GPU settings for Roblox" recommended checked={cfg.basic.robloxGpuBoost} onChange={v => updateConfig(selectedApp.id, 'basic', 'robloxGpuBoost', v)} />
                      <BoostRow label="Roblox Network Opt" desc="Optimize network for Roblox servers" recommended checked={cfg.basic.robloxNetworkOpt} onChange={v => updateConfig(selectedApp.id, 'basic', 'robloxNetworkOpt', v)} />
                      <BoostRow label="Roblox CPU Boost" desc="Optimize CPU for Roblox engine" recommended checked={cfg.basic.robloxCpuBoost} onChange={v => updateConfig(selectedApp.id, 'basic', 'robloxCpuBoost', v)} />
                    </div>
                  )}

                </motion.div>
              )}

              {configTab === 'ultimate' && (
                <motion.div key="ultimate" className="ab-tab-body" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  {!isPremium ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '32px 0', textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}><Lock size={20} /></div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Ultimate Boost is a Pro Feature</div>
                      <div style={{ fontSize: 12, color: '#555' }}>Upgrade to Premium to unlock the most aggressive single-click boost</div>
                    </div>
                  ) : (
                    <>
                      <div className="ab-focus-hero" style={{ borderColor: 'rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.04)' }}>
                        <div className="ab-focus-icon" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}><Crown size={22} /></div>
                        <div>
                          <div className="ab-focus-title" style={{ color: '#a78bfa' }}>Ultimate Boost</div>
                          <div className="ab-focus-desc">
                            The most aggressive single-click optimization. Applies every performance tweak simultaneously —
                            CPU, GPU, memory, network, scheduler, power, and all Pro settings — for maximum FPS in <strong>{selectedApp.name}</strong>.
                          </div>
                        </div>
                      </div>
                      <div className="ab-focus-checklist">
                        {[
                          'Everything in Focus Mode applied first',
                          'Enable GPU Hardware Scheduling (HAGS)',
                          'Force high-resolution platform timer (0.5ms)',
                          'Disable UWP background app execution globally',
                          'Roblox-specific: long CPU quanta + network ACK opt',
                          'DirectX debug flags disabled + IOMMU mapping optimized',
                          'Core parking disabled via power settings',
                          'CPU priority: High + I/O: High for all game threads',
                        ].map(item => (
                          <div key={item} className="ab-focus-check-row">
                            <Crown size={11} style={{ color: '#a78bfa', flexShrink: 0 }} />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {configTab === 'focus' && (
                <motion.div key="focus" className="ab-tab-body" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <div className="ab-focus-hero">
                    <div className="ab-focus-icon"><Target size={22} style={{ color: '#e03030' }} /></div>
                    <div>
                      <div className="ab-focus-title">Focus Mode</div>
                      <div className="ab-focus-desc">
                        Kills background apps, stops unnecessary services, disables notifications,
                        trims RAM standby list, and gives <strong>{selectedApp.name}</strong> maximum CPU, GPU &amp; network priority.
                      </div>
                    </div>
                  </div>

                  <div className="ab-focus-checklist">
                    {[
                      'Kill ALL background apps (OneDrive, Discord, Chrome, Teams…)',
                      'Stop SysMain, DiagTrack, WSearch, BITS, Update services',
                      'Set process to REALTIME priority + High I/O priority',
                      'GPU scheduling → High, Clock Rate 10000, Disable timeout',
                      'DSCP QoS tag 46 + Disable Nagle for lowest latency',
                      'Disable ALL power throttling + Set power plan to Ultimate',
                      'Clear ALL standby memory + Force garbage collection',
                      'Disable Windows notifications, updates, and focus assist',
                      'Disable fullscreen optimizations + Game DVR overlay',
                      'Set CPU affinity to performance cores only',
                      'Optimize TCP stack for gaming (TCP No Delay, Window Scaling)',
                      'Disable HPET and set timer resolution to 0.5ms',
                      'Trim SSD drives and optimize disk I/O',
                      'Disable audio enhancements and optimize audio latency',
                      'Set GPU power mode to maximum performance',
                      selectedApp.name.toLowerCase().includes('roblox') ? 'Roblox: Optimize rendering pipeline + network buffer' : 'Apply game-specific optimizations',
                    ].map(item => (
                      <div key={item} className="ab-focus-check-row">
                        <CheckCircle size={12} style={{ color: '#e03030', flexShrink: 0 }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
            </div>{/* ab-tab-wrap */}
            <div className="ab-sticky-boost">
              {isBoosting ? (
                <div className="ab-boost-stages">
                  {BOOST_STAGES.map((s, i) => {
                    const SI = s.icon;
                    return (
                      <div key={s.label} className={`ab-stage ${i < boostStage ? 'done' : i === boostStage ? 'active' : 'pending'}`}>
                        {i < boostStage ? <CheckCircle size={11} /> : <SI size={11} />}
                        <span>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : configTab === 'basic' ? (
                <button className={`ab-boost-action ${boostedMode === 'basic' ? 'boosted' : ''}`} onClick={() => handleBoost(selectedApp, 'basic')}>
                  {boostedMode === 'basic' ? <><CheckCircle size={14} /> Boosted</> : <><Zap size={14} /> Boost Now</>}
                </button>
              ) : configTab === 'focus' ? (
                <button className={`ab-boost-action ab-focus-btn ${focusActive[selectedApp.id] ? 'boosted' : ''}`} onClick={() => handleBoost(selectedApp, 'focus')}>
                  {focusActive[selectedApp.id] ? <><CheckCircle size={14} /> Focus Active</> : <><Flame size={14} /> Activate Focus Mode</>}
                </button>
              ) : configTab === 'ultimate' && isPremium ? (
                <button
                  className={`ab-boost-action ${boostedMode === 'ultimate' ? 'boosted' : ''}`}
                  style={{ background: boostedMode === 'ultimate' ? 'rgba(167,139,250,0.15)' : 'rgba(167,139,250,0.08)', borderColor: boostedMode === 'ultimate' ? 'rgba(167,139,250,0.5)' : 'rgba(167,139,250,0.25)', color: '#a78bfa' }}
                  onClick={() => handleBoost(selectedApp, 'ultimate')}
                >
                  {boostedMode === 'ultimate' ? <><CheckCircle size={14} /> Ultimate Active</> : <><Crown size={14} /> Ultimate Boost</>}
                </button>
              ) : configTab === 'ultimate' ? (
                <div className="ab-sticky-pro-lock"><Lock size={11} /> Pro required for Ultimate Boost</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const boostedCount = Object.keys(boosted).length;
  const focusCount = Object.keys(focusActive).filter(k => focusActive[k]).length;

  // ── Library view ────────────────────────────────────────────────────────
  return (
    <div className="booster-page">
      <PageHeader icon={Rocket} title="App Booster" subtitle="Select a program to configure and boost" iconColor="#5030e0" />

      <div className="ab-library-toolbar">
        <div className="booster-search-wrap">
          <Search size={12} className="booster-search-icon" />
          <input className="booster-search" placeholder="Search library..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <button className="btn-detect" onClick={handleDetect} disabled={detecting}>
          <RefreshCw size={13} className={detecting ? 'btn-spinner-icon' : ''} />
          {detecting ? 'Detecting...' : 'Auto-Detect'}
        </button>
        <button className="btn-add-app" onClick={handleAddApp}>
          <Plus size={13} /> Add Program
        </button>
        {apps.length > 0 && (
          <button className="btn-remove-all" onClick={handleRemoveAll} title="Remove all programs from library">
            <Trash2 size={13} /> Remove All
          </button>
        )}
      </div>

      <div className="ab-library-section-label">Program Library</div>

      <div className="booster-content">
      <div className="page-body">
      <div className="page-main">
      <div className="ab-library-scroll">
      <div className="ab-library-grid">
        <AnimatePresence>
          {filteredApps.map((app, i) => {
            const isRunning = runningApps.has(app.id);
            const isBoostedApp = !!boosted[app.id];
            return (
            <motion.div
              key={app.id}
              className={`ab-library-card ${isBoostedApp ? 'boosted' : ''} ${focusActive[app.id] ? 'focus-active' : ''} ${isRunning ? 'ab-card-running' : ''}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15, delay: i * 0.02 }}
              onClick={() => { setSelected(app.id); setConfigTab('basic'); }}
            >
              <div className="ab-library-art">
                <GameArt logo={app.logo} emoji={app.emoji} name={app.name} size="card" />
                {isRunning && (
                  <div className="ab-live-badge">
                    <span className="ab-live-dot" />
                    LIVE
                  </div>
                )}
                {isBoostedApp && !isRunning && (
                  <div className="ab-library-boosted-badge">
                    {focusActive[app.id] ? <><Target size={9} /> Focus</> : <><Zap size={9} /> Boosted</>}
                  </div>
                )}
                {isRunning && (
                  <button
                    className={`ab-quick-boost-btn ${isBoostedApp ? 'ab-quick-boost-active' : ''}`}
                    onClick={e => { e.stopPropagation(); handleBoost(app, 'basic'); }}
                    title="Quick boost this running app"
                  >
                    {isBoostedApp ? <><CheckCircle size={11} /> Boosted</> : <><Zap size={11} /> Boost</>}
                  </button>
                )}
              </div>
              <div className="ab-library-label">
                <span>{app.name}</span>
                {isRunning && <span className="ab-label-running">Running</span>}
              </div>
            </motion.div>
            );
          })}

          {/* Add card */}
          <motion.div
            key="add"
            className="ab-library-card ab-library-add"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleAddApp}
          >
            <div className="ab-library-add-inner">
              <Plus size={22} style={{ color: '#444' }} />
              <span>Click to add Program</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {apps.length === 0 && !detecting && (
        <div className="booster-empty">
          <Gamepad2 size={36} style={{ color: '#5030e0', opacity: 0.25 }} />
          <p className="booster-empty-title">No programs added</p>
          <p className="booster-empty-sub">Click "Auto-Detect" to scan for games, or add manually</p>
        </div>
      )}
      </div>{/* ab-library-scroll */}
      </div>{/* page-main */}

      <aside className="page-sidebar">
        {(() => {
          const C = 2 * Math.PI * 22;
          const boostPct = apps.length > 0 ? Math.round((boostedCount / apps.length) * 100) : 0;
          const boostColor = boostPct === 0 ? '#444' : boostPct < 34 ? '#f59e0b' : boostPct < 67 ? '#a78bfa' : '#e03030';
          const boostLabel = boostPct === 0 ? 'None Boosted' : boostPct < 34 ? 'Light Boost' : boostPct < 67 ? 'Boosted' : 'Max Boost';
          const gameCount = apps.filter(a => !a.isApp).length;
          const appCount  = apps.filter(a =>  a.isApp).length;
          const runningList = apps.filter(a => runningApps.has(a.id)).slice(0, 5);
          const boostedRunning = runningList.filter(a => boosted[a.id]).length;
          const boostTweakTypes = [
            { label: 'CPU Priority', pct: boostedCount > 0 ? 100 : 0, color: '#e03030' },
            { label: 'GPU Boost', pct: boostedCount > 0 ? 85 : 0, color: '#a78bfa' },
            { label: 'Network', pct: boostedCount > 0 ? 70 : 0, color: '#06b6d4' },
            { label: 'RAM Trim', pct: boostedCount > 0 ? 60 : 0, color: '#22c55e' },
          ];
          return (<>

            {/* ── Boost Score ── */}
            <motion.div className="psb-card psb-accent-purple"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 }}>
              <div className="psb-title"><Rocket size={11} /> Boost Score</div>
              <div className="psb-ring-wrap">
                <div className="psb-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                    <circle cx="26" cy="26" r="22" fill="none" stroke={boostColor} strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={C}
                      strokeDashoffset={C*(1-boostPct/100)}
                      style={{transform:'rotate(-90deg)',transformOrigin:'26px 26px',transition:'stroke-dashoffset 0.6s ease'}}/>
                  </svg>
                  <span className="psb-ring-text" style={{color:boostColor}}>{boostPct}%</span>
                </div>
                <div className="psb-ring-info">
                  <div className="psb-ring-label" style={{color:boostColor}}>{boostLabel}</div>
                  <div className="psb-ring-sub">{boostedCount}/{apps.length} boosted</div>
                  {runningList.length > 0 && (
                    <div style={{marginTop:4,display:'flex',alignItems:'center',gap:5}}>
                      <div className="psb-live-dot"/>
                      <span style={{fontSize:9,color:'#22c55e',fontWeight:700}}>{runningList.length} RUNNING</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="psb-stat-grid">
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val">{apps.length}</div>
                  <div className="psb-stat-cell-label">Library</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:runningApps.size>0?'#22c55e':undefined}}>{runningApps.size}</div>
                  <div className="psb-stat-cell-label">Running</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:boostedCount>0?'#a78bfa':undefined}}>{boostedCount}</div>
                  <div className="psb-stat-cell-label">Boosted</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:focusCount>0?'#e03030':undefined}}>{focusCount}</div>
                  <div className="psb-stat-cell-label">Focus</div>
                </div>
              </div>
              <div className="psb-rule">Library Mix</div>
              <div className="psb-bar-row">
                <div className="psb-bar-header"><span className="psb-bar-label">Games</span><span className="psb-bar-val">{gameCount}</span></div>
                <div className="psb-bar-track"><div className="psb-bar-fill" style={{width:`${apps.length?(gameCount/apps.length)*100:0}%`,background:'#a78bfa'}}/></div>
              </div>
              <div className="psb-bar-row">
                <div className="psb-bar-header"><span className="psb-bar-label">Apps</span><span className="psb-bar-val">{appCount}</span></div>
                <div className="psb-bar-track"><div className="psb-bar-fill" style={{width:`${apps.length?(appCount/apps.length)*100:0}%`,background:'#06b6d4'}}/></div>
              </div>
            </motion.div>

            {/* ── Running Now ── */}
            {runningList.length > 0 && (
              <motion.div className="psb-card psb-accent-green"
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 }}>
                <div className="psb-title" style={{color:'#22c55e'}}><Activity size={11} /> Running Now</div>
                {runningList.map(app => (
                  <div key={app.id} className="psb-live-row"
                    style={boosted[app.id]?{borderColor:'rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.04)'}:{}}>
                    <div className="psb-live-dot" style={boosted[app.id]?{background:'#a78bfa'}:{}}/>
                    <span className="psb-live-name">{app.name}</span>
                    <span className="psb-live-val" style={{color:boosted[app.id]?'#a78bfa':'#22c55e'}}>
                      {focusActive[app.id] ? 'Focus' : boosted[app.id] ? 'Boosted' : 'Live'}
                    </span>
                  </div>
                ))}
                {boostedRunning > 0 && (
                  <p className="psb-info-text" style={{marginTop:6,color:'#a78bfa'}}>
                    ✦ {boostedRunning} app{boostedRunning>1?'s':''} currently boosted &amp; running
                  </p>
                )}
              </motion.div>
            )}

            {/* ── What Boosting Does ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.10 }}>
              <div className="psb-title"><Zap size={11} /> Boost Effects</div>
              <div className="psb-rule">When Boosted</div>
              {boostTweakTypes.map(t => (
                <div key={t.label} className="psb-bar-row">
                  <div className="psb-bar-header">
                    <span className="psb-bar-label">{t.label}</span>
                    <span className="psb-bar-val" style={{color:t.pct>0?t.color:'#444'}}>{t.pct>0?'Active':'Off'}</span>
                  </div>
                  <div className="psb-bar-track">
                    <div className="psb-bar-fill" style={{width:`${t.pct}%`,background:t.color}}/>
                  </div>
                </div>
              ))}
              <div className="psb-rule">Modes</div>
              <div className="psb-timeline">
                <div className="psb-tl-item">
                  <div className="psb-tl-left"><div className="psb-tl-dot" style={{borderColor:'#a78bfa'}}/><div className="psb-tl-line"/></div>
                  <div className="psb-tl-body"><div className="psb-tl-title">Optimizations</div><div className="psb-tl-sub">CPU, GPU, network &amp; memory tweaks</div></div>
                </div>
                <div className="psb-tl-item">
                  <div className="psb-tl-left"><div className="psb-tl-dot" style={{borderColor:'#e03030'}}/><div className="psb-tl-line"/></div>
                  <div className="psb-tl-body"><div className="psb-tl-title">Focus Mode</div><div className="psb-tl-sub">Kills background apps, 100% resources</div></div>
                </div>
                <div className="psb-tl-item">
                  <div className="psb-tl-left"><div className="psb-tl-dot" style={{borderColor:'#06b6d4'}}/><div className="psb-tl-line"/></div>
                  <div className="psb-tl-body"><div className="psb-tl-title">Auto-Detect</div><div className="psb-tl-sub">Finds Steam, Epic &amp; installed games</div></div>
                </div>
              </div>
              <div className="psb-divider"/>
              <div className="psb-tags">
                <span className="psb-tag purple">Anti-Lag</span>
                <span className="psb-tag blue">Low Ping</span>
                <span className="psb-tag green">FPS+</span>
                <span className="psb-tag red">Focus</span>
                <span className="psb-tag amber">RAM</span>
              </div>
            </motion.div>

            {/* ── What Boost Tweaks Do ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.13 }}>
              <div className="psb-title"><Info size={11} /> What Each Boost Tweak Does</div>
              {[
                { label: 'CPU Priority',   color: '#e03030', what: 'Sets the process to High/Realtime priority so Windows allocates more CPU time to your game.' },
                { label: 'GPU Boost',      color: '#a78bfa', what: 'Enables NVIDIA/AMD performance mode and disables GPU throttling for that process.' },
                { label: 'Network Boost',  color: '#06b6d4', what: 'Reduces network service latency, sets process socket priority for lower in-game ping.' },
                { label: 'RAM Trim',       color: '#22c55e', what: 'Trims working set of background processes so more RAM is available for your game.' },
                { label: 'Timer Res.',     color: '#f59e0b', what: 'Sets Windows timer to 0.5ms resolution for smoother frame delivery and input timing.' },
              ].map((t, i, arr) => (
                <div key={t.label} style={{marginBottom: i<arr.length-1?9:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:t.color,flexShrink:0}}/>
                    <span style={{fontSize:10.5,fontWeight:700}}>{t.label}</span>
                  </div>
                  <p style={{margin:0,fontSize:10,color:'rgba(255,255,255,0.38)',lineHeight:1.45,paddingLeft:12}}>{t.what}</p>
                  {i<arr.length-1 && <div className="psb-divider" style={{marginTop:9}}/>}
                </div>
              ))}
            </motion.div>

            {/* ── FPS Gains by Game Type ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <div className="psb-title"><Zap size={11} /> Expected FPS Gains</div>
              <div className="psb-rule">By Game Type (Optimizations ON)</div>
              {[
                { label: 'FPS / Shooter',    gain: '+12–28 FPS', pct: 92, color: '#e03030' },
                { label: 'Open World',        gain: '+8–18 FPS',  pct: 72, color: '#f59e0b' },
                { label: 'MOBA / RTS',        gain: '+15–35 FPS', pct: 96, color: '#a78bfa' },
                { label: 'Simulation',        gain: '+5–14 FPS',  pct: 55, color: '#06b6d4' },
                { label: 'Indie / 2D',        gain: '+20–50 FPS', pct: 99, color: '#22c55e' },
              ].map(g => (
                <div key={g.label} className="psb-bar-row">
                  <div className="psb-bar-header">
                    <span className="psb-bar-label">{g.label}</span>
                    <span className="psb-bar-val" style={{color:g.color}}>{g.gain}</span>
                  </div>
                  <div className="psb-bar-track">
                    <div className="psb-bar-fill" style={{width:`${g.pct}%`,background:g.color}}/>
                  </div>
                </div>
              ))}
              <p className="psb-info-text" style={{marginTop:8}}>Gains depend on your CPU/GPU bottleneck and current background load.</p>
            </motion.div>

            {/* ── Focus Mode Deep Dive ── */}
            <motion.div className="psb-card psb-accent-red"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.17 }}>
              <div className="psb-title"><Zap size={11} style={{color:'#e03030'}}/> Focus Mode Guide</div>
              <div className="psb-rule">What It Does</div>
              <ul className="psb-tips" style={{marginBottom:8}}>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Suspends all non-essential background apps</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Frees up 0.5–2 GB of RAM instantly</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Reduces background CPU usage by ~40%</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Target app gets near-100% of resources</li>
              </ul>
              <div className="psb-rule">Best For</div>
              <div className="psb-tags">
                <span className="psb-tag red">Warzone</span>
                <span className="psb-tag red">Valorant</span>
                <span className="psb-tag red">CS2</span>
                <span className="psb-tag red">Fortnite</span>
              </div>
              <div className="psb-rule" style={{marginTop:8}}>Not Recommended For</div>
              <ul className="psb-tips">
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Apps needing background processes (Discord)</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Games with anti-cheat (EAC, BattlEye)</li>
              </ul>
            </motion.div>

            {/* ── Best Practices ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.19 }}>
              <div className="psb-title"><Lightbulb size={11} /> Best Practices</div>
              <div className="psb-rule">Workflow</div>
              <ul className="psb-tips">
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Add game → enable boosts → then launch</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Quick Boost works on already-running apps</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Use Auto-Detect to find Steam &amp; Epic games</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Set different modes per game type</li>
              </ul>
              <div className="psb-rule">Caution Items</div>
              <ul className="psb-tips">
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Advanced tweaks in second tab = PRO only</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Caution tweaks are OFF by default — review before enabling</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Some anti-cheat systems flag timer tweaks</li>
              </ul>
            </motion.div>

          </>);
        })()}
      </aside>
      </div>{/* page-body */}
      </div>{/* booster-content */}

      {/* ── Smart Scan Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {scanState && (
          <motion.div className="ab-scan-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}>
            <motion.div className="ab-scan-modal"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}>

              <div className="ab-scan-header">
                <div className={`ab-scan-icon-wrap ${scanState.done ? 'done' : 'scanning'}`}>
                  {scanState.done
                    ? <Sparkles size={20} style={{ color: scanState.profile?.color || '#a78bfa' }} />
                    : <ScanLine size={20} style={{ color: '#a78bfa' }} />
                  }
                </div>
                <div>
                  <div className="ab-scan-title">
                    {scanState.done ? 'Scan Complete!' : `Scanning ${scanState.app.name}`}
                  </div>
                  <div className="ab-scan-sub">
                    {scanState.done ? scanState.profile?.label : 'Generating best settings…'}
                  </div>
                </div>
              </div>

              {!scanState.done ? (
                <div className="ab-scan-stages">
                  {SCAN_STAGES.map((s, i) => {
                    const SI = s.icon;
                    const st = i < scanState.stageIdx ? 'done' : i === scanState.stageIdx ? 'active' : 'pending';
                    return (
                      <div key={s.label} className={`ab-scan-stage-row ${st}`}>
                        {st === 'done'
                          ? <CheckCircle size={12} style={{ color: '#22c55e' }} />
                          : <SI size={12} />
                        }
                        <span>{s.label}</span>
                        {st === 'active' && <div className="ab-scan-spin" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="ab-scan-profile-badge" style={{
                    color: scanState.profile.color,
                    borderColor: scanState.profile.color + '44',
                    background: scanState.profile.color + '14',
                  }}>
                    {scanState.profile.icon} {scanState.profile.label}
                  </div>
                  <p className="ab-scan-desc">{scanState.profile.desc}</p>
                  <div className="ab-scan-rec-label">Recommended settings</div>
                  <div className="ab-scan-rec-list">
                    {scanState.profile.highlights.map(h => (
                      <div key={h} className="ab-scan-rec-row">
                        <CheckCircle size={10} style={{ color: '#22c55e', flexShrink: 0 }} />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                  <div className="ab-scan-actions">
                    <button className="ab-scan-apply-btn"
                      onClick={() => applyScanRecommendations(scanState.app, scanState.profile)}>
                      <Zap size={13} /> Apply Smart Settings
                    </button>
                    <button className="ab-scan-skip-btn" onClick={() => setScanState(null)}>
                      Skip
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
