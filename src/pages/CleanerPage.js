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
        <div className="psb-card">
          <div className="psb-title"><BarChart2 size={11} /> Selection</div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">Selected</span>
            <span className="psb-stat-val" style={{color:'#e03030'}}>{selectedCount} / {cleanerOptions.length}</span>
          </div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">With warnings</span>
            <span className="psb-stat-val" style={{color: warningCount > 0 ? '#f59e0b' : undefined}}>{warningCount}</span>
          </div>
          <div className="psb-divider" />
          <div className="psb-stat-row">
            <span className="psb-stat-label">Status</span>
            <span className="psb-stat-val" style={{color: done ? '#22c55e' : running ? '#f59e0b' : '#555'}}>
              {done ? 'Complete' : running ? 'Running' : 'Ready'}
            </span>
          </div>
          {scheduled && (
            <div className="psb-stat-row">
              <span className="psb-stat-label">Auto-clean</span>
              <span className="psb-stat-val" style={{color:'#22c55e'}}>At startup</span>
            </div>
          )}
        </div>

        <div className="psb-card">
          <div className="psb-title"><Info size={11} /> What Gets Cleaned</div>
          <p className="psb-info-text"><strong>Registry</strong> — invalid keys left by uninstalled apps.</p>
          <p className="psb-info-text"><strong>Temp/Cache</strong> — files Windows no longer needs.</p>
          <p className="psb-info-text"><strong>Thumbnails</strong> — image previews that waste disk space.</p>
          <p className="psb-info-text"><strong>Telemetry</strong> — diagnostic data sent to Microsoft.</p>
        </div>

        <div className="psb-card">
          <div className="psb-title"><Lightbulb size={11} /> Tips</div>
          <ul className="psb-tips">
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Run weekly for best results</li>
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Schedule for auto-clean at startup</li>
            <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}} /> Read warnings before enabling</li>
            <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}} /> Temp folder is always safe to clear</li>
          </ul>
        </div>
      </aside>
      </div>{/* page-body */}
    </div>
  );
}
