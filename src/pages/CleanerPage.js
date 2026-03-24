import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Play, Clock, CheckCircle, AlertTriangle, Lightbulb, Info, BarChart2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import './CleanerPage.css';
import './PageSidebar.css';

const cleanerOptions = [
  { id: 'clean-registry', label: 'Clean Registry', desc: 'Removes invalid and orphaned registry entries.' },
  { id: 'run-device-cleanup', label: 'Run Device Cleanup', desc: 'Removes ghost devices and unused driver leftovers.' },
  { id: 'clear-explorer-history', label: 'Clear File Explorer History', desc: 'Clears recent files and folder history.', warning: 'Resets pinned items in file explorer' },
  { id: 'clear-logs-caches', label: 'Clear Logs and Caches', desc: 'Removes Windows event logs and system cache files.' },
  { id: 'clear-font-cache', label: 'Clear Font Cache', desc: 'Rebuilds the Windows font cache database.' },
  { id: 'clear-temp-folder', label: 'Clear System Temp Folder', desc: 'Deletes all files in the Windows Temp directory.' },
  { id: 'clear-telemetry-files', label: 'Clear Telemetry Files', desc: 'Removes diagnostic and telemetry data stored by Windows.' },
  { id: 'clear-temp-opt-files', label: 'Clear Temporary Optimization Files', desc: 'Removes leftover optimization and update cache files.' },
  { id: 'clear-thumbnail-cache', label: 'Clear Thumbnail Cache', desc: 'Deletes the Windows thumbnail image cache.' },
  { id: 'clear-context-menu', label: 'Clear Context Menu', desc: 'Cleans up third-party right-click context menu entries.', warning: 'Removes third-party right-click entries. Reinstall apps to restore.' },
  { id: 'empty-recycle-bin', label: 'Empty Recycle Bin', desc: 'Permanently deletes all items in the Recycle Bin.' },
];

