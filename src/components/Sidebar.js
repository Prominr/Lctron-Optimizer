import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Zap, Rocket, BatteryCharging, Trash2, Wifi, PlayCircle, Activity, Shield, PackageX, SlidersHorizontal, FlameKindling, ChevronDown, Settings, Monitor, Cpu, Server, LayoutGrid, Crown, BarChart2 } from 'lucide-react';
import pkg from '../../package.json';
import { usePremium } from '../context/PremiumContext';
import './Sidebar.css';

const { version } = pkg;

const OPTIMIZE_CATS = [
  { id: 'optimize', label: 'All Tweaks', icon: LayoutGrid },
  { id: 'optimize?cat=Main', label: 'Main', icon: Settings },
  { id: 'optimize?cat=Latency', label: 'Latency', icon: Zap },
  { id: 'optimize?cat=Nvidia', label: 'Nvidia', icon: Monitor },
  { id: 'optimize?cat=GPU', label: 'GPU', icon: Cpu },
  { id: 'optimize?cat=Services', label: 'Services', icon: Server },
];

const navGroups = [
  {
    label: 'Overview',
    items: [
      { id: 'home', label: 'Home', icon: Home },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'booster', label: 'App Booster', icon: Rocket },
      { id: 'powerplan', label: 'Power Plan', icon: BatteryCharging },
      { id: 'cleaner', label: 'Cleaner', icon: Trash2 },
      { id: 'netscripts', label: 'Net Scripts', icon: Wifi },
      { id: 'debloat', label: 'Debloat', icon: PackageX },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'startup', label: 'Startup', icon: PlayCircle },
      { id: 'processes', label: 'Processes', icon: Activity },
      { id: 'restore', label: 'Restore', icon: Shield },
    ],
  },
  {
    label: 'App',
    items: [
      { id: 'appsettings', label: 'Settings', icon: SlidersHorizontal },
    ],
  },
];

const Sidebar = memo(function Sidebar({ activePage, setActivePage }) {
  const [optimizeOpen, setOptimizeOpen] = useState(activePage === 'optimize');
  const isOptimizeActive = activePage === 'optimize';
  const [runtimeVersion, setRuntimeVersion] = useState(version);
  const { isPremium } = usePremium();

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => { if (v) setRuntimeVersion(v); }).catch(() => {});
    }
  }, []);

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {/* Overview group */}
        <div className="sidebar-group-label">Overview</div>
        <button
          className={`nav-item ${activePage === 'home' ? 'active' : ''}`}
          onClick={() => setActivePage('home')}
        >
          {activePage === 'home' && <div className="active-indicator" />}
          <div className={`nav-icon-wrap ${activePage === 'home' ? 'active' : ''}`}><Home size={14} /></div>
          <span className="nav-label">Home</span>
          {activePage === 'home' && <div className="active-dot" />}
        </button>

        {/* Optimize accordion */}
        <div className="sidebar-group-label">Optimize</div>
        <button
          className={`nav-item nav-item-accordion ${isOptimizeActive ? 'active' : ''}`}
          onClick={() => { setOptimizeOpen(o => !o); setActivePage('optimize'); }}
        >
          {isOptimizeActive && <div className="active-indicator" />}
          <div className={`nav-icon-wrap ${isOptimizeActive ? 'active' : ''}`}><Zap size={14} /></div>
          <span className="nav-label">Optimize</span>
          <div className={`nav-chevron${optimizeOpen ? ' open' : ''}`}>
            <ChevronDown size={12} />
          </div>
        </button>
        <AnimatePresence initial={false}>
          {optimizeOpen && (
            <motion.div
              className="nav-sub-group"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >
              {OPTIMIZE_CATS.slice(1).map(cat => {
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    className="nav-sub-item"
                    onClick={() => setActivePage(cat.id)}
                  >
                    <CatIcon size={12} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Remaining groups */}
        {navGroups.slice(1).map((group) => (
          <React.Fragment key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActivePage(item.id)}
                >
                  {isActive && <div className="active-indicator" />}
                  <div className={`nav-icon-wrap ${isActive ? 'active' : ''}`}><Icon size={14} /></div>
                  <span className="nav-label">{item.label}</span>
                  {isActive && <div className="active-dot" />}
                </button>
              );
            })}
          </React.Fragment>
        ))}

        {/* Premium */}
        <div className="sidebar-group-label">Premium</div>
        <button
          className={`nav-item ${activePage === 'prodashboard' ? 'active' : ''}`}
          onClick={() => setActivePage('prodashboard')}
        >
          {activePage === 'prodashboard' && <div className="active-indicator" />}
          <div className={`nav-icon-wrap ${activePage === 'prodashboard' ? 'active' : ''}`} style={activePage !== 'prodashboard' ? { background: 'rgba(167,139,250,0.08)', color: '#a78bfa' } : {}}>
            <BarChart2 size={14} />
          </div>
          <span className="nav-label" style={{ color: '#a78bfa' }}>Pro Dashboard</span>
          {!isPremium && <div style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', letterSpacing: '0.3px' }}>PRO</div>}
        </button>
        <button
          className={`nav-item ${activePage === 'premium' ? 'active' : ''}`}
          onClick={() => setActivePage('premium')}
        >
          {activePage === 'premium' && <div className="active-indicator" />}
          <div className="nav-icon-wrap" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
            <Crown size={14} />
          </div>
          <span className="nav-label" style={{ color: '#a78bfa' }}>Upgrade</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        <FlameKindling size={13} style={{ color: 'var(--red-primary)', opacity: 0.6 }} />
        <span className="sidebar-footer-name">LCTRON</span>
        <span className="sidebar-footer-ver">v{runtimeVersion}</span>
      </div>
    </aside>
  );
});

export default Sidebar;
