import React, { useState, useEffect } from 'react';
import { Shield, Plus, RotateCcw, RefreshCw, Clock, Crown, CheckCircle, AlertTriangle, Info, Lightbulb, HardDrive } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { usePremium } from '../context/PremiumContext';
import './RestorePage.css';

const FREE_LIMIT = 3;

const COLOR = '#22c55e';

export default function RestorePage({ addToast, setActivePage }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [desc, setDesc] = useState('Lctron Optimizer - Before Tweaks');
  const { isPremium } = usePremium();

  const load = async () => {
    setLoading(true);
    if (window.electronAPI) {
      const res = await window.electronAPI.getRestorePoints();
      setPoints(res.points || []);
    } else {
      setPoints([
        { Description: 'Lctron Optimizer - Before Tweaks', CreationTime: '3/15/2026 8:00:00 PM', SequenceNumber: 5 },
        { Description: 'Windows Update', CreationTime: '3/14/2026 2:00:00 PM', SequenceNumber: 4 },
        { Description: 'Install Application', CreationTime: '3/12/2026 10:30:00 AM', SequenceNumber: 3 },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!desc.trim()) { addToast('Enter a description', 'error'); return; }
    if (!isPremium && points.length >= FREE_LIMIT) {
      setActivePage && setActivePage('premium');
      return;
    }
    setCreating(true);
    if (window.electronAPI) {
      const res = await window.electronAPI.createRestorePoint(desc);
      if (!res.success) {
        addToast('Failed to create restore point. Try running as administrator.', 'error');
        setCreating(false);
        return;
      }
    }
    addToast('Restore point created successfully', 'success');
    setCreating(false);
    await load();
  };

  const restore = async (point) => {
    setRestoring(point.SequenceNumber);
    if (window.electronAPI) {
      const res = await window.electronAPI.restorePoint(point.SequenceNumber);
      if (!res.success) {
        addToast('Failed to restore. Try running as administrator.', 'error');
        setRestoring(null);
        return;
      }
    }
    addToast('Restore initiated. Your PC will restart.', 'info');
    setRestoring(null);
  };

  const formatDate = (raw) => {
    try { return new Date(raw).toLocaleString(); } catch { return raw; }
  };

  const latest = points[0];

  return (
    <div className="restore-page">
      <PageHeader icon={Shield} title="Restore Points" subtitle="Create and manage Windows System Restore points" iconColor={COLOR} />

      <div className="restore-body">
        {/* ── Main column ── */}
        <div className="restore-main">
          <div className="restore-create-card">
            <div className="restore-create-title">Create New Restore Point</div>
            <p className="restore-create-desc">It's recommended to create a restore point before applying major tweaks so you can revert if anything goes wrong.</p>
            <div className="restore-create-row">
              <input
                className="restore-input"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Restore point description..."
              />
              {!isPremium && points.length >= FREE_LIMIT ? (
                <button className="restore-create-btn" onClick={() => setActivePage && setActivePage('premium')}
                  style={{ background: 'rgba(167,139,250,0.12)', borderColor: 'rgba(167,139,250,0.3)', color: '#a78bfa' }}>
                  <Crown size={13} /> Unlock PRO
                </button>
              ) : (
                <button className="restore-create-btn" onClick={create} disabled={creating}>
                  {creating ? <><div className="restore-spinner" /> Creating...</> : <><Plus size={14} /> Create</>}
                </button>
              )}
            </div>
            {!isPremium && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                Free plan: {points.length}/{FREE_LIMIT} used &mdash;{' '}
                <span style={{ color: '#a78bfa', cursor: 'pointer' }} onClick={() => setActivePage && setActivePage('premium')}>Upgrade to PRO for unlimited</span>
              </p>
            )}
          </div>

          <div className="restore-list-header">
            <span>Existing Restore Points</span>
            <button className="restore-refresh-btn" onClick={load} disabled={loading}>
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="restore-loading"><div className="restore-spinner" /> Loading restore points...</div>
          ) : points.length === 0 ? (
            <div className="restore-empty">No restore points found. Create one above.</div>
          ) : (
            <div className="restore-list">
              {points.map((p) => (
                <div key={p.SequenceNumber} className="restore-item">
                  <div className="restore-item-icon">
                    <Shield size={16} style={{ color: COLOR }} />
                  </div>
                  <div className="restore-item-info">
                    <div className="restore-item-name">{p.Description}</div>
                    <div className="restore-item-date">
                      <Clock size={10} />
                      {formatDate(p.CreationTime)}
                      <span className="restore-item-seq">#{p.SequenceNumber}</span>
                    </div>
                  </div>
                  <button
                    className="restore-btn"
                    onClick={() => restore(p)}
                    disabled={restoring === p.SequenceNumber}
                    title="Restore to this point"
                  >
                    {restoring === p.SequenceNumber
                      ? <div className="restore-spinner-sm" />
                      : <><RotateCcw size={12} /> Restore</>
                    }
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="restore-note">
            <AlertTriangle size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
            Restoring will restart your PC. Save all open work before restoring.
          </div>
        </div>

        {/* ── Info sidebar ── */}
        <aside className="restore-sidebar">
          {/* Status card */}
          <div className="rsb-card">
            <div className="rsb-card-title"><HardDrive size={12} /> System Protection</div>
            <div className="rsb-status-row">
              <div className="rsb-status-dot active" />
              <span className="rsb-status-label">Enabled on C:\</span>
            </div>
            <div className="rsb-divider" />
            <div className="rsb-stat-row">
              <span className="rsb-stat-label">Total points</span>
              <span className="rsb-stat-val">{loading ? '—' : points.length}</span>
            </div>
            <div className="rsb-stat-row">
              <span className="rsb-stat-label">Latest</span>
              <span className="rsb-stat-val" style={{ fontSize: 10 }}>
                {latest ? formatDate(latest.CreationTime).split(',')[0] : '—'}
              </span>
            </div>
            {!isPremium && (
              <div className="rsb-stat-row">
                <span className="rsb-stat-label">Free slots</span>
                <span className="rsb-stat-val" style={{ color: points.length >= FREE_LIMIT ? '#ef4444' : '#22c55e' }}>
                  {Math.max(0, FREE_LIMIT - points.length)}/{FREE_LIMIT}
                </span>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="rsb-card">
            <div className="rsb-card-title"><Lightbulb size={12} /> Best Practices</div>
            <ul className="rsb-tips">
              <li><CheckCircle size={10} style={{ color: '#22c55e', flexShrink: 0 }} /> Create a point before any major tweak</li>
              <li><CheckCircle size={10} style={{ color: '#22c55e', flexShrink: 0 }} /> Use descriptive names with dates</li>
              <li><CheckCircle size={10} style={{ color: '#22c55e', flexShrink: 0 }} /> Keep 2–3 recent points minimum</li>
              <li><CheckCircle size={10} style={{ color: '#22c55e', flexShrink: 0 }} /> Save all work before restoring</li>
            </ul>
          </div>

          {/* How it works */}
          <div className="rsb-card">
            <div className="rsb-card-title"><Info size={12} /> How It Works</div>
            <p className="rsb-info-text">
              Windows System Restore snapshots your registry, system files and drivers. It does <strong>not</strong> affect personal files like documents or photos.
            </p>
            <p className="rsb-info-text" style={{ marginTop: 8 }}>
              Restoring takes a few minutes and requires a reboot. The process is fully reversible.
            </p>
          </div>

          {/* PRO upsell if not premium */}
          {!isPremium && (
            <button className="rsb-pro-card" onClick={() => setActivePage && setActivePage('premium')}>
              <Crown size={13} style={{ color: '#a78bfa' }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>Unlock Unlimited</div>
                <div style={{ fontSize: 10, color: 'rgba(167,139,250,0.6)', marginTop: 2 }}>Free plan limited to 3 restore points</div>
              </div>
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
