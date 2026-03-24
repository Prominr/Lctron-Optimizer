import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, CheckSquare, Square, ChevronDown, ChevronUp, Circle, CheckCircle2, Zap, Shield, HardDrive, Cpu, Monitor, Wifi, Info, AlertTriangle, CheckCircle, Clock, Target } from 'lucide-react';
import './DebloatPage.css';
import './PageSidebar.css';

const CATEGORIES = [
  {
    id: 'microsoft',
    label: 'Microsoft Bloat',
    icon: '🪟',
    apps: [
      { id: 'bing', name: 'Bing Search', pkg: 'Microsoft.BingSearch' },
      { id: 'cortana', name: 'Cortana', pkg: 'Microsoft.549981C3F5F10' },
      { id: 'teams', name: 'Teams (Personal)', pkg: 'MicrosoftTeams' },
      { id: 'xbox', name: 'Xbox', pkg: 'Microsoft.XboxApp' },
      { id: 'xbox-gi', name: 'Xbox Game Overlay', pkg: 'Microsoft.XboxGamingOverlay' },
      { id: 'xbox-id', name: 'Xbox Identity', pkg: 'Microsoft.XboxIdentityProvider' },
      { id: 'xbox-speech', name: 'Xbox Speech To Text', pkg: 'Microsoft.XboxSpeechToTextOverlay' },
      { id: 'maps', name: 'Maps', pkg: 'Microsoft.WindowsMaps' },
      { id: 'feedback', name: 'Feedback Hub', pkg: 'Microsoft.WindowsFeedbackHub' },
      { id: 'gethelp', name: 'Get Help', pkg: 'Microsoft.GetHelp' },
      { id: 'getstarted', name: 'Get Started / Tips', pkg: 'Microsoft.Getstarted' },
      { id: 'mail', name: 'Mail & Calendar', pkg: 'microsoft.windowscommunicationsapps' },
      { id: 'mixed', name: 'Mixed Reality Portal', pkg: 'Microsoft.MixedReality.Portal' },
      { id: 'oneconnect', name: 'OneConnect', pkg: 'Microsoft.OneConnect' },
      { id: 'people', name: 'People', pkg: 'Microsoft.People' },
      { id: 'phone', name: 'Phone Link', pkg: 'Microsoft.YourPhone' },
      { id: 'solitaire', name: 'Solitaire', pkg: 'Microsoft.MicrosoftSolitaireCollection' },
      { id: 'stickynotes', name: 'Sticky Notes', pkg: 'Microsoft.MicrosoftStickyNotes' },
      { id: 'todos', name: 'To Do', pkg: 'Microsoft.Todos' },
      { id: 'wallet', name: 'Wallet', pkg: 'Microsoft.Wallet' },
      { id: 'weather', name: 'Weather', pkg: 'Microsoft.BingWeather' },
      { id: 'news', name: 'News', pkg: 'Microsoft.BingNews' },
      { id: 'zune', name: 'Groove Music', pkg: 'Microsoft.ZuneMusic' },
      { id: 'zunevideo', name: 'Movies & TV', pkg: 'Microsoft.ZuneVideo' },
    ],
  },
  {
    id: 'thirdparty',
    label: 'Third-Party Bloat',
    icon: '📦',
    apps: [
      { id: 'candy', name: 'Candy Crush', pkg: 'king.com.CandyCrush' },
      { id: 'netflix', name: 'Netflix', pkg: 'Netflix' },
      { id: 'spotify', name: 'Spotify', pkg: 'SpotifyAB.SpotifyMusic' },
      { id: 'twitter', name: 'Twitter / X', pkg: 'Twitter' },
      { id: 'tiktok', name: 'TikTok', pkg: 'BytedancePte.TikTok' },
      { id: 'instagram', name: 'Instagram', pkg: 'Facebook.Instagram' },
      { id: 'facebook', name: 'Facebook', pkg: 'Facebook.Facebook' },
      { id: 'disney', name: 'Disney+', pkg: 'Disney.37853D22215B2' },
      { id: 'duolingo', name: 'Duolingo', pkg: 'Duolingo' },
      { id: 'amazon', name: 'Amazon', pkg: 'AmazonVideo' },
      { id: 'hulu', name: 'Hulu', pkg: 'HuluLLC.HuluPlus' },
      { id: 'prime', name: 'Prime Video', pkg: 'AmazonPrimeVideo' },
      { id: 'pinterest', name: 'Pinterest', pkg: 'Pinterest' },
      { id: 'dropbox', name: 'Dropbox', pkg: 'Dropbox' },
      { id: 'slack', name: 'Slack', pkg: 'Slack' },
    ],
  },
  {
    id: 'gaming',
    label: 'Gaming Bloat',
    icon: '🎮',
    apps: [
      { id: 'xboxbeta', name: 'Xbox Beta', pkg: 'Microsoft.GamingApp' },
      { id: 'playanywhere', name: 'Xbox Play Anywhere', pkg: 'Microsoft.Xbox.TCUI' },
      { id: 'gamebar', name: 'Game Bar', pkg: 'Microsoft.XboxGameCallableUI' },
      { id: 'origin', name: 'Origin', pkg: 'ElectronicArts.Origin' },
      { id: 'uplay', name: 'Ubisoft Connect', pkg: 'Ubisoft.Connect' },
      { id: 'epic', name: 'Epic Games Launcher', pkg: 'EpicGamesLauncher' },
      { id: 'steam', name: 'Steam', pkg: 'Valve.Steam' },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity Bloat',
    icon: '📊',
    apps: [
      { id: 'office', name: 'Office Trial', pkg: 'Microsoft.Office.Desktop' },
      { id: 'onedrive', name: 'OneDrive', pkg: 'Microsoft.OneDrive' },
      { id: 'skype', name: 'Skype', pkg: 'Microsoft.SkypeApp' },
      { id: 'powerpoint', name: 'PowerPoint Mobile', pkg: 'Microsoft.Office.PowerPoint' },
      { id: 'excel', name: 'Excel Mobile', pkg: 'Microsoft.Office.Excel' },
      { id: 'word', name: 'Word Mobile', pkg: 'Microsoft.Office.Word' },
    ],
  },
  {
    id: 'media',
    label: 'Media Bloat',
    icon: '🎵',
    apps: [
      { id: 'photos', name: 'Photos', pkg: 'Microsoft.Windows.Photos' },
      { id: 'videoeditor', name: 'Video Editor', pkg: 'Microsoft.WindowsVideoEditor' },
      { id: 'soundrecorder', name: 'Sound Recorder', pkg: 'Microsoft.WindowsSoundRecorder' },
      { id: 'paint', name: 'Paint 3D', pkg: 'Microsoft.MSPaint' },
      { id: '3dviewer', name: '3D Viewer', pkg: 'Microsoft.Microsoft3DViewer' },
    ],
  },
];

const UI_BLOAT_ITEMS = [
  { id: 'disable-widgets', name: 'Widgets', desc: 'Remove the Widgets button from taskbar and disable the news panel' },
  { id: 'disable-trending-searches', name: 'Trending Searches', desc: 'Stop Search from showing Bing trending search suggestions' },
  { id: 'disable-news-feed', name: 'News Feed', desc: 'Hide the News & Interests feed from taskbar' },
  { id: 'disable-search-highlights', name: 'Search Highlights', desc: 'Disable dynamic/animated Search box highlights' },
  { id: 'disable-start-recommendations', name: 'Start Recommendations', desc: 'Remove recommended apps and files from Start menu' },
  { id: 'disable-teams-chat', name: 'Teams Chat Icon', desc: 'Remove Teams Chat pinned icon from taskbar' },
  { id: 'disable-copilot-taskbar', name: 'Copilot Button', desc: 'Remove Copilot button from taskbar' },
  { id: 'disable-taskview', name: 'Task View Button', desc: 'Remove Task View button from taskbar' },
  { id: 'disable-cortana-taskbar', name: 'Cortana Taskbar', desc: 'Remove Cortana from taskbar search' },
  { id: 'disable-touch-keyboard', name: 'Touch Keyboard', desc: 'Hide touch keyboard button from taskbar' },
  { id: 'disable-ink-workspace', name: 'Ink Workspace', desc: 'Remove Windows Ink Workspace button' },
  { id: 'disable-meet-now', name: 'Meet Now', desc: 'Remove Meet Now icon from taskbar' },
  { id: 'disable-mypeople', name: 'My People', desc: 'Remove My People toolbar from taskbar' },
];

export default function DebloatPage({ addToast }) {
  const [selected, setSelected] = useState(new Set());
  const [collapsed, setCollapsed] = useState({});
  const [removing, setRemoving] = useState(false);
  const [results, setResults] = useState([]);

  const allAppItems = CATEGORIES.flatMap(c => c.apps.map(a => a.id));
  const allUiItems = UI_BLOAT_ITEMS.map(i => i.id);
  const allItems = [...allAppItems, ...allUiItems];

  const toggleItem = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCategory = (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) {
      const ids = catId === 'uibloat' ? allUiItems : [];
      const allSelected = ids.every(id => selected.has(id));
      setSelected(prev => {
        const next = new Set(prev);
        ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
        return next;
      });
      return;
    }
    const ids = cat.apps.map(a => a.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === allItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allItems));
    }
  };

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const removeSelected = async () => {
    if (!selected.size) return;
    setRemoving(true);
    setResults([]);
    const newResults = [];

    for (const cat of CATEGORIES) {
      for (const app of cat.apps) {
        if (!selected.has(app.id)) continue;
        try {
          if (window.electronAPI) {
            await window.electronAPI.debloatRemoveApp(app.pkg);
          }
          newResults.push({ name: app.name, ok: true });
        } catch {
          newResults.push({ name: app.name, ok: false });
        }
      }
    }

    for (const item of UI_BLOAT_ITEMS) {
      if (!selected.has(item.id)) continue;
      try {
        if (window.electronAPI) {
          await window.electronAPI.debloatUiTweak(item.id);
        }
        newResults.push({ name: item.name, ok: true });
      } catch {
        newResults.push({ name: item.name, ok: false });
      }
    }

    setResults(newResults);
    setRemoving(false);
    setSelected(new Set());
    const ok = newResults.filter(r => r.ok).length;
    addToast && addToast(`Removed ${ok} item${ok !== 1 ? 's' : ''} successfully`, ok > 0 ? 'success' : 'error');
  };

  return (
    <div className="debloat-page">
      <div className="debloat-toolbar">
        <button className="debloat-select-all" onClick={toggleAll}>
          {selected.size === allItems.length ? <CheckSquare size={13} /> : <Square size={13} />}
          {selected.size === allItems.length ? 'Deselect All' : 'Select All'}
        </button>
        <span className="debloat-count">{selected.size} selected</span>
        <button className="debloat-remove-btn" onClick={removeSelected} disabled={!selected.size || removing}>
          {removing ? <div className="debloat-spinner" /> : <Trash2 size={13} />}
          {removing ? 'Removing...' : 'Remove Selected'}
        </button>
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div className="debloat-results" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {results.map((r, i) => (
              <span key={i} className={`debloat-result-pill ${r.ok ? 'ok' : 'fail'}`}>{r.name}</span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="page-body">
        <div className="page-main">
          <div className="debloat-categories">
        {CATEGORIES.map(cat => {
          const catIds = cat.apps.map(a => a.id);
          const allCatSelected = catIds.every(id => selected.has(id));
          const isCollapsed = collapsed[cat.id];
          return (
            <div key={cat.id} className="debloat-category">
              <div className="debloat-cat-header">
                <button className="debloat-cat-check" onClick={() => toggleCategory(cat.id)}>
                  {allCatSelected
                    ? <CheckSquare size={15} style={{ color: '#ef4444' }} />
                    : <Square size={15} style={{ color: '#555' }} />}
                </button>
                <span className="debloat-cat-icon">{cat.icon}</span>
                <span className="debloat-cat-label">{cat.label}</span>
                <span className="debloat-cat-badge">{cat.apps.length}</span>
                <button className="debloat-cat-collapse" onClick={() => toggleCollapse(cat.id)}>
                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="debloat-apps-grid">
                      {cat.apps.map(app => {
                        const isSel = selected.has(app.id);
                        return (
                          <motion.div
                            key={app.id}
                            className={`debloat-app-card ${isSel ? 'selected' : ''}`}
                            onClick={() => toggleItem(app.id)}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <div className="debloat-app-icon">
                              <Trash2 size={14} style={{ color: isSel ? '#ef4444' : '#444' }} />
                            </div>
                            <span className="debloat-app-name">{app.name}</span>
                            <span className={`debloat-app-check ${isSel ? 'on' : ''}`}>
                              {isSel ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Windows UI Bloat */}
        <div className="debloat-category ui-bloat-category">
          <div className="debloat-cat-header">
            <button className="debloat-cat-check" onClick={() => toggleCategory('uibloat')}>
              {allUiItems.every(id => selected.has(id))
                ? <CheckSquare size={15} style={{ color: '#f97316' }} />
                : <Square size={15} style={{ color: '#555' }} />}
            </button>
            <span className="debloat-cat-icon">🛠️</span>
            <span className="debloat-cat-label">Windows UI Bloat</span>
            <span className="debloat-cat-badge">{UI_BLOAT_ITEMS.length}</span>
            <span className="debloat-reg-badge">Registry</span>
            <button className="debloat-cat-collapse" onClick={() => toggleCollapse('uibloat')}>
              {collapsed['uibloat'] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
          <AnimatePresence>
            {!collapsed['uibloat'] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="debloat-ui-grid">
                  {UI_BLOAT_ITEMS.map(item => {
                    const isSel = selected.has(item.id);
                    return (
                      <motion.button
                        key={item.id}
                        className={`debloat-ui-card ${isSel ? 'selected' : ''}`}
                        onClick={() => toggleItem(item.id)}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="debloat-ui-card-left">
                          <span className={`debloat-app-check ${isSel ? 'on-orange' : ''}`}>
                            {isSel ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                          </span>
                          <div className="debloat-ui-card-text">
                            <span className="debloat-ui-name">{item.name}</span>
                            <span className="debloat-ui-desc">{item.desc}</span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>{/* page-main */}

      <aside className="page-sidebar">
        <div className="psb-card">
          <div className="psb-title"><Trash2 size={11} /> Debloat Stats</div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">Total Items</span>
            <span className="psb-stat-val">{allItems.length}</span>
          </div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">Selected</span>
            <span className="psb-stat-val" style={{ color: selected.size > 0 ? '#ef4444' : undefined }}>{selected.size}</span>
          </div>
          <div className="psb-divider" />
          <div className="psb-stat-row">
            <span className="psb-stat-label">Microsoft</span>
            <span className="psb-stat-val">{CATEGORIES.find(c => c.id === 'microsoft')?.apps.length || 0}</span>
          </div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">Third-Party</span>
            <span className="psb-stat-val">{CATEGORIES.find(c => c.id === 'thirdparty')?.apps.length || 0}</span>
          </div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">Gaming</span>
            <span className="psb-stat-val">{CATEGORIES.find(c => c.id === 'gaming')?.apps.length || 0}</span>
          </div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">Productivity</span>
            <span className="psb-stat-val">{CATEGORIES.find(c => c.id === 'productivity')?.apps.length || 0}</span>
          </div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">Media</span>
            <span className="psb-stat-val">{CATEGORIES.find(c => c.id === 'media')?.apps.length || 0}</span>
          </div>
          <div className="psb-stat-row">
            <span className="psb-stat-label">UI Tweaks</span>
            <span className="psb-stat-val">{UI_BLOAT_ITEMS.length}</span>
          </div>
        </div>

        <div className="psb-card">
          <div className="psb-title"><Shield size={11} /> Safety Info</div>
          <div className="psb-status-row"><div className="psb-dot orange" /><span className="psb-status-label">App Removal</span></div>
          <p className="psb-info-text" style={{marginBottom:8}}>Permanent removal via PowerShell</p>
          <div className="psb-status-row"><div className="psb-dot blue" /><span className="psb-status-label">UI Tweaks</span></div>
          <p className="psb-info-text">Registry modifications</p>
        </div>

        <div className="psb-card">
          <div className="psb-title"><Info size={11} /> What Gets Removed</div>
          <ul className="psb-tips">
            <li><CheckCircle size={10} style={{color:'#ef4444',flexShrink:0}} /> Pre-installed Microsoft apps</li>
            <li><CheckCircle size={10} style={{color:'#ef4444',flexShrink:0}} /> Third-party bloatware</li>
            <li><CheckCircle size={10} style={{color:'#ef4444',flexShrink:0}} /> Gaming platform extras</li>
            <li><CheckCircle size={10} style={{color:'#ef4444',flexShrink:0}} /> Unwanted taskbar items</li>
            <li><CheckCircle size={10} style={{color:'#ef4444',flexShrink:0}} /> Search & Start menu bloat</li>
          </ul>
        </div>

        <div className="psb-card">
          <div className="psb-title"><AlertTriangle size={11} /> Warning</div>
          <p className="psb-info-text" style={{color:'#f59e0b',marginBottom:4}}>
            <strong>⚠️ Permanent Changes</strong>
          </p>
          <p className="psb-info-text" style={{marginBottom:8}}>
            App removal cannot be undone. Some apps may return with Windows updates.
          </p>
          <p className="psb-info-text">
            UI tweaks require Explorer restart or system reboot to take effect.
          </p>
        </div>

        <div className="psb-card">
          <div className="psb-title"><Zap size={11} /> Performance Gains</div>
          <div className="psb-status-row"><div className="psb-dot green" /><span className="psb-status-label">Faster Boot</span></div>
          <p className="psb-info-text" style={{marginBottom:8}}>Less startup processes</p>
          <div className="psb-status-row"><div className="psb-dot green" /><span className="psb-status-label">Cleaner UI</span></div>
          <p className="psb-info-text" style={{marginBottom:8}}>Minimal taskbar & Start</p>
          <div className="psb-status-row"><div className="psb-dot green" /><span className="psb-status-label">More Resources</span></div>
          <p className="psb-info-text">Free RAM & CPU cycles</p>
        </div>
      </aside>
      </div>{/* page-body */}

      <p className="debloat-note">⚠️ App removal is permanent. Registry tweaks take effect after restarting Explorer or rebooting. Some apps may reinstall with Windows Updates.</p>
    </div>
  );
}
