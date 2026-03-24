import React from 'react';
import { Zap } from 'lucide-react';
import TweakCard from '../components/TweakCard';
import PageHeader from '../components/PageHeader';
import './TweakPage.css';

const COLOR = '#e05030';

const section1 = [
  { id: 'disable-driver-services', title: 'Disable Driver Services', description: 'Removes useless and excess Windows Services, leading to less tasks for the CPU.', warning: 'Safe for keyboard & mouse. Only disables network/media sharing services. Requires restart.' },
  { id: 'mouse-tune', title: 'Mouse Tune', description: 'Optimizes the mouse data queue size in order to reduce input delay. Fully reversible.', warning: 'May reduce benefit for 8KHz+ polling rate mice. Toggle off to restore defaults.' },
  { id: 'keyboard-tune', title: 'Keyboard Tune', description: 'Optimizes the keyboard data queue size in order to reduce input delay. Fully reversible.' },
  { id: 'optimize-mouse', title: 'Optimize Mouse', description: 'Disables Windows mouse acceleration for raw, 1:1 input. Fully reversible — toggle off to restore Windows defaults.' },
  { id: 'timer-resolution', title: 'Timer Resolution', description: 'Increases the frequency of Windows responsiveness in order to decrease input latency.', warning: 'Only works on Windows 11' },
  { id: 'affinities', title: 'Affinities', description: 'Improves the allocation of device tasks to the CPU, which in turn improves CPU efficiency.', warning: 'May cause issues on AMD CPUs with 3D V-Cache. Test stability after applying.' },
  { id: 'csrss', title: 'CSRSS Priority', description: 'Tweaks the Client/Server Runtime Subsystem to improve resource allocation, improving system responsiveness.' },
];

const section2 = [
  { id: 'disable-hpet', title: 'Disable HPET', description: 'Aims to remove micro-stuttering and screen tearing that may occur in fast-paced applications.', warning: 'Results vary by CPU. On some systems this can increase latency instead of reducing it. Test before keeping enabled.' },
  { id: 'disable-synthetic-timers', title: 'Disable Synthetic Timers', description: 'Disables timers that are used by virtualization software.', warning: 'Will break Hyper-V, VirtualBox, VMware and other virtual machines.' },
  { id: 'disable-coalescing', title: 'Disable Coalescing', description: 'Disables the grouping of timer events in an idle state, reducing input delay.' },
  { id: 'disable-system-responsiveness', title: 'Disable Responsiveness Tracking', description: "Removes Windows' tracking of the system's responsiveness, leading to less interference and better input delay." },
  { id: 'latency-tolerance', title: 'Latency Tolerance', description: 'Fine-tunes exit latencies, enables checks, and adjusts tolerances for enhanced system responsiveness and power management.' },
  { id: 'optimize-svc-split', title: 'Optimize SVC Split Threshold', description: 'Optimizes SVC (Service Control) split threshold for better process isolation.', warning: 'Only effective on systems with 4GB+ RAM. Has no benefit on low-memory systems.' },
  { id: 'optimize-write-cache', title: 'Optimize Write Combining', description: 'Removes bloated power management interrupts to the kernel, leading to lower latency.' },
  { id: 'optimize-io', title: 'Optimize I/O Operations', description: 'Adjusts disk input/output priorities for better storage access.' },
];

function TweakSection({ label, tweaks, tweakStates, onToggle, incompatibleTweaks }) {
  return (
    <div className="tweak-section">
      <div className="tweak-section-label">{label}</div>
      <div className="tweak-section-cards">
        {tweaks.map((t) => (
          <TweakCard
            key={t.id}
            {...t}
            enabled={tweakStates[t.id]?.enabled}
            loading={tweakStates[t.id]?.loading}
            onToggle={onToggle}
            iconColor={COLOR}
            incompatible={incompatibleTweaks?.has(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function LatencyPage({ tweakStates, onToggle, incompatibleTweaks }) {
  return (
    <div className="tweak-page">
      <PageHeader icon={Zap} title="Latency Optimizations" subtitle="Input, timer and responsiveness tweaks" iconColor={COLOR} />
      <div className="tweak-grid">
        <TweakSection label="Input & Mouse Tweaks" tweaks={section1} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
        <TweakSection label="Timer & Kernel Tweaks" tweaks={section2} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
      </div>
    </div>
  );
}
