import React, { useState } from 'react';
import { Database, Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import './RegistryPage.css';

const COLOR = '#a855f7';

const HIVES = ['HKEY_LOCAL_MACHINE', 'HKEY_CURRENT_USER', 'HKEY_CLASSES_ROOT', 'HKEY_USERS', 'HKEY_CURRENT_CONFIG'];
const TYPES = ['REG_SZ', 'REG_DWORD', 'REG_QWORD', 'REG_BINARY', 'REG_MULTI_SZ', 'REG_EXPAND_SZ'];

const PRESETS = [
  { label: 'Disable Windows Telemetry', hive: 'HKEY_LOCAL_MACHINE', path: 'SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', name: 'AllowTelemetry', type: 'REG_DWORD', value: '0' },
  { label: 'Enable Dark Mode', hive: 'HKEY_CURRENT_USER', path: 'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize', name: 'AppsUseLightTheme', type: 'REG_DWORD', value: '0' },
  { label: 'Disable Action Center', hive: 'HKEY_CURRENT_USER', path: 'SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', name: 'DisableNotificationCenter', type: 'REG_DWORD', value: '1' },
  { label: 'Show File Extensions', hive: 'HKEY_CURRENT_USER', path: 'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'HideFileExt', type: 'REG_DWORD', value: '0' },
  { label: 'Disable Cortana', hive: 'HKEY_LOCAL_MACHINE', path: 'SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search', name: 'AllowCortana', type: 'REG_DWORD', value: '0' },
  { label: 'Faster Menu Show Delay', hive: 'HKEY_CURRENT_USER', path: 'Control Panel\\Desktop', name: 'MenuShowDelay', type: 'REG_SZ', value: '0' },
];

export default function RegistryPage({ addToast }) {
  const [hive, setHive] = useState('HKEY_LOCAL_MACHINE');
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('REG_DWORD');
  const [value, setValue] = useState('');
  const [applying, setApplying] = useState(false);
  const [entries, setEntries] = useState([]);
  const [editIdx, setEditIdx] = useState(null);

  const fullPath = `${hive}\\${path}`;

  const applyEntry = async (entry) => {
    if (!window.electronAPI) {
      addToast(`Simulated: ${entry.hive}\\${entry.path} → ${entry.name} = ${entry.value}`, 'info');
      return true;
    }
    try {
      const result = await window.electronAPI.applyTweak('registry-set', true, {
        hive: entry.hive,
        path: entry.path,
        name: entry.name,
        type: entry.type,
        value: entry.value,
      });
      return result?.success !== false;
    } catch {
      return false;
    }
  };

  const handleAdd = async () => {
    if (!path.trim() || !name.trim() || !value.trim()) {
      addToast('Fill in all fields before adding', 'error');
      return;
    }
    const entry = { hive, path: path.trim(), name: name.trim(), type, value: value.trim() };
    setApplying(true);
    const ok = await applyEntry(entry);
    setApplying(false);
    if (ok) {
      setEntries(prev => [...prev, entry]);
      setName(''); setValue('');
      addToast('Registry entry applied', 'success');
    } else {
      addToast('Failed to apply registry entry', 'error');
    }
  };

  const handleDelete = (idx) => {
    setEntries(prev => prev.filter((_, i) => i !== idx));
    addToast('Entry removed from list', 'info');
  };

  const loadPreset = (preset) => {
    setHive(preset.hive);
    setPath(preset.path);
    setName(preset.name);
    setType(preset.type);
    setValue(preset.value);
  };

  return (
    <div className="registry-page">
      <PageHeader icon={Database} title="Registry Editor" subtitle="Create and apply custom Windows registry entries" iconColor={COLOR} />

      <div className="registry-body">
        {/* Presets */}
        <div className="registry-section">
          <div className="registry-section-title">Quick Presets</div>
          <div className="registry-presets">
            {PRESETS.map((p, i) => (
              <button key={i} className="registry-preset-btn" onClick={() => loadPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="registry-section">
          <div className="registry-section-title">New Entry</div>
          <div className="registry-form">
            <div className="registry-row">
              <label>Hive</label>
              <select value={hive} onChange={e => setHive(e.target.value)} className="registry-select">
                {HIVES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="registry-row">
              <label>Path</label>
              <input
                className="registry-input"
                value={path}
                onChange={e => setPath(e.target.value)}
                placeholder="SOFTWARE\MyApp\Settings"
              />
            </div>
            <div className="registry-row">
              <label>Name</label>
              <input
                className="registry-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ValueName"
              />
            </div>
            <div className="registry-row">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="registry-select">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="registry-row">
              <label>Value</label>
              <input
                className="registry-input"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={type === 'REG_DWORD' ? '0 or 1' : 'Value data'}
              />
            </div>
            <div className="registry-preview">
              <span className="registry-preview-label">Preview:</span>
              <code>{fullPath} → {name || '<name>'} = {value || '<value>'} ({type})</code>
            </div>
            <button className="registry-apply-btn" onClick={handleAdd} disabled={applying}>
              {applying ? <><div className="registry-spinner" /> Applying...</> : <><Plus size={14} /> Apply & Save</>}
            </button>
          </div>
        </div>

        {/* Saved entries */}
        {entries.length > 0 && (
          <div className="registry-section">
            <div className="registry-section-title">Applied Entries ({entries.length})</div>
            <div className="registry-entries">
              {entries.map((e, i) => (
                <div key={i} className="registry-entry">
                  <div className="registry-entry-info">
                    <div className="registry-entry-path">{e.hive}\{e.path}</div>
                    <div className="registry-entry-meta">
                      <span className="registry-entry-name">{e.name}</span>
                      <span className="registry-entry-type">{e.type}</span>
                      <span className="registry-entry-value">{e.value}</span>
                    </div>
                  </div>
                  <button className="registry-delete-btn" onClick={() => handleDelete(i)} title="Remove from list">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
