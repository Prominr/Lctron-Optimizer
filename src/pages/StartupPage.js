import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, ToggleLeft, ToggleRight, RefreshCw, FolderOpen, Zap, ShieldOff, Lightbulb, CheckCircle, AlertTriangle, Info } from 'lucide-react';
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

      <div className="page-body">
      <div className="page-main">
      <div className="startup-scroll">
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
      </div>{/* startup-scroll */}
      </div>{/* page-main */}

      <aside className="page-sidebar">
        {(() => {
          const C = 2 * Math.PI * 22;
          const total = items.length;
          const disabledPct = total > 0 ? Math.round((disabled / total) * 100) : 0;
          const ringColor = disabledPct === 0 ? '#444' : disabledPct < 33 ? '#f59e0b' : disabledPct < 66 ? '#22c55e' : '#06b6d4';
          const ringLabel = disabledPct === 0 ? 'Not Optimized' : disabledPct < 33 ? 'Light' : disabledPct < 66 ? 'Good' : 'Optimized';
          const estBootSaved = Math.round((highImpact * 2.5 + medImpact * 1.2) * 10) / 10;
          const impactBars = [
            { label: 'High Impact', count: highImpact, color: '#e03030', max: Math.max(total, 1), note: '~2.5s each' },
            { label: 'Med Impact',  count: medImpact,  color: '#f59e0b', max: Math.max(total, 1), note: '~1.2s each' },
            { label: 'Enabled',     count: enabled,    color: '#888',    max: Math.max(total, 1), note: 'still on' },
            { label: 'Disabled',    count: disabled,   color: '#22c55e', max: Math.max(total, 1), note: 'saved' },
          ];
          const safeItems = [
            { name: 'Discord',   sub: 'Opens on demand when needed',  color: '#a78bfa', safe: true },
            { name: 'OneDrive',  sub: 'Syncs when you need it',       color: '#3b82f6', safe: true },
            { name: 'Teams',     sub: 'Launch manually when needed',  color: '#06b6d4', safe: true },
            { name: 'Spotify',   sub: 'Start it when you want it',    color: '#22c55e', safe: true },
            { name: 'Steam',     sub: 'Open before gaming',           color: '#888',    safe: true },
            { name: 'Antivirus', sub: 'Keep ENABLED — security risk', color: '#f59e0b', safe: false },
          ];
          return (<>

            {/* ── Boot Optimization Ring ── */}
            <motion.div className="psb-card psb-accent-green"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 }}>
              <div className="psb-title"><Zap size={11} /> Boot Optimization</div>
              <div className="psb-ring-wrap">
                <div className="psb-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                    <circle cx="26" cy="26" r="22" fill="none" stroke={ringColor} strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={C}
                      strokeDashoffset={C*(1-disabledPct/100)}
                      style={{transform:'rotate(-90deg)',transformOrigin:'26px 26px',transition:'stroke-dashoffset 0.6s ease'}}/>
                  </svg>
                  <span className="psb-ring-text" style={{color:ringColor}}>{disabledPct}%</span>
                </div>
                <div className="psb-ring-info">
                  <div className="psb-ring-label" style={{color:ringColor}}>{ringLabel}</div>
                  <div className="psb-ring-sub">{disabled}/{total} disabled</div>
                  {estBootSaved > 0 && (
                    <div style={{marginTop:4,fontSize:9,color:'#22c55e',fontWeight:700}}>~{estBootSaved}s faster boot</div>
                  )}
                </div>
              </div>
              <div className="psb-stat-grid">
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val">{total}</div>
                  <div className="psb-stat-cell-label">Total</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:'#22c55e'}}>{disabled}</div>
                  <div className="psb-stat-cell-label">Disabled</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:highImpact>0?'#e03030':'#555'}}>{highImpact}</div>
                  <div className="psb-stat-cell-label">High Imp.</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:medImpact>0?'#f59e0b':'#555'}}>{medImpact}</div>
                  <div className="psb-stat-cell-label">Med Imp.</div>
                </div>
              </div>
            </motion.div>

            {/* ── Impact Breakdown ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 }}>
              <div className="psb-title"><PlayCircle size={11} /> Startup Breakdown</div>
              <div className="psb-rule">Impact Distribution</div>
              {impactBars.map(b => (
                <div key={b.label} className="psb-bar-row">
                  <div className="psb-bar-header">
                    <span className="psb-bar-label">{b.label}</span>
                    <span className="psb-bar-val" style={{color:b.count>0?b.color:'#555'}}>
                      {b.count} <span style={{opacity:0.5,fontSize:9}}>{b.note}</span>
                    </span>
                  </div>
                  <div className="psb-bar-track">
                    <div className="psb-bar-fill" style={{width:`${(b.count/b.max)*100}%`,background:b.color}}/>
                  </div>
                </div>
              ))}
              {estBootSaved > 0 && (
                <>
                  <div className="psb-rule">Estimated Savings</div>
                  <div className="psb-bar-row">
                    <div className="psb-bar-header">
                      <span className="psb-bar-label">Boot Time Saved</span>
                      <span className="psb-bar-val" style={{color:'#22c55e'}}>~{estBootSaved}s</span>
                    </div>
                    <div className="psb-bar-track">
                      <div className="psb-bar-fill" style={{width:`${Math.min(100, estBootSaved * 5)}%`,background:'#22c55e'}}/>
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            {/* ── Safe to Disable Guide ── */}
            <motion.div className="psb-card psb-accent-blue"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.10 }}>
              <div className="psb-title"><ShieldOff size={11} /> Safe to Disable</div>
              <div className="psb-rule">Common Safe Apps</div>
              <div className="psb-timeline">
                {safeItems.filter(s => s.safe).map(s => (
                  <div key={s.name} className="psb-tl-item">
                    <div className="psb-tl-left">
                      <div className="psb-tl-dot" style={{borderColor:s.color,background:`${s.color}18`}}/>
                      <div className="psb-tl-line"/>
                    </div>
                    <div className="psb-tl-body">
                      <div className="psb-tl-title">{s.name}</div>
                      <div className="psb-tl-sub">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="psb-rule" style={{color:'#f59e0b'}}>Never Disable</div>
              {safeItems.filter(s => !s.safe).map(s => (
                <div key={s.name} className="psb-live-row" style={{borderColor:'rgba(245,158,11,0.2)',background:'rgba(245,158,11,0.04)'}}>
                  <div className="psb-live-dot" style={{background:'#f59e0b'}}/>
                  <span className="psb-live-name">{s.name}</span>
                  <span className="psb-live-val" style={{color:'#f59e0b'}}>Keep ON</span>
                </div>
              ))}
            </motion.div>

            {/* ── What Impact Levels Mean ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.13 }}>
              <div className="psb-title"><Info size={11} /> Impact Level Guide</div>
              {[
                { label: 'High Impact',   color: '#e03030', pct: 85, what: 'Adds 3–10s to boot. Heavy CPU/disk usage during startup. Safe candidates for disabling.' },
                { label: 'Medium Impact', color: '#f59e0b', pct: 55, what: 'Adds 1–3s to boot. Some background activity. Review before disabling.' },
                { label: 'Low Impact',    color: '#22c55e', pct: 25, what: 'Adds < 1s to boot. Minimal overhead. Fine to leave enabled.' },
                { label: 'No Impact',     color: '#555',    pct: 5,  what: 'System services or drivers. Do NOT disable these.' },
              ].map((t, i, arr) => (
                <div key={t.label} style={{marginBottom: i<arr.length-1?9:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:t.color,flexShrink:0}}/>
                    <span style={{fontSize:10.5,fontWeight:700}}>{t.label}</span>
                    <div style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,0.05)',marginLeft:4}}>
                      <div style={{width:`${t.pct}%`,height:'100%',borderRadius:2,background:t.color}}/>
                    </div>
                  </div>
                  <p style={{margin:0,fontSize:10,color:'rgba(255,255,255,0.38)',lineHeight:1.45,paddingLeft:12}}>{t.what}</p>
                  {i<arr.length-1 && <div className="psb-divider" style={{marginTop:9}}/>}
                </div>
              ))}
            </motion.div>

            {/* ── Common Safe to Disable ── */}
            <motion.div className="psb-card psb-accent-green"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <div className="psb-title"><CheckCircle size={11} style={{color:'#22c55e'}}/> Common Safe Disables</div>
              <div className="psb-rule">Usually Fine to Turn Off</div>
              {[
                { name: 'Discord',          note: 'Launch manually when needed',    savings: '~1.5s' },
                { name: 'Steam',            note: 'Open when gaming',               savings: '~2s' },
                { name: 'Spotify',          note: 'Loads on first open anyway',     savings: '~1s' },
                { name: 'OneDrive',         note: 'If you don\'t use it',           savings: '~3s' },
                { name: 'Teams / Skype',    note: 'If not required for work',       savings: '~4s' },
                { name: 'Adobe Updater',    note: 'Updater — not the app itself',   savings: '~2s' },
                { name: 'Cortana',          note: 'Rarely needed at startup',       savings: '~1s' },
              ].map(item => (
                <div key={item.name} className="psb-live-row" style={{marginBottom:4}}>
                  <div className="psb-live-dot" style={{background:'#22c55e'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10.5,fontWeight:600}}>{item.name}</div>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.35)'}}>{item.note}</div>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,color:'#22c55e',flexShrink:0}}>{item.savings}</span>
                </div>
              ))}
            </motion.div>

            {/* ── Never Disable ── */}
            <motion.div className="psb-card psb-accent-red"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.17 }}>
              <div className="psb-title"><AlertTriangle size={11} style={{color:'#e03030'}}/> Never Disable</div>
              <div className="psb-rule">System Critical</div>
              {[
                { name: 'Windows Security',  note: 'Your antivirus/malware protection' },
                { name: 'GPU Drivers',        note: 'NVIDIA / AMD / Intel display drivers' },
                { name: 'Audio Service',      note: 'Realtek, SteelSeries sound drivers' },
                { name: 'VPN / Firewall',     note: 'Network security software' },
                { name: 'Backup Services',    note: 'Cloud sync, backup agents' },
              ].map(item => (
                <div key={item.name} className="psb-live-row" style={{marginBottom:4}}>
                  <div className="psb-live-dot" style={{background:'#e03030'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10.5,fontWeight:600}}>{item.name}</div>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.35)'}}>{item.note}</div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ── Tips ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.19 }}>
              <div className="psb-title"><Lightbulb size={11} /> Tips</div>
              <ul className="psb-tips">
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Disable high-impact items first for max gain</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Disable one at a time to stay safe</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Re-enable any time without reinstalling</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Unsure about an item? Google the exe name</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Keep security/driver items always enabled</li>
              </ul>
            </motion.div>

          </>);
        })()}
      </aside>
      </div>{/* page-body */}
    </div>
  );
}
