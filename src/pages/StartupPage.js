import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, ToggleLeft, ToggleRight, RefreshCw, FolderOpen, Zap, ShieldOff, Lightbulb, CheckCircle, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import './StartupPage.css';
import './PageSidebar.css';

export default function StartupPage({ addToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});

  const load = async () => {
    setLoading(true);
    if (window.electronAPI) {
      const res = await window.electronAPI.getStartupPrograms();
      setItems(res.items || []);
    } else {
      setItems([
        { name: 'Discord', path: 'C:\\Users\\lilly\\AppData\\Local\\Discord\\Update.exe', enabled: true },
        { name: 'Steam', path: 'C:\\Program Files (x86)\\Steam\\steam.exe', enabled: true },
        { name: 'Spotify', path: 'C:\\Users\\lilly\\AppData\\Roaming\\Spotify\\Spotify.exe', enabled: false },
        { name: 'OneDrive', path: 'C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe', enabled: true },
        { name: 'Teams', path: 'C:\\Users\\lilly\\AppData\\Local\\Microsoft\\Teams\\Update.exe', enabled: false },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (item) => {
    setToggling(prev => ({ ...prev, [item.name]: true }));
    if (window.electronAPI) {
      await window.electronAPI.setStartupProgram(item.name, !item.enabled);
    }
    setItems(prev => prev.map(i => i.name === item.name ? { ...i, enabled: !i.enabled } : i));
    setToggling(prev => ({ ...prev, [item.name]: false }));
    addToast(`${item.name} startup ${!item.enabled ? 'enabled' : 'disabled'}`, 'success');
  };

  const enabled = items.filter(i => i.enabled).length;
  const disabled = items.filter(i => !i.enabled).length;

  const getImpact = (name) => {
    const high = ['discord', 'teams', 'onedrive', 'skype', 'zoom', 'adobe', 'creative cloud', 'dropbox', 'googledrive'];
    const med = ['steam', 'spotify', 'slack', 'epic', 'battlenet', 'uplay', 'origin'];
    const n = name.toLowerCase();
    if (high.some(h => n.includes(h))) return { label: 'High Impact', color: '#e03030' };
    if (med.some(m => n.includes(m))) return { label: 'Med Impact', color: '#f59e0b' };
    return { label: 'Low Impact', color: '#4ade80' };
  };

  const highImpact = items.filter(i => i.enabled && getImpact(i.name).label === 'High Impact').length;
  const medImpact  = items.filter(i => i.enabled && getImpact(i.name).label === 'Med Impact').length;

  return (
    <div className="startup-page">
      <PageHeader icon={PlayCircle} title="Startup Manager" subtitle="Control which programs launch when Windows starts" iconColor="var(--red-primary)" />

      {/* Stats Bar */}
      <motion.div className="startup-stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="startup-stat">
          <span className="startup-stat-val" style={{ color: 'var(--red-primary)' }}>{enabled}</span>
          <span className="startup-stat-label">Enabled</span>
        </div>
        <div className="startup-stat-divider" />
        <div className="startup-stat">
          <span className="startup-stat-val" style={{ color: '#555' }}>{disabled}</span>
          <span className="startup-stat-label">Disabled</span>
        </div>
        <div className="startup-stat-divider" />
        <div className="startup-stat">
          <span className="startup-stat-val">{items.length}</span>
          <span className="startup-stat-label">Total</span>
        </div>
        <div className="startup-stat-actions">
          <button className="startup-refresh-btn" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          {enabled > 0 && (
            <button className="startup-disable-all-btn" onClick={async () => {
              for (const item of items.filter(i => i.enabled)) await toggle(item);
            }}>
              <ShieldOff size={13} />
              Disable All
            </button>
          )}
        </div>
      </motion.div>

      <div className="page-body" style={{alignItems:'flex-start'}}>
      <div className="page-main">
      {loading ? (
        <div className="startup-loading"><div className="startup-spinner" /> Scanning startup entries...</div>
      ) : (
        <div className="startup-list">
          <AnimatePresence>
            {items.map((item, i) => {
              const impact = getImpact(item.name);
              return (
                <motion.div
                  key={item.name}
                  className={`startup-item ${item.enabled ? 'enabled' : 'disabled'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 380, damping: 30 }}
                  layout
                >
                  <div className="startup-item-icon">
                    <FolderOpen size={14} style={{ color: item.enabled ? 'var(--red-primary)' : '#444' }} />
                  </div>
                  <div className="startup-item-info">
                    <div className="startup-item-name-row">
                      <span className="startup-item-name">{item.name}</span>
                      <span className="startup-impact-badge" style={{ color: impact.color, borderColor: impact.color + '44', background: impact.color + '18' }}>{impact.label}</span>
                    </div>
                    <div className="startup-item-path">{item.path}</div>
                  </div>
                  <div className="startup-item-right">
                    <span className={`startup-status-badge ${item.enabled ? 'on' : 'off'}`}>
                      {item.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      className={`startup-toggle ${item.enabled ? 'on' : 'off'}`}
                      onClick={() => toggle(item)}
                      disabled={toggling[item.name]}
                    >
                      {toggling[item.name]
                        ? <div className="startup-btn-spinner" />
                        : item.enabled
                          ? <ToggleRight size={22} />
                          : <ToggleLeft size={22} />
                      }
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      </div>{/* page-main */}

      <aside className="page-sidebar">
        <div className="psb-card">
          <div className="psb-title"><Zap size={11} /> Impact Summary</div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">High impact on</span>
            <span className="psb-stat-val" style={{color: highImpact > 0 ? '#e03030' : undefined}}>{highImpact}</span>
          </div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">Med impact on</span>
            <span className="psb-stat-val" style={{color: medImpact > 0 ? '#f59e0b' : undefined}}>{medImpact}</span>
          </div>
          <div className="psb-divider" />
          <div className="psb-stat-row">
            <span className="psb-stat-label">Total enabled</span>
            <span className="psb-stat-val">{enabled}</span>
          </div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">Total disabled</span>
            <span className="psb-stat-val" style={{color:'#22c55e'}}>{disabled}</span>
          </div>
        </div>

        <div className="psb-card">
          <div className="psb-title"><ShieldOff size={11} /> Safe to Disable</div>
          <ul className="psb-tips">
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Discord — opens on demand</li>
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> OneDrive — syncs when needed</li>
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Teams — launch manually</li>
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Spotify — start when you want it</li>
            <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}} /> Keep antivirus enabled</li>
          </ul>
        </div>

        <div className="psb-card">
          <div className="psb-title"><Lightbulb size={11} /> Tips</div>
          <ul className="psb-tips">
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Fewer startup apps = faster boot</li>
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> High impact items slow boot most</li>
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Use "Disable All" for gaming sessions</li>
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Re-enable if an app stops working</li>
          </ul>
        </div>
      </aside>
      </div>{/* page-body */}
    </div>
  );
}
