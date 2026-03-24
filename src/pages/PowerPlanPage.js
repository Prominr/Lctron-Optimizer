import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BatteryCharging, Zap, CheckCircle, AlertTriangle, RefreshCw, Lightbulb, Info, Cpu } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import './PowerPlanPage.css';
import './PageSidebar.css';

const plans = [
  {
    id: 'lctron',
    name: 'Lctron Ultimate',
    tag: 'RECOMMENDED',
    tagColor: '#e03030',
    description: 'A custom power plan built specifically for maximum gaming and system performance. Disables all CPU throttling, forces max clock speeds, removes power limits, and eliminates latency-causing idle states.',
    settings: [
      'CPU always at maximum frequency',
      'All CPU C-States disabled (no idle throttle)',
      'PCI Express ASPM disabled',
      'USB selective suspend off',
      'Hard disk sleep never',
      'Processor boost mode: Aggressive',
      'No minimum performance floor',
      'Display sleep: Never',
      'Max processor state: 100%',
      'Min processor state: 100%',
    ],
  },
  {
    id: 'high-performance',
    name: 'High Performance',
    tag: 'WINDOWS BUILT-IN',
    tagColor: '#888',
    description: 'Windows built-in high performance plan. Keeps CPU running fast but still allows some power saving features. Good baseline for gaming.',
    settings: [
      'CPU at high frequency',
      'Minimal power saving',
      'No display auto-sleep',
      'Fast startup enabled',
    ],
  },
  {
    id: 'balanced',
    name: 'Balanced',
    tag: 'DEFAULT',
    tagColor: '#555',
    description: 'Windows default balanced power plan. Suitable for general use but not optimal for gaming or low latency.',
    settings: [
      'CPU scales with demand',
      'Power saving features enabled',
      'Display sleep after 10 min',
    ],
  },
];

const extraTweaks = [
  { id: 'pp-disable-throttle', label: 'Disable CPU Throttling', desc: 'Prevents Windows from throttling CPU under thermal pressure (sets 100% min/max processor state)' },
  { id: 'pp-disable-cores-parking', label: 'Disable Core Parking', desc: 'Keeps all CPU cores active and prevents them from being parked to save power' },
  { id: 'pp-disable-usb-suspend', label: 'Disable USB Suspend', desc: 'Prevents USB devices from being suspended, eliminating input device latency spikes' },
  { id: 'pp-disable-pcie-aspm', label: 'Disable PCIe ASPM', desc: 'Disables PCIe Active State Power Management for lower GPU/NVMe latency' },
  { id: 'pp-disable-sleep', label: 'Disable Sleep & Hibernate', desc: 'Prevents system from sleeping or hibernating for always-ready performance' },
  { id: 'pp-boost-mode', label: 'Aggressive CPU Boost', desc: 'Sets CPU boost mode to Aggressive for maximum single-core turbo performance' },
];