export default function CleanerPage({ addToast }) {
  const [selected, setSelected] = useState(
    Object.fromEntries(cleanerOptions.map(o => [o.id, o.id !== 'clear-context-menu' && o.id !== 'empty-recycle-bin']))
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [progress, setProgress] = useState({ current: '', step: 0, total: 0 });

  const toggle = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

  const selectedList = cleanerOptions.filter(o => selected[o.id]);

  const runCleaner = async () => {
    if (selectedList.length === 0) { addToast('No options selected', 'error'); return; }
    setRunning(true);
    setDone(false);
    setProgress({ current: '', step: 0, total: selectedList.length });

    for (let i = 0; i < selectedList.length; i++) {
      const opt = selectedList[i];
      setProgress({ current: opt.label, step: i + 1, total: selectedList.length });
      try {
        if (window.electronAPI) {
          await window.electronAPI.applyTweak(opt.id, true);
        } else {
          await new Promise(r => setTimeout(r, 350));
        }
      } catch (e) {}
    }

    setRunning(false);
    setDone(true);
    addToast('Cleaner finished successfully!', 'success');
    setTimeout(() => setDone(false), 4000);
  };

  const scheduleCleaner = async () => {
    setScheduling(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.applyTweak('schedule-cleaner', true);
      } else {
        await new Promise(r => setTimeout(r, 800));
      }
      setScheduled(true);
      addToast('Cleaner scheduled at Windows startup', 'success');
    } catch (e) {
      addToast('Failed to schedule cleaner', 'error');
    }
    setScheduling(false);
  };

  const selectedCount = selectedList.length;
  const warningCount = cleanerOptions.filter(o => selected[o.id] && o.warning).length;

  return (
    <div className="cleaner-page">
      <PageHeader icon={Trash2} title="System Cleaner" subtitle="Remove junk files, caches and registry leftovers" iconColor="#e03030" />

      <div className="page-body">
      <div className="page-main">
      <div className="cleaner-scroll">
        <div className="cleaner-options-label">Options</div>

        <div className="cleaner-list">
          {cleanerOptions.map((opt, i) => (
            <motion.div
              key={opt.id}
              className={`cleaner-row ${selected[opt.id] ? 'on' : ''}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="cleaner-row-info">
                <span className="cleaner-row-label">{opt.label}</span>
                {opt.warning && (
                  <span className="cleaner-row-warning">
                    <AlertTriangle size={11} />
                    {opt.warning}
                  </span>
                )}
              </div>
              <button
                className={`toggle-switch ${selected[opt.id] ? 'on' : 'off'}`}
                onClick={() => toggle(opt.id)}
              >
                <motion.div
                  className="toggle-thumb"
                  animate={{ x: selected[opt.id] ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        {running && (
          <motion.div
            className="cleaner-progress"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="cleaner-progress-label">
              <span>{progress.current}</span>
              <span>{progress.step} / {progress.total}</span>
            </div>
            <div className="cleaner-progress-bar">
              <motion.div
                className="cleaner-progress-fill"
                animate={{ width: `${(progress.step / progress.total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* Buttons */}
        <div className="cleaner-buttons">
          <motion.button
            className={`cleaner-run-btn ${running ? 'loading' : ''} ${done ? 'done' : ''}`}
            onClick={runCleaner}
            disabled={running}
            whileHover={!running ? { scale: 1.01 } : {}}
            whileTap={!running ? { scale: 0.98 } : {}}
          >
            {running ? (
              <><div className="cleaner-spinner" /> Running Cleaner...</>
            ) : done ? (
              <><CheckCircle size={16} /> Cleaner Complete</>
            ) : (
              <><Play size={16} /> Run Cleaner</>
            )}
          </motion.button>

          <motion.button
            className={`cleaner-schedule-btn ${scheduled ? 'scheduled' : ''}`}
            onClick={scheduleCleaner}
            disabled={scheduling || scheduled}
            whileHover={!scheduled ? { scale: 1.01 } : {}}
            whileTap={!scheduled ? { scale: 0.98 } : {}}
          >
            {scheduling ? (
              <><div className="cleaner-spinner" /> Scheduling...</>
            ) : scheduled ? (
              <><CheckCircle size={16} /> Scheduled at Startup</>
            ) : (
              <><Clock size={16} /> Schedule Cleaner</>
            )}
          </motion.button>
        </div>
      </div>
      </div>{/* page-main */}

      <aside className="page-sidebar">
        {(() => {
          const C = 2 * Math.PI * 22;
          const selPct = cleanerOptions.length > 0 ? Math.round((selectedCount / cleanerOptions.length) * 100) : 0;
          const safeCount = cleanerOptions.filter(o => !o.warning).length;
          const ringColor = selPct === 0 ? '#444' : selPct < 50 ? '#f59e0b' : '#e03030';
          const statusColor = done ? '#22c55e' : running ? '#f59e0b' : '#888';
          const statusLabel = done ? 'Complete' : running ? 'Running' : 'Ready';
          const cleanCategories = [
            { label: 'Registry', sub: 'Invalid & orphaned keys', color: '#e03030', safe: false },
            { label: 'Temp & Cache', sub: 'System temp files', color: '#f59e0b', safe: true },
            { label: 'Thumbnails', sub: 'Image preview cache', color: '#06b6d4', safe: true },
            { label: 'Telemetry', sub: 'Microsoft diagnostic', color: '#a78bfa', safe: false },
            { label: 'Recycle Bin', sub: 'Permanently deletes', color: '#888', safe: true },
            { label: 'DNS Cache', sub: 'Network lookup cache', color: '#22c55e', safe: true },
          ];
          return (<>

            {/* ── Cleaner Status Ring ── */}
            <motion.div className="psb-card psb-accent-red"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 }}>
              <div className="psb-title"><BarChart2 size={11} /> Cleaner Status</div>
              <div className="psb-ring-wrap">
                <div className="psb-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                    <circle cx="26" cy="26" r="22" fill="none" stroke={ringColor} strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={C}
                      strokeDashoffset={C*(1-selPct/100)}
                      style={{transform:'rotate(-90deg)',transformOrigin:'26px 26px',transition:'stroke-dashoffset 0.6s ease'}}/>
                  </svg>
                  <span className="psb-ring-text" style={{color:ringColor}}>{selPct}%</span>
                </div>
                <div className="psb-ring-info">
                  <div className="psb-ring-label" style={{color:statusColor}}>{statusLabel}</div>
                  <div className="psb-ring-sub">{selectedCount}/{cleanerOptions.length} selected</div>
                  {scheduled && (
                    <div style={{marginTop:4,fontSize:9,color:'#22c55e',fontWeight:700}}>⏰ Auto-clean ON</div>
                  )}
                </div>
              </div>
              <div className="psb-stat-grid">
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val">{cleanerOptions.length}</div>
                  <div className="psb-stat-cell-label">Total Tasks</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:'#e03030'}}>{selectedCount}</div>
                  <div className="psb-stat-cell-label">Selected</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:warningCount>0?'#f59e0b':'#555'}}>{warningCount}</div>
                  <div className="psb-stat-cell-label">Warnings</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:'#22c55e'}}>{safeCount}</div>
                  <div className="psb-stat-cell-label">Safe Items</div>
                </div>
              </div>
              <div className="psb-rule">Task Breakdown</div>
              <div className="psb-bar-row">
                <div className="psb-bar-header"><span className="psb-bar-label">Safe Tasks</span><span className="psb-bar-val" style={{color:'#22c55e'}}>{safeCount}</span></div>
                <div className="psb-bar-track"><div className="psb-bar-fill" style={{width:`${(safeCount/Math.max(cleanerOptions.length,1))*100}%`,background:'#22c55e'}}/></div>
              </div>
              <div className="psb-bar-row">
                <div className="psb-bar-header"><span className="psb-bar-label">Warning Items</span><span className="psb-bar-val" style={{color:'#f59e0b'}}>{warningCount}</span></div>
                <div className="psb-bar-track"><div className="psb-bar-fill" style={{width:`${(warningCount/Math.max(cleanerOptions.length,1))*100}%`,background:'#f59e0b'}}/></div>
              </div>
            </motion.div>

            {/* ── Cleaning Pipeline ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 }}>
              <div className="psb-title"><Info size={11} /> What Gets Cleaned</div>
              <div className="psb-rule">Always Safe</div>
              <div className="psb-timeline">
                {cleanCategories.filter(c => c.safe).map(s => (
                  <div key={s.label} className="psb-tl-item">
                    <div className="psb-tl-left">
                      <div className="psb-tl-dot" style={{borderColor:s.color,background:`${s.color}18`}}/>
                      <div className="psb-tl-line"/>
                    </div>
                    <div className="psb-tl-body">
                      <div className="psb-tl-title">{s.label}</div>
                      <div className="psb-tl-sub">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="psb-rule">Needs Caution</div>
              <div className="psb-timeline">
                {cleanCategories.filter(c => !c.safe).map(s => (
                  <div key={s.label} className="psb-tl-item">
                    <div className="psb-tl-left">
                      <div className="psb-tl-dot" style={{borderColor:s.color}}/>
                      <div className="psb-tl-line"/>
                    </div>
                    <div className="psb-tl-body">
                      <div className="psb-tl-title">{s.label}</div>
                      <div className="psb-tl-sub">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── What Each Category Removes ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.10 }}>
              <div className="psb-title"><Info size={11} /> What Gets Removed</div>
              {[
                { label: 'Temp & Cache',  color: '#f59e0b', safe: true,  what: 'Windows temp files in %TEMP% and system32\\temp. Usually 0.5–5 GB. Always safe.' },
                { label: 'Thumbnails',    color: '#06b6d4', safe: true,  what: 'Thumbs.db and explorer thumbnail cache. Rebuilds automatically when folders are opened.' },
                { label: 'DNS Cache',     color: '#22c55e', safe: true,  what: 'Cached DNS lookups. Clears stale entries. No downside — resolves fresh after clean.' },
                { label: 'Recycle Bin',   color: '#888',    safe: true,  what: 'Permanently deletes files already in Recycle Bin. Check bin contents before running.' },
                { label: 'Registry',      color: '#e03030', safe: false, what: 'Removes orphaned registry keys from uninstalled apps. Low risk but back up first.' },
                { label: 'Telemetry',     color: '#a78bfa', safe: false, what: 'Clears Microsoft diagnostic data logs. Does not stop telemetry — just removes stored data.' },
              ].map((c, i, arr) => (
                <div key={c.label} style={{marginBottom: i<arr.length-1?9:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:c.color,flexShrink:0}}/>
                    <span style={{fontSize:10.5,fontWeight:700}}>{c.label}</span>
                    <span style={{marginLeft:'auto',fontSize:8,fontWeight:700,padding:'1px 5px',borderRadius:3,
                      background:c.safe?'rgba(34,197,94,0.1)':'rgba(245,158,11,0.1)',
                      color:c.safe?'#22c55e':'#f59e0b'}}>{c.safe?'SAFE':'CAUTION'}</span>
                  </div>
                  <p style={{margin:0,fontSize:10,color:'rgba(255,255,255,0.38)',lineHeight:1.45,paddingLeft:12}}>{c.what}</p>
                  {i<arr.length-1 && <div className="psb-divider" style={{marginTop:9}}/>}
                </div>
              ))}
            </motion.div>

            {/* ── Typical Space Savings ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
              <div className="psb-title"><BarChart2 size={11} /> Typical Space Savings</div>
              <div className="psb-rule">Avg Per Category</div>
              {[
                { label: 'Temp & Cache',  val: '0.5–5 GB',  pct: 85, color: '#f59e0b' },
                { label: 'Recycle Bin',   val: 'Varies',    pct: 50, color: '#888' },
                { label: 'Thumbnails',    val: '50–500 MB', pct: 40, color: '#06b6d4' },
                { label: 'Registry',      val: '~2 MB',     pct: 10, color: '#e03030' },
                { label: 'Telemetry',     val: '~100 MB',   pct: 25, color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} className="psb-bar-row">
                  <div className="psb-bar-header">
                    <span className="psb-bar-label">{s.label}</span>
                    <span className="psb-bar-val" style={{color:s.color}}>{s.val}</span>
                  </div>
                  <div className="psb-bar-track">
                    <div className="psb-bar-fill" style={{width:`${s.pct}%`,background:s.color}}/>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ── Schedule Guide ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 }}>
              <div className="psb-title"><Lightbulb size={11} /> Schedule &amp; Tips</div>
              <div className="psb-rule">Auto-Schedule</div>
              <p className="psb-info-text" style={{marginBottom:8}}>Enable the schedule toggle to auto-run selected tasks at Windows startup. Runs silently in the background — no prompts.</p>
              <div className="psb-rule">Recommended Frequency</div>
              {[
                { label: 'Temp & Cache',  freq: 'Weekly',    color: '#22c55e' },
                { label: 'Thumbnails',    freq: 'Monthly',   color: '#06b6d4' },
                { label: 'Registry',      freq: 'Monthly',   color: '#f59e0b' },
                { label: 'Recycle Bin',   freq: 'As needed', color: '#888' },
              ].map(r => (
                <div key={r.label} className="psb-live-row" style={{marginBottom:4}}>
                  <div className="psb-live-dot" style={{background:r.color}}/>
                  <span className="psb-live-name">{r.label}</span>
                  <span className="psb-live-val" style={{color:r.color}}>{r.freq}</span>
                </div>
              ))}
              <div className="psb-divider"/>
              <ul className="psb-tips">
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Check Recycle Bin before running</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Registry: create a restore point first</li>
              </ul>
            </motion.div>

          </>);
        })()}
      </aside>
      </div>{/* page-body */}
    </div>
  );
}
