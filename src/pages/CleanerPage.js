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
          const ringColor = selPct === 0 ? '#444' : selPct < 50 ? '#f59e0b' : '#e03030';
          const statusColor = done ? '#22c55e' : running ? '#f59e0b' : '#555';
          const statusLabel = done ? 'Complete' : running ? 'Running' : 'Ready';
          const cleanSteps = [
            { label: 'Registry', sub: 'Invalid keys removed', color: '#e03030' },
            { label: 'Temp & Cache', sub: 'Unused system files', color: '#f59e0b' },
            { label: 'Thumbnails', sub: 'Image preview cache', color: '#06b6d4' },
            { label: 'Telemetry', sub: 'MS diagnostic data', color: '#a78bfa' },
            { label: 'Recycle Bin', sub: 'Permanently deleted', color: '#888' },
          ];
          return (<>
            {/* Selection ring */}
            <motion.div className="psb-card psb-accent-red"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
              <div className="psb-title"><BarChart2 size={11} /> Cleaner Status</div>
              <div className="psb-ring-wrap">
                <div className="psb-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                    <circle cx="26" cy="26" r="22" fill="none" stroke={ringColor} strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={C}
                      strokeDashoffset={C * (1 - selPct / 100)}
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '26px 26px', transition: 'stroke-dashoffset 0.6s ease' }} />
                  </svg>
                  <span className="psb-ring-text" style={{ color: ringColor }}>{selPct}%</span>
                </div>
                <div className="psb-ring-info">
                  <div className="psb-ring-label" style={{ color: statusColor }}>{statusLabel}</div>
                  <div className="psb-ring-sub">{selectedCount}/{cleanerOptions.length} tasks selected</div>
                </div>
              </div>
              <div className="psb-stat-grid">
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{ color: '#e03030' }}>{selectedCount}</div>
                  <div className="psb-stat-cell-label">Selected</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{ color: warningCount > 0 ? '#f59e0b' : undefined }}>{warningCount}</div>
                  <div className="psb-stat-cell-label">Warnings</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{ color: statusColor }}>{statusLabel}</div>
                  <div className="psb-stat-cell-label">Status</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{ color: scheduled ? '#22c55e' : '#555' }}>{scheduled ? 'ON' : 'OFF'}</div>
                  <div className="psb-stat-cell-label">Scheduled</div>
                </div>
              </div>
            </motion.div>

            {/* What gets cleaned timeline */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
              <div className="psb-title"><Info size={11} /> Cleaning Pipeline</div>
              <div className="psb-timeline">
                {cleanSteps.map(s => (
                  <div key={s.label} className="psb-tl-item">
                    <div className="psb-tl-left">
                      <div className="psb-tl-dot" style={{ borderColor: s.color }} />
                      <div className="psb-tl-line" />
                    </div>
                    <div className="psb-tl-body">
                      <div className="psb-tl-title">{s.label}</div>
                      <div className="psb-tl-sub">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.11 }}>
              <div className="psb-title"><Lightbulb size={11} /> Tips</div>
              <ul className="psb-tips">
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Run weekly for consistent results</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Schedule for auto-clean at startup</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}} /> Read warnings before enabling items</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Temp folder is always safe to clear</li>
              </ul>
              <div className="psb-divider" />
              <div className="psb-tags">
                <span className="psb-tag green">Safe</span>
                <span className="psb-tag amber">Warning</span>
                <span className="psb-tag blue">Cache</span>
                <span className="psb-tag red">Registry</span>
              </div>
            </motion.div>
          </>);
        })()}
      </aside>
      </div>{/* page-body */}
    </div>
  );
}
