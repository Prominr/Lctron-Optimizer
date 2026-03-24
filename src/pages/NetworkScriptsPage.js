import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Play, CheckCircle, AlertTriangle, Info, RotateCcw, Crown, Lock, Zap, BarChart2, Lightbulb, Shield, Activity } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { usePremium } from '../context/PremiumContext';
import './NetworkScriptsPage.css';
import './PageSidebar.css';

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

  const appliedCount = scripts.filter(s => done[s.id]).length;

  return (
    <div className="netscripts-page">
      <PageHeader icon={Wifi} title="Network Scripts" subtitle="One-click network optimization scripts for gaming and performance" iconColor="#e03030" />

      <div className="page-body">
      <div className="page-main">
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
      </div>{/* page-main */}

      <aside className="page-sidebar">
        {(() => {
          const C = 2 * Math.PI * 22;
          const appliedCount = Object.values(done).filter(Boolean).length;
          const applyPct = scripts.length > 0 ? Math.round((appliedCount / scripts.length) * 100) : 0;
          const ringColor = applyPct === 0 ? '#444' : applyPct < 50 ? '#f59e0b' : applyPct < 100 ? '#22c55e' : '#06b6d4';
          const ringLabel = applyPct === 0 ? 'Not Applied' : applyPct < 50 ? 'Partial' : applyPct < 100 ? 'Mostly Done' : 'All Applied';
          const scriptDetails = [
            { id: 'optimize-nic', short: 'NIC Settings', gain: '-5–15ms', what: 'Sets interrupt moderation, RSS queues, and buffer sizes on your NIC for minimum latency.', pro: true, color: '#e03030' },
            { id: 'optimize-bufferbloat', short: 'Bufferbloat Fix', gain: 'Jitter ↓70%', what: 'Limits queue size so packets don\'t pile up. Trades raw speed for consistent low ping.', pro: true, color: '#f59e0b' },
            { id: 'optimize-gaming-network', short: 'Gaming Profile', gain: 'Ping spikes ↓', what: 'Curated TCP/IP + DNS + NIC combination tuned for online gaming latency.', pro: true, color: '#a78bfa' },
            { id: 'reset-network-stack', short: 'Reset Stack', gain: 'Full reset', what: 'Winsock + TCP/IP reset. Use this to undo all tweaks if something goes wrong.', pro: false, color: '#888' },
            { id: 'flush-dns', short: 'Flush & DNS', gain: 'DNS < 5ms', what: 'Clears DNS cache and switches to Google (8.8.8.8) + Cloudflare (1.1.1.1) servers.', pro: false, color: '#22c55e' },
            { id: 'optimize-wifi-adapter', short: 'Wi-Fi Adapter', gain: 'WiFi lag ↓', what: 'Disables power saving + background scans on wireless adapter. Max TX power.', pro: true, color: '#06b6d4' },
          ];
          return (<>

            {/* ── Applied Status ── */}
            <motion.div className="psb-card psb-accent-red"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 }}>
              <div className="psb-title"><BarChart2 size={11} /> Scripts Applied</div>
              <div className="psb-ring-wrap">
                <div className="psb-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                    <circle cx="26" cy="26" r="22" fill="none" stroke={ringColor} strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={C}
                      strokeDashoffset={C*(1-applyPct/100)}
                      style={{transform:'rotate(-90deg)',transformOrigin:'26px 26px',transition:'stroke-dashoffset 0.6s ease'}}/>
                  </svg>
                  <span className="psb-ring-text" style={{color:ringColor}}>{applyPct}%</span>
                </div>
                <div className="psb-ring-info">
                  <div className="psb-ring-label" style={{color:ringColor}}>{ringLabel}</div>
                  <div className="psb-ring-sub">{appliedCount}/{scripts.length} scripts</div>
                  {running && (
                    <div style={{marginTop:4,display:'flex',alignItems:'center',gap:5}}>
                      <div className="psb-live-dot"/>
                      <span style={{fontSize:9,color:'#f59e0b',fontWeight:700}}>RUNNING…</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="psb-stat-grid">
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:'#22c55e'}}>{appliedCount}</div>
                  <div className="psb-stat-cell-label">Applied</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val">{scripts.length - appliedCount}</div>
                  <div className="psb-stat-cell-label">Remaining</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:running?'#f59e0b':'#555'}}>{running?'Run':'Idle'}</div>
                  <div className="psb-stat-cell-label">Status</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val">{scripts.length}</div>
                  <div className="psb-stat-cell-label">Total</div>
                </div>
              </div>
            </motion.div>

            {/* ── What Each Script Does ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 }}>
              <div className="psb-title"><Info size={11} /> What Each Script Does</div>
              {scriptDetails.map((s, i) => (
                <div key={s.id} style={{marginBottom: i < scriptDetails.length-1 ? 10 : 0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:done[s.id]?'#22c55e':s.color,flexShrink:0}}/>
                    <span style={{fontSize:10.5,fontWeight:700,color:done[s.id]?'#22c55e':undefined}}>{s.short}</span>
                    {s.pro && <span style={{fontSize:8,fontWeight:700,padding:'1px 4px',borderRadius:3,background:'rgba(167,139,250,0.12)',color:'#a78bfa'}}>PRO</span>}
                    <span style={{marginLeft:'auto',fontSize:9,fontWeight:700,color:done[s.id]?'#22c55e':s.color}}>{done[s.id]?'✓':s.gain}</span>
                  </div>
                  <p style={{margin:0,fontSize:10,color:'rgba(255,255,255,0.38)',lineHeight:1.45,paddingLeft:12}}>{s.what}</p>
                  {i < scriptDetails.length-1 && <div className="psb-divider" style={{marginTop:10}}/>}
                </div>
              ))}
            </motion.div>

            {/* ── Performance Gains ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
              <div className="psb-title"><Activity size={11} /> Expected Gains</div>
              <div className="psb-rule">After All Scripts Applied</div>
              {[
                { label: 'Avg Ping',      val: '-10–20ms',   color: '#22c55e', pct: done['optimize-nic']||done['optimize-gaming-network']?75:0 },
                { label: 'Ping Spikes',   val: '-60–80%',    color: '#06b6d4', pct: done['optimize-bufferbloat']?80:0 },
                { label: 'DNS Lookup',    val: '< 5ms',      color: '#a78bfa', pct: done['flush-dns']?90:0 },
                { label: 'WiFi Jitter',   val: '-40%',       color: '#f59e0b', pct: done['optimize-wifi-adapter']?70:0 },
                { label: 'NIC Latency',   val: '-15ms',      color: '#e03030', pct: done['optimize-nic']?85:0 },
              ].map(m => (
                <div key={m.label} className="psb-bar-row">
                  <div className="psb-bar-header">
                    <span className="psb-bar-label">{m.label}</span>
                    <span className="psb-bar-val" style={{color:m.pct>0?m.color:'#444'}}>{m.pct>0?m.val:'—'}</span>
                  </div>
                  <div className="psb-bar-track">
                    <div className="psb-bar-fill" style={{width:`${m.pct}%`,background:m.color}}/>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ── Ethernet vs WiFi ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.10 }}>
              <div className="psb-title"><Wifi size={11} /> Ethernet vs Wi-Fi</div>
              <div className="psb-rule" style={{color:'#22c55e'}}>Ethernet (Best)</div>
              <ul className="psb-tips" style={{marginBottom:8}}>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Run NIC Settings + Gaming Profile</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Bufferbloat fix works best on wired</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Skip Wi-Fi Adapter script (not needed)</li>
              </ul>
              <div className="psb-rule" style={{color:'#f59e0b'}}>Wi-Fi</div>
              <ul className="psb-tips">
                <li><CheckCircle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Run Wi-Fi Adapter script first</li>
                <li><CheckCircle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Bufferbloat fix less effective on WiFi</li>
                <li><AlertTriangle size={10} style={{color:'#888',flexShrink:0}}/> Ethernet always gives lower latency</li>
              </ul>
            </motion.div>

            {/* ── DNS Reference ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
              <div className="psb-title"><Shield size={11} /> DNS Reference</div>
              <div className="psb-rule">Servers Set by Flush Script</div>
              {[
                { name: 'Google Primary',      ip: '8.8.8.8',    color: '#22c55e', note: 'Fastest global avg' },
                { name: 'Google Secondary',    ip: '8.8.4.4',    color: '#22c55e', note: 'Fallback' },
                { name: 'Cloudflare Primary',  ip: '1.1.1.1',    color: '#06b6d4', note: 'Privacy focused' },
                { name: 'Cloudflare Secondary',ip: '1.0.0.1',    color: '#06b6d4', note: 'Fallback' },
              ].map(d => (
                <div key={d.ip} className="psb-live-row" style={{marginBottom:5}}>
                  <div className="psb-live-dot" style={{background:d.color}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:600}}>{d.name}</div>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.35)'}}>{d.note}</div>
                  </div>
                  <span style={{fontSize:9.5,fontWeight:700,color:d.color,fontFamily:'monospace'}}>{d.ip}</span>
                </div>
              ))}
            </motion.div>

            {/* ── Recovery & Tips ── */}
            <motion.div className="psb-card psb-accent-amber"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 }}>
              <div className="psb-title"><Lightbulb size={11} /> Tips &amp; Recovery</div>
              <div className="psb-rule">Best Order</div>
              <ul className="psb-tips">
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> <strong>1st:</strong> NIC Settings (foundation)</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> <strong>2nd:</strong> Gaming Profile or Bufferbloat</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> <strong>Last:</strong> Flush DNS (clears old cache)</li>
              </ul>
              <div className="psb-rule" style={{color:'#e03030'}}>If Something Breaks</div>
              <ul className="psb-tips">
                <li><AlertTriangle size={10} style={{color:'#e03030',flexShrink:0}}/> Run <strong>Reset Network Stack</strong> to undo all</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Reboot after reset for full effect</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Bufferbloat lowers raw speed — this is normal</li>
              </ul>
            </motion.div>

          </>);
        })()}
      </aside>
      </div>{/* page-body */}
    </div>
  );
}
