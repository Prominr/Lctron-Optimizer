import React, { useState, useEffect, useRef } from 'react';
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
          const healthScore = Math.max(0, 100 - Math.min(100, procs.length * 0.5));
          const healthColor = healthScore > 70 ? '#22c55e' : healthScore > 40 ? '#f59e0b' : '#e03030';
          const healthLabel = healthScore > 70 ? 'Healthy' : healthScore > 40 ? 'Moderate' : 'Loaded';
          return (<>
            {/* System Health Ring */}
            <motion.div className="psb-card psb-accent-green"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
              <div className="psb-title"><Activity size={11} /> System Health</div>
              <div className="psb-ring-wrap">
                <div className="psb-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                    <circle cx="26" cy="26" r="22" fill="none" stroke={healthColor} strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={C}
                      strokeDashoffset={C * (1 - healthScore / 100)}
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '26px 26px', transition: 'stroke-dashoffset 0.6s ease' }} />
                  </svg>
                  <span className="psb-ring-text" style={{ color: healthColor }}>{Math.round(healthScore)}%</span>
                </div>
                <div className="psb-ring-info">
                  <div className="psb-ring-label" style={{ color: healthColor }}>{healthLabel}</div>
                  <div className="psb-ring-sub">{procs.length} processes</div>
                </div>
              </div>
              <div className="psb-stat-grid">
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{ color: COLOR }}>{procs.length}</div>
                  <div className="psb-stat-cell-label">Processes</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{ color: '#a78bfa' }}>{totalRAM.toFixed(0)}</div>
                  <div className="psb-stat-cell-label">RAM (MB)</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{ color: topCPU ? '#f87171' : '#555', fontSize: 10, paddingTop: 2 }}>{topCPU?.Name?.slice(0,8) || '—'}</div>
                  <div className="psb-stat-cell-label">Top CPU</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-live-dot" style={{ marginTop: 4, marginBottom: 2 }} />
                  <div className="psb-stat-cell-label">Live 3s</div>
                </div>
              </div>
            </motion.div>

            {/* RAM usage bar */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
              <div className="psb-title"><MemoryStick size={11} /> Memory Usage</div>
              <div className="psb-bar-row">
                <div className="psb-bar-header">
                  <span className="psb-bar-label">RAM In Use</span>
                  <span className="psb-bar-val" style={{ color: ramColor }}>{totalRAM.toFixed(0)} MB</span>
                </div>
                <div className="psb-bar-track">
                  <div className="psb-bar-fill" style={{ width: `${ramPct}%`, background: ramColor }} />
                </div>
              </div>
              {topRAM.length > 0 && (<>
                <div className="psb-rule">Top Consumers</div>
                {topRAM.slice(0, 5).map((p, i) => (
                  <div key={p.Id} className="psb-bar-row">
                    <div className="psb-bar-header">
                      <span className="psb-bar-label" style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.Name}</span>
                      <span className="psb-bar-val" style={{ color: '#a78bfa', fontSize: 10 }}>{(p.RAM||0).toFixed(0)} MB</span>
                    </div>
                    <div className="psb-bar-track">
                      <div className="psb-bar-fill" style={{ width: `${Math.min(100, ((p.RAM||0) / Math.max(totalRAM, 1)) * 100)}%`, background: i === 0 ? '#e03030' : i === 1 ? '#f59e0b' : '#a78bfa' }} />
                    </div>
                  </div>
                ))}
              </>)}
            </motion.div>

            {/* Tips */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.11 }}>
              <div className="psb-title"><Lightbulb size={11} /> Tips</div>
              <ul className="psb-tips">
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Kill chrome/msedge tabs to free RAM</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Search to instantly find a process</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}} /> Never kill system/svchost processes</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> List auto-refreshes every 3 seconds</li>
              </ul>
              <div className="psb-divider" />
              <div className="psb-tags">
                <span className="psb-tag green">Live</span>
                <span className="psb-tag purple">RAM</span>
                <span className="psb-tag red">CPU</span>
                <span className="psb-tag amber">Kill</span>
              </div>
            </motion.div>
          </>);
        })()}
      </aside>
      </div>{/* page-body */}
    </div>
  );
}
