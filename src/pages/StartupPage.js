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
        {(() => {
          const C = 2 * Math.PI * 22;
          const total = items.length;
          const disabledPct = total > 0 ? Math.round((disabled / total) * 100) : 0;
          const ringColor = disabledPct === 0 ? '#444' : disabledPct < 33 ? '#f59e0b' : disabledPct < 66 ? '#22c55e' : '#06b6d4';
          const impactBars = [
            { label: 'High Impact', count: highImpact, color: '#e03030', max: Math.max(highImpact, medImpact, 1) },
            { label: 'Med Impact', count: medImpact, color: '#f59e0b', max: Math.max(highImpact, medImpact, 1) },
            { label: 'Disabled', count: disabled, color: '#22c55e', max: Math.max(total, 1) },
          ];
          const safeItems = [
            { name: 'Discord', sub: 'Opens on demand', color: '#a78bfa' },
            { name: 'OneDrive', sub: 'Syncs when needed', color: '#3b82f6' },
            { name: 'Teams', sub: 'Launch manually', color: '#06b6d4' },
            { name: 'Spotify', sub: 'Start when ready', color: '#22c55e' },
            { name: 'Antivirus', sub: 'Keep this enabled!', color: '#f59e0b' },
          ];
          return (<>
            {/* Boot impact ring */}
            <motion.div className="psb-card psb-accent-green"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
              <div className="psb-title"><Zap size={11} /> Boot Optimization</div>
              <div className="psb-ring-wrap">
                <div className="psb-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                    <circle cx="26" cy="26" r="22" fill="none" stroke={ringColor} strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={C}
                      strokeDashoffset={C * (1 - disabledPct / 100)}
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '26px 26px', transition: 'stroke-dashoffset 0.6s ease' }} />
                  </svg>
                  <span className="psb-ring-text" style={{ color: ringColor }}>{disabledPct}%</span>
                </div>
                <div className="psb-ring-info">
                  <div className="psb-ring-label" style={{ color: ringColor }}>
                    {disabledPct === 0 ? 'No Savings' : disabledPct < 33 ? 'Light' : disabledPct < 66 ? 'Good' : 'Optimized'}
                  </div>
                  <div className="psb-ring-sub">{disabled}/{total} disabled</div>
                </div>
              </div>
              <div className="psb-stat-grid">
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val">{total}</div>
                  <div className="psb-stat-cell-label">Total</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{ color: '#22c55e' }}>{disabled}</div>
                  <div className="psb-stat-cell-label">Disabled</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{ color: highImpact > 0 ? '#e03030' : undefined }}>{highImpact}</div>
                  <div className="psb-stat-cell-label">High Imp.</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{ color: medImpact > 0 ? '#f59e0b' : undefined }}>{medImpact}</div>
                  <div className="psb-stat-cell-label">Med Imp.</div>
                </div>
              </div>
            </motion.div>

            {/* Impact breakdown bars */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
              <div className="psb-title"><PlayCircle size={11} /> Impact Breakdown</div>
              {impactBars.map(b => (
                <div key={b.label} className="psb-bar-row">
                  <div className="psb-bar-header">
                    <span className="psb-bar-label">{b.label}</span>
                    <span className="psb-bar-val" style={{ color: b.count > 0 ? b.color : undefined }}>{b.count}</span>
                  </div>
                  <div className="psb-bar-track">
                    <div className="psb-bar-fill" style={{ width: `${(b.count / b.max) * 100}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Safe to disable timeline */}
            <motion.div className="psb-card psb-accent-blue"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.11 }}>
              <div className="psb-title"><ShieldOff size={11} /> Safe to Disable</div>
              <div className="psb-timeline">
                {safeItems.map(s => (
                  <div key={s.name} className="psb-tl-item">
                    <div className="psb-tl-left">
                      <div className="psb-tl-dot" style={{ borderColor: s.color }} />
                      <div className="psb-tl-line" />
                    </div>
                    <div className="psb-tl-body">
                      <div className="psb-tl-title">{s.name}</div>
                      <div className="psb-tl-sub">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 }}>
              <div className="psb-title"><Lightbulb size={11} /> Tips</div>
              <ul className="psb-tips">
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Fewer startup apps = faster boot</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> High impact items slow boot most</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Disable all before gaming sessions</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}} /> Re-enable if an app stops working</li>
              </ul>
            </motion.div>
          </>);
        })()}
      </aside>
      </div>{/* page-body */}
    </div>
  );
}
