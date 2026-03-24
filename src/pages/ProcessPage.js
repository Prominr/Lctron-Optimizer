import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, XCircle, Search, Lightbulb, CheckCircle, AlertTriangle, MemoryStick, Cpu } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import './ProcessPage.css';
import './PageSidebar.css';

const COLOR = '#06b6d4';

export default function ProcessPage({ addToast }) {
  const [procs, setProcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [killing, setKilling] = useState({});
  const intervalRef = useRef(null);

  const load = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.getProcesses();
      setProcs(res.procs || []);
    } else {
      setProcs([
        { Name: 'chrome', Id: 1234, CPU: 12.4, RAM: 420.2 },
        { Name: 'discord', Id: 2345, CPU: 3.1, RAM: 210.5 },
        { Name: 'steam', Id: 3456, CPU: 0.5, RAM: 180.3 },
        { Name: 'explorer', Id: 4567, CPU: 0.2, RAM: 95.1 },
        { Name: 'nvcontainer', Id: 5678, CPU: 0.1, RAM: 88.4 },
        { Name: 'msedge', Id: 6789, CPU: 5.2, RAM: 350.7 },
        { Name: 'code', Id: 7890, CPU: 8.3, RAM: 512.0 },
        { Name: 'spotify', Id: 8901, CPU: 1.2, RAM: 145.6 },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 3000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const kill = async (proc) => {
    setKilling(prev => ({ ...prev, [proc.Id]: true }));
    if (window.electronAPI) {
      const res = await window.electronAPI.killProcess(proc.Id);
      if (!res.success) {
        addToast(`Failed to kill ${proc.Name}`, 'error');
        setKilling(prev => ({ ...prev, [proc.Id]: false }));
        return;
      }
    }
    setProcs(prev => prev.filter(p => p.Id !== proc.Id));
    setKilling(prev => ({ ...prev, [proc.Id]: false }));
    addToast(`Killed ${proc.Name}`, 'success');
  };

  const filtered = procs.filter(p =>
    p.Name.toLowerCase().includes(search.toLowerCase())
  );

  const totalRAM = procs.reduce((s, p) => s + (p.RAM || 0), 0);
  const totalCPU = procs.reduce((s, p) => s + (p.CPU || 0), 0);
  const topRAM = [...procs].sort((a, b) => (b.RAM || 0) - (a.RAM || 0)).slice(0, 4);
  const topCPU = [...procs].sort((a, b) => (b.CPU || 0) - (a.CPU || 0)).slice(0, 1)[0];

  return (
    <div className="process-page">
      <PageHeader icon={Activity} title="Process Manager" subtitle="Live view of running processes sorted by RAM usage" iconColor={COLOR} />

      <div className="process-stats">
        <div className="process-stat">
          <span className="process-stat-val" style={{ color: COLOR }}>{procs.length}</span>
          <span className="process-stat-label">Processes</span>
        </div>
        <div className="process-stat">
          <span className="process-stat-val" style={{ color: '#a78bfa' }}>{totalRAM.toFixed(0)} MB</span>
          <span className="process-stat-label">Total RAM</span>
        </div>
        <div className="process-stat">
          <span className="process-stat-val" style={{ color: '#f87171' }}>{totalCPU.toFixed(1)}s</span>
          <span className="process-stat-label">Total CPU</span>
        </div>
        <div className="process-search-wrap">
          <Search size={13} />
          <input
            className="process-search"
            placeholder="Search process..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="process-refresh-btn" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <div className="page-body" style={{alignItems:'flex-start'}}>
      <div className="page-main">
      <div className="process-table-wrap">
        <div className="process-table-head">
          <span className="col-name">Name</span>
          <span className="col-pid">PID</span>
          <span className="col-cpu">CPU (s)</span>
          <span className="col-ram">RAM (MB)</span>
          <span className="col-action"></span>
        </div>
        <div className="process-list">
          {loading && procs.length === 0 ? (
            <div className="process-loading"><div className="process-spinner" /> Loading processes...</div>
          ) : filtered.length === 0 ? (
            <div className="process-loading">No processes found</div>
          ) : filtered.map(proc => (
            <div key={proc.Id} className="process-row">
              <span className="col-name process-name">{proc.Name}</span>
              <span className="col-pid process-pid">{proc.Id}</span>
              <span className="col-cpu process-cpu">{(proc.CPU || 0).toFixed(1)}</span>
              <span className="col-ram process-ram">
                <span className="ram-bar-wrap">
                  <span className="ram-bar" style={{ width: `${Math.min((proc.RAM / 800) * 100, 100)}%` }} />
                </span>
                {(proc.RAM || 0).toFixed(0)}
              </span>
              <span className="col-action">
                <button
                  className="process-kill-btn"
                  onClick={() => kill(proc)}
                  disabled={killing[proc.Id]}
                  title={`Kill ${proc.Name}`}
                >
                  {killing[proc.Id]
                    ? <div className="process-kill-spinner" />
                    : <XCircle size={14} />
                  }
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="process-auto-refresh">Auto-refreshes every 3 seconds</div>
      </div>{/* page-main */}

      <aside className="page-sidebar">
        {(() => {
          const C = 2 * Math.PI * 22;
          const maxRAM = 16384;
          const ramPct = Math.min(100, Math.round((totalRAM / maxRAM) * 100));
          const ramColor = ramPct < 50 ? '#22c55e' : ramPct < 75 ? '#f59e0b' : '#e03030';
          const ramLabel = ramPct < 50 ? 'Normal' : ramPct < 75 ? 'Moderate' : 'High Pressure';
          const healthScore = Math.max(10, 100 - Math.min(50, procs.length * 0.25) - Math.min(50, ramPct * 0.5));
          const healthColor = healthScore > 65 ? '#22c55e' : healthScore > 40 ? '#f59e0b' : '#e03030';
          const healthLabel = healthScore > 65 ? 'Healthy' : healthScore > 40 ? 'Moderate' : 'Under Load';
          const topRAMProcesses = [...procs].sort((a,b) => (b.RAM||0)-(a.RAM||0)).slice(0,5);
          const topCPUProcesses = [...procs].filter(p => (p.CPU||0) > 0).sort((a,b) => (b.CPU||0)-(a.CPU||0)).slice(0,3);
          const safeToKill = ['chrome','msedge','discord','spotify','teams','onedrive','steam'];
          const killable = topRAMProcesses.filter(p => safeToKill.some(k => p.Name?.toLowerCase().includes(k)));
          return (<>

            {/* ── Health Ring ── */}
            <motion.div className="psb-card psb-accent-blue"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 }}>
              <div className="psb-title"><Activity size={11} /> System Health</div>
              <div className="psb-ring-wrap">
                <div className="psb-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                    <circle cx="26" cy="26" r="22" fill="none" stroke={healthColor} strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={C}
                      strokeDashoffset={C*(1-healthScore/100)}
                      style={{transform:'rotate(-90deg)',transformOrigin:'26px 26px',transition:'stroke-dashoffset 0.6s ease'}}/>
                  </svg>
                  <span className="psb-ring-text" style={{color:healthColor}}>{Math.round(healthScore)}%</span>
                </div>
                <div className="psb-ring-info">
                  <div className="psb-ring-label" style={{color:healthColor}}>{healthLabel}</div>
                  <div className="psb-ring-sub">{procs.length} active processes</div>
                  <div style={{marginTop:4,display:'flex',alignItems:'center',gap:5}}>
                    <div className="psb-live-dot"/>
                    <span style={{fontSize:9,color:'#22c55e',fontWeight:700}}>LIVE · 3s refresh</span>
                  </div>
                </div>
              </div>
              <div className="psb-stat-grid">
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:COLOR}}>{procs.length}</div>
                  <div className="psb-stat-cell-label">Processes</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:ramColor}}>{totalRAM.toFixed(0)}</div>
                  <div className="psb-stat-cell-label">RAM MB</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:'#f87171',fontSize:11}}>{topCPU?.Name?.slice(0,7)||'—'}</div>
                  <div className="psb-stat-cell-label">Top CPU</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:ramColor,fontSize:11}}>{ramLabel.split(' ')[0]}</div>
                  <div className="psb-stat-cell-label">Mem Press.</div>
                </div>
              </div>
            </motion.div>

            {/* ── Memory Analysis ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 }}>
              <div className="psb-title"><MemoryStick size={11} /> Memory Analysis</div>
              <div className="psb-bar-row">
                <div className="psb-bar-header">
                  <span className="psb-bar-label">Total In Use</span>
                  <span className="psb-bar-val" style={{color:ramColor}}>{totalRAM.toFixed(0)} MB  <span style={{opacity:0.5,fontWeight:400}}>/ ~{maxRAM} MB</span></span>
                </div>
                <div className="psb-bar-track" style={{height:6}}>
                  <div className="psb-bar-fill" style={{width:`${ramPct}%`,background:`linear-gradient(90deg,${ramColor}aa,${ramColor})`}}/>
                </div>
              </div>
              <div className="psb-rule">Top RAM Consumers</div>
              {topRAMProcesses.map((p,i) => {
                const barColors = ['#e03030','#f59e0b','#a78bfa','#06b6d4','#22c55e'];
                return (
                  <div key={p.Id||i} className="psb-bar-row">
                    <div className="psb-bar-header">
                      <span className="psb-bar-label" style={{maxWidth:105,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.Name}</span>
                      <span className="psb-bar-val" style={{color:barColors[i],fontSize:10}}>{(p.RAM||0).toFixed(0)} MB</span>
                    </div>
                    <div className="psb-bar-track">
                      <div className="psb-bar-fill" style={{width:`${Math.min(100,((p.RAM||0)/Math.max(totalRAM,1))*100)}%`,background:barColors[i]}}/>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* ── CPU Activity ── */}
            {topCPUProcesses.length > 0 && (
              <motion.div className="psb-card psb-accent-red"
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.10 }}>
                <div className="psb-title" style={{color:'#f87171'}}><Cpu size={11} /> CPU Hogs</div>
                {topCPUProcesses.map((p,i) => (
                  <div key={p.Id||i} className="psb-live-row" style={{borderColor:'rgba(248,113,113,0.15)',background:'rgba(248,113,113,0.03)'}}>
                    <div className="psb-live-dot" style={{background:'#f87171',animationDelay:`${i*0.4}s`}}/>
                    <span className="psb-live-name">{p.Name}</span>
                    <span className="psb-live-val" style={{color:'#f87171'}}>{(p.CPU||0).toFixed(1)}%</span>
                  </div>
                ))}
                <div className="psb-rule">RAM Killable</div>
                {killable.length > 0 ? killable.slice(0,3).map((p,i) => (
                  <div key={p.Id||i} className="psb-stat-row" style={{fontSize:10}}>
                    <span className="psb-stat-label">{p.Name}</span>
                    <span className="psb-stat-val" style={{color:'#f59e0b',fontSize:10}}>{(p.RAM||0).toFixed(0)} MB</span>
                  </div>
                )) : <p className="psb-info-text">No obvious candidates right now.</p>}
              </motion.div>
            )}

            {/* ── What Process Types Mean ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.13 }}>
              <div className="psb-title"><Info size={11} /> Process Type Guide</div>
              {[
                { label: 'svchost.exe',  color: '#e03030', risk: 'SYSTEM', what: 'Host for Windows services. Multiple instances are normal. Never end — will crash Windows.' },
                { label: 'csrss.exe',   color: '#e03030', risk: 'SYSTEM', what: 'Client/Server Runtime. Handles Win32 console and GUI shutdown. Critical — do not end.' },
                { label: 'lsass.exe',   color: '#e03030', risk: 'SYSTEM', what: 'Local Security Authority. Handles logins and security policies. Critical — never kill.' },
                { label: 'chrome.exe',  color: '#f59e0b', risk: 'USER',   what: 'Google Chrome. Spawns multiple processes per tab. Safe to end if browser is closed.' },
                { label: 'discord.exe', color: '#22c55e', risk: 'USER',   what: 'Discord client. Can be ended to free ~150 MB RAM. Relaunch manually when needed.' },
                { label: 'msedge.exe',  color: '#f59e0b', risk: 'USER',   what: 'Microsoft Edge. Like Chrome, spawns many processes. Safe to end if not in use.' },
              ].map((p, i, arr) => (
                <div key={p.label} style={{marginBottom: i<arr.length-1?9:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:p.color,flexShrink:0}}/>
                    <span style={{fontSize:10,fontWeight:700,fontFamily:'monospace'}}>{p.label}</span>
                    <span style={{marginLeft:'auto',fontSize:8,fontWeight:700,padding:'1px 5px',borderRadius:3,
                      background:p.risk==='SYSTEM'?'rgba(224,48,48,0.12)':'rgba(34,197,94,0.1)',
                      color:p.risk==='SYSTEM'?'#e03030':'#22c55e'}}>{p.risk}</span>
                  </div>
                  <p style={{margin:0,fontSize:10,color:'rgba(255,255,255,0.38)',lineHeight:1.45,paddingLeft:12}}>{p.what}</p>
                  {i<arr.length-1 && <div className="psb-divider" style={{marginTop:9}}/>}
                </div>
              ))}
            </motion.div>

            {/* ── RAM Pressure Guide ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <div className="psb-title"><MemoryStick size={11} /> RAM Pressure Levels</div>
              {[
                { label: 'Normal  < 50%',   color: '#22c55e', pct: 40,  what: 'Plenty of free memory. System running smoothly. No action needed.' },
                { label: 'Moderate 50–75%', color: '#f59e0b', pct: 65,  what: 'Getting full. Consider closing unused browser tabs and background apps.' },
                { label: 'High  75–90%',    color: '#f97316', pct: 82,  what: 'System may stutter. Kill chrome/discord/spotify to free significant RAM.' },
                { label: 'Critical > 90%',  color: '#e03030', pct: 95,  what: 'Windows starts using page file. Severe slowdowns. Close everything non-essential.' },
              ].map((r, i, arr) => (
                <div key={r.label} style={{marginBottom: i<arr.length-1?9:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:r.color,flexShrink:0}}/>
                    <span style={{fontSize:10,fontWeight:700}}>{r.label}</span>
                    <div style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,0.05)',marginLeft:4}}>
                      <div style={{width:`${r.pct}%`,height:'100%',borderRadius:2,background:r.color}}/>
                    </div>
                  </div>
                  <p style={{margin:0,fontSize:10,color:'rgba(255,255,255,0.38)',lineHeight:1.45,paddingLeft:12}}>{r.what}</p>
                  {i<arr.length-1 && <div className="psb-divider" style={{marginTop:9}}/>}
                </div>
              ))}
            </motion.div>

            {/* ── Safe & Never Kill ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.17 }}>
              <div className="psb-title"><Lightbulb size={11} /> Kill Reference</div>
              <div className="psb-rule" style={{color:'#22c55e'}}>Safe to End Task</div>
              {[
                { name: 'chrome / msedge',  save: '100–500+ MB', note: 'Close tabs first' },
                { name: 'discord',           save: '~150 MB',     note: 'Relaunch when needed' },
                { name: 'spotify',           save: '~200 MB',     note: 'Music pauses' },
                { name: 'teams',             save: '~300 MB',     note: 'If not in a meeting' },
                { name: 'steam',             save: '~100 MB',     note: 'Games still run' },
                { name: 'onedrive',          save: '~80 MB',      note: 'Sync stops temporarily' },
              ].map(item => (
                <div key={item.name} className="psb-live-row" style={{marginBottom:4}}>
                  <div className="psb-live-dot" style={{background:'#22c55e'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:600,fontFamily:'monospace'}}>{item.name}</div>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.35)'}}>{item.note}</div>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,color:'#22c55e',flexShrink:0}}>{item.save}</span>
                </div>
              ))}
              <div className="psb-rule" style={{color:'#e03030',marginTop:8}}>Never End</div>
              <div className="psb-tags">
                <span className="psb-tag red">svchost</span>
                <span className="psb-tag red">System</span>
                <span className="psb-tag red">csrss</span>
                <span className="psb-tag red">lsass</span>
                <span className="psb-tag red">winlogon</span>
                <span className="psb-tag red">smss</span>
              </div>
              <p className="psb-info-text" style={{marginTop:6}}>Killing any of these will cause an immediate BSOD or forced reboot.</p>
            </motion.div>

          </>);
        })()}
      </aside>
      </div>{/* page-body */}
    </div>
  );
}