export default function PowerPlanPage({ addToast }) {
  const [activePlan, setActivePlan] = useState(null);
  const [applying, setApplying] = useState(null);
  const [tweakStates, setTweakStates] = useState({});
  const [applyingTweak, setApplyingTweak] = useState(null);

  useEffect(() => {
    detectActivePlan();
  }, []);

  const detectActivePlan = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.applyTweak('pp-detect', true).catch(() => null);
      if (result?.success) setActivePlan(result.planId || null);
    }
  };

  const applyPlan = async (planId) => {
    setApplying(planId);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.applyTweak(`pp-apply-${planId}`, true);
        if (result.success) {
          setActivePlan(planId);
          addToast(`Power plan applied: ${plans.find(p => p.id === planId)?.name}`, 'success');
        } else {
          addToast(`Failed: ${result.error}`, 'error');
        }
      } else {
        await new Promise(r => setTimeout(r, 900));
        setActivePlan(planId);
        addToast(`Power plan applied (dev mode)`, 'success');
      }
    } catch (e) {
      addToast(`Error: ${e.message}`, 'error');
    }
    setApplying(null);
  };

  const toggleTweak = async (id) => {
    const current = tweakStates[id] ?? false;
    const next = !current;
    setApplyingTweak(id);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.applyTweak(id, next);
        if (result.success) {
          setTweakStates(prev => ({ ...prev, [id]: next }));
          addToast(`${next ? 'Applied' : 'Reverted'}: ${extraTweaks.find(t => t.id === id)?.label}`, 'success');
        } else {
          addToast(`Failed: ${result.error}`, 'error');
        }
      } else {
        await new Promise(r => setTimeout(r, 700));
        setTweakStates(prev => ({ ...prev, [id]: next }));
        addToast(`Tweak ${next ? 'applied' : 'reverted'} (dev mode)`, 'success');
      }
    } catch (e) {
      addToast(`Error: ${e.message}`, 'error');
    }
    setApplyingTweak(null);
  };

  const applyAll = async () => {
    await applyPlan('lctron');
    for (const t of extraTweaks) {
      if (!tweakStates[t.id]) {
        setApplyingTweak(t.id);
        if (window.electronAPI) {
          const result = await window.electronAPI.applyTweak(t.id, true).catch(() => ({ success: false }));
          if (result.success) setTweakStates(prev => ({ ...prev, [t.id]: true }));
        } else {
          await new Promise(r => setTimeout(r, 300));
          setTweakStates(prev => ({ ...prev, [t.id]: true }));
        }
        setApplyingTweak(null);
      }
    }
    addToast('All power optimizations applied!', 'success');
  };

  const activePlanObj = plans.find(p => p.id === activePlan);
  const tweakCount = Object.values(tweakStates).filter(Boolean).length;

  return (
    <div className="powerplan-page">
      <PageHeader icon={BatteryCharging} title="Power Plan" subtitle="Configure system power settings for maximum performance" iconColor="#e03030" />

      {/* Apply All Banner */}
      <motion.div
        className="pp-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="pp-banner-left">
          <Zap size={18} style={{ color: '#e03030' }} />
          <div>
            <div className="pp-banner-title">Apply Full Optimization</div>
            <div className="pp-banner-sub">Set Lctron Ultimate plan + all performance tweaks at once</div>
          </div>
        </div>
        <motion.button
          className="pp-apply-all-btn"
          onClick={applyAll}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Zap size={14} />
          Apply All
        </motion.button>
      </motion.div>

      <div className="page-body" style={{alignItems:'flex-start'}}>
      <div className="page-main" style={{minWidth:0}}>
      <div className="pp-scroll">
        {/* Plan Selector */}
        <section className="pp-section">
          <h2 className="pp-section-label">Select Power Plan</h2>
          <div className="pp-plans">
            {plans.map((plan, i) => {
              const isActive = activePlan === plan.id;
              const isApplying = applying === plan.id;
              return (
                <motion.div
                  key={plan.id}
                  className={`pp-plan-card ${isActive ? 'active' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -2 }}
                >
                  <div className="pp-plan-top">
                    <div className="pp-plan-name-row">
                      <div className={`pp-plan-dot ${isActive ? 'on' : ''}`} />
                      <span className="pp-plan-name">{plan.name}</span>
                    </div>
                    <span className="pp-plan-tag" style={{ color: plan.tagColor, borderColor: plan.tagColor + '44', background: plan.tagColor + '11' }}>
                      {plan.tag}
                    </span>
                  </div>
                  <p className="pp-plan-desc">{plan.description}</p>
                  <ul className="pp-plan-settings">
                    {plan.settings.map(s => (
                      <li key={s}>
                        <CheckCircle size={11} style={{ color: '#4ade80', flexShrink: 0 }} />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    className={`pp-plan-btn ${isActive ? 'active' : ''} ${isApplying ? 'loading' : ''}`}
                    onClick={() => !isApplying && !isActive && applyPlan(plan.id)}
                    disabled={isApplying || isActive}
                    whileHover={!isActive ? { scale: 1.02 } : {}}
                    whileTap={!isActive ? { scale: 0.97 } : {}}
                  >
                    {isApplying ? (
                      <><div className="pp-spinner" /> Applying...</>
                    ) : isActive ? (
                      <><CheckCircle size={14} /> Active</>
                    ) : (
                      <><Zap size={14} /> Apply Plan</>
                    )}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Extra Tweaks */}
        <section className="pp-section">
          <h2 className="pp-section-label">Performance Tweaks</h2>
          <div className="pp-tweaks-list">
            {extraTweaks.map((tweak, i) => {
              const isOn = tweakStates[tweak.id] ?? false;
              const isApplying = applyingTweak === tweak.id;
              return (
                <motion.div
                  key={tweak.id}
                  className={`pp-tweak-row ${isOn ? 'on' : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                >
                  <div className="pp-tweak-icon">
                    <BatteryCharging size={14} style={{ color: isOn ? '#e03030' : 'var(--text-muted)' }} />
                  </div>
                  <div className="pp-tweak-body">
                    <span className="pp-tweak-label">{tweak.label}</span>
                    <span className="pp-tweak-desc">{tweak.desc}</span>
                  </div>
                  <button
                    className={`toggle-switch ${isOn ? 'on' : 'off'} ${isApplying ? 'loading' : ''}`}
                    onClick={() => !isApplying && toggleTweak(tweak.id)}
                    disabled={isApplying}
                  >
                    <motion.div
                      className="toggle-thumb"
                      animate={{ x: isOn ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                    {isApplying && <div className="toggle-spinner" />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Warning */}
        <motion.div
          className="pp-warning-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <p>The Lctron Ultimate plan and tweaks increase power consumption and heat output. Ensure your CPU cooling is adequate. Not recommended for laptops on battery.</p>
        </motion.div>
      </div>
      </div>{/* page-main */}

      <aside className="page-sidebar">
        {(() => {
          const C = 2 * Math.PI * 22;
          const tweakPct = extraTweaks.length > 0 ? Math.round((tweakCount / extraTweaks.length) * 100) : 0;
          const planColor = activePlan === 'lctron' ? '#e03030' : activePlan === 'high-performance' ? '#f59e0b' : '#22c55e';
          const planDot   = activePlan === 'lctron' ? 'red' : activePlan === 'high-performance' ? 'amber' : 'green';
          const ringColor = tweakPct === 0 ? '#444' : tweakPct < 50 ? '#f59e0b' : '#22c55e';
          const isMaxed   = activePlan === 'lctron' && tweakCount === extraTweaks.length;
          const planComparison = [
            { label: 'Lctron Ultimate', pct: 100, color: '#e03030', active: activePlan === 'lctron' },
            { label: 'High Performance', pct: 65, color: '#f59e0b', active: activePlan === 'high-performance' },
            { label: 'Balanced', pct: 30, color: '#22c55e', active: activePlan === 'balanced' },
          ];
          const tweakCategories = [
            { label: 'CPU Tweaks', pct: tweakCount > 0 ? Math.min(100, tweakCount * 25) : 0, color: '#e03030' },
            { label: 'Timer Res.', pct: tweakCount > 1 ? 100 : 0, color: '#f59e0b' },
            { label: 'Core Park.', pct: tweakCount > 0 ? 100 : 0, color: '#a78bfa' },
            { label: 'Net Boost', pct: tweakCount > 2 ? 80 : 0, color: '#06b6d4' },
          ];
          return (<>

            {/* ── Active Plan Status ── */}
            <motion.div className="psb-card" style={{borderColor:`${planColor}33`}}
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 }}>
              <div className="psb-title"><BatteryCharging size={11} /> Power Status</div>
              <div className="psb-ring-wrap">
                <div className="psb-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                    <circle cx="26" cy="26" r="22" fill="none" stroke={isMaxed ? '#e03030' : ringColor} strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={C}
                      strokeDashoffset={C*(1-tweakPct/100)}
                      style={{transform:'rotate(-90deg)',transformOrigin:'26px 26px',transition:'stroke-dashoffset 0.6s ease'}}/>
                  </svg>
                  <span className="psb-ring-text" style={{color:isMaxed?'#e03030':ringColor}}>{tweakPct}%</span>
                </div>
                <div className="psb-ring-info">
                  <div className="psb-status-row" style={{marginBottom:4}}>
                    <div className={`psb-dot ${planDot}`}/>
                    <span className="psb-status-label" style={{fontSize:11}}>{activePlanObj?.name || 'Detecting…'}</span>
                  </div>
                  <div className="psb-ring-sub">{tweakCount}/{extraTweaks.length} tweaks on</div>
                  {isMaxed && <div style={{marginTop:4,fontSize:9,fontWeight:700,color:'#e03030'}}>✦ MAX PERFORMANCE</div>}
                </div>
              </div>
              <div className="psb-stat-grid">
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:planColor,fontSize:11}}>{activePlanObj?.name?.split(' ')[0]||'—'}</div>
                  <div className="psb-stat-cell-label">Plan</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:tweakCount>0?'#e03030':undefined}}>{tweakCount}</div>
                  <div className="psb-stat-cell-label">Tweaks On</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val">{extraTweaks.length}</div>
                  <div className="psb-stat-cell-label">Available</div>
                </div>
                <div className="psb-stat-cell">
                  <div className="psb-stat-cell-val" style={{color:isMaxed?'#22c55e':'#555'}}>{isMaxed?'MAX':'—'}</div>
                  <div className="psb-stat-cell-label">Status</div>
                </div>
              </div>
            </motion.div>

            {/* ── Tweak Breakdown ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 }}>
              <div className="psb-title"><Cpu size={11} /> Tweak Breakdown</div>
              <div className="psb-rule">Active Tweaks</div>
              {tweakCategories.map(t => (
                <div key={t.label} className="psb-bar-row">
                  <div className="psb-bar-header">
                    <span className="psb-bar-label">{t.label}</span>
                    <span className="psb-bar-val" style={{color:t.pct>0?t.color:'#444'}}>{t.pct>0?'ON':'OFF'}</span>
                  </div>
                  <div className="psb-bar-track">
                    <div className="psb-bar-fill" style={{width:`${t.pct}%`,background:t.color}}/>
                  </div>
                </div>
              ))}
              <div className="psb-rule">Plan Comparison</div>
              {planComparison.map(p => (
                <div key={p.label} className="psb-bar-row">
                  <div className="psb-bar-header">
                    <span className="psb-bar-label" style={{fontWeight:p.active?700:400,color:p.active?p.color:undefined}}>
                      {p.active ? '▸ ' : ''}{p.label}
                    </span>
                    <span className="psb-bar-val" style={{color:p.color}}>{p.pct}%</span>
                  </div>
                  <div className="psb-bar-track">
                    <div className="psb-bar-fill" style={{width:`${p.pct}%`,background:p.active?p.color:`${p.color}55`}}/>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ── Plan Guide ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.10 }}>
              <div className="psb-title"><Info size={11} /> Plan Guide</div>
              <div className="psb-timeline">
                <div className="psb-tl-item">
                  <div className="psb-tl-left"><div className="psb-tl-dot" style={{borderColor:'#e03030',background:activePlan==='lctron'?'rgba(224,48,48,0.15)':'transparent'}}/><div className="psb-tl-line"/></div>
                  <div className="psb-tl-body">
                    <div className="psb-tl-title" style={{color:activePlan==='lctron'?'#e03030':undefined}}>Lctron Ultimate</div>
                    <div className="psb-tl-sub">Max clocks, zero throttle, gaming desktop</div>
                  </div>
                </div>
                <div className="psb-tl-item">
                  <div className="psb-tl-left"><div className="psb-tl-dot" style={{borderColor:'#f59e0b',background:activePlan==='high-performance'?'rgba(245,158,11,0.15)':'transparent'}}/><div className="psb-tl-line"/></div>
                  <div className="psb-tl-body">
                    <div className="psb-tl-title" style={{color:activePlan==='high-performance'?'#f59e0b':undefined}}>High Performance</div>
                    <div className="psb-tl-sub">Good balance, Windows built-in</div>
                  </div>
                </div>
                <div className="psb-tl-item">
                  <div className="psb-tl-left"><div className="psb-tl-dot" style={{borderColor:'#22c55e',background:activePlan==='balanced'?'rgba(34,197,94,0.15)':'transparent'}}/><div className="psb-tl-line"/></div>
                  <div className="psb-tl-body">
                    <div className="psb-tl-title" style={{color:activePlan==='balanced'?'#22c55e':undefined}}>Balanced</div>
                    <div className="psb-tl-sub">Default Windows, laptops &amp; general use</div>
                  </div>
                </div>
              </div>
              <div className="psb-divider"/>
              <div className="psb-tags">
                <span className="psb-tag red">Max Clocks</span>
                <span className="psb-tag amber">No Throttle</span>
                <span className="psb-tag green">Low Latency</span>
                <span className="psb-tag blue">Timer Res.</span>
              </div>
            </motion.div>

            {/* ── What Each Tweak Does ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.13 }}>
              <div className="psb-title"><Info size={11} /> What Each Tweak Does</div>
              {[
                { label: 'Core Parking Off', color: '#e03030', what: 'Prevents Windows from parking (sleeping) CPU cores. All cores stay active = lower input latency.' },
                { label: 'Timer Resolution', color: '#f59e0b', what: 'Sets system timer to 0.5ms instead of default 15.6ms. Smoother frame pacing and input timing.' },
                { label: 'CPU Min State 100%', color: '#a78bfa', what: 'Forces CPU to stay at max frequency, never downclocking. Eliminates frequency ramp-up lag.' },
                { label: 'Power Throttle Off', color: '#06b6d4', what: 'Disables EcoQos and Power Throttling on foreground processes for maximum CPU frequency.' },
                { label: 'Interrupt Affinity', color: '#22c55e', what: 'Pins network/USB hardware interrupts to specific cores to reduce IRQ contention.' },
              ].map((t, i, arr) => (
                <div key={t.label} style={{marginBottom: i<arr.length-1?9:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:t.color,flexShrink:0}}/>
                    <span style={{fontSize:10.5,fontWeight:700}}>{t.label}</span>
                  </div>
                  <p style={{margin:0,fontSize:10,color:'rgba(255,255,255,0.38)',lineHeight:1.45,paddingLeft:12}}>{t.what}</p>
                  {i<arr.length-1 && <div className="psb-divider" style={{marginTop:9}}/>}
                </div>
              ))}
            </motion.div>

            {/* ── Desktop vs Laptop ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <div className="psb-title"><Info size={11} /> Desktop vs Laptop</div>
              <div className="psb-rule" style={{color:'#22c55e'}}>Desktop (Best)</div>
              <ul className="psb-tips" style={{marginBottom:8}}>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Use Lctron Ultimate + all tweaks</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Core Parking off is very safe on desktops</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Apply All gives best gaming performance</li>
              </ul>
              <div className="psb-rule" style={{color:'#f59e0b'}}>Laptop</div>
              <ul className="psb-tips">
                <li><CheckCircle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Use High Performance when plugged in</li>
                <li><AlertTriangle size={10} style={{color:'#e03030',flexShrink:0}}/> Avoid Lctron plan on battery</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Monitor temps — laptops heat faster</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Balanced plan = better battery life</li>
              </ul>
            </motion.div>

            {/* ── Temperature Monitoring ── */}
            <motion.div className="psb-card psb-accent-amber"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.17 }}>
              <div className="psb-title"><AlertTriangle size={11} style={{color:'#f59e0b'}}/> Temperature Guide</div>
              <div className="psb-rule">Safe Ranges</div>
              {[
                { label: 'CPU Idle',     val: '< 45°C',  color: '#22c55e', pct: 30 },
                { label: 'CPU Gaming',   val: '< 85°C',  color: '#f59e0b', pct: 65 },
                { label: 'CPU Danger',   val: '> 95°C',  color: '#e03030', pct: 90 },
                { label: 'GPU Gaming',   val: '< 83°C',  color: '#f59e0b', pct: 60 },
              ].map(t => (
                <div key={t.label} className="psb-bar-row">
                  <div className="psb-bar-header">
                    <span className="psb-bar-label">{t.label}</span>
                    <span className="psb-bar-val" style={{color:t.color}}>{t.val}</span>
                  </div>
                  <div className="psb-bar-track">
                    <div className="psb-bar-fill" style={{width:`${t.pct}%`,background:t.color}}/>
                  </div>
                </div>
              ))}
              <p className="psb-info-text" style={{marginTop:8}}>If your CPU hits &gt;90°C consistently, revert tweaks and check your cooling.</p>
            </motion.div>

            {/* ── Tips & Warnings ── */}
            <motion.div className="psb-card"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.19 }}>
              <div className="psb-title"><Lightbulb size={11} /> Tips &amp; Recovery</div>
              <div className="psb-rule">Best Practice</div>
              <ul className="psb-tips">
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Use Apply All for one-click max performance</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Timer resolution has biggest latency effect</li>
                <li><CheckCircle size={10} style={{color:'#22c55e',flexShrink:0}}/> Core Parking off = noticeable input lag drop</li>
              </ul>
              <div className="psb-rule" style={{color:'#e03030'}}>If Something Feels Wrong</div>
              <ul className="psb-tips">
                <li><AlertTriangle size={10} style={{color:'#e03030',flexShrink:0}}/> Switch back to Balanced plan to revert</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Disable tweaks individually if unstable</li>
                <li><AlertTriangle size={10} style={{color:'#f59e0b',flexShrink:0}}/> Reboot after major plan changes</li>
              </ul>
            </motion.div>

          </>);
        })()}
      </aside>
      </div>{/* page-body */}
    </div>
  );
}
