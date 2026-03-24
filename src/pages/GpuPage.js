import React from 'react';
import { Cpu } from 'lucide-react';
import TweakCard from '../components/TweakCard';
import PageHeader from '../components/PageHeader';
import './TweakPage.css';

const COLOR = '#e03080';

const section1 = [
  { id: 'disable-energy-savings', title: 'Disable Energy Savings', description: 'Disables GPU power saving features to prefer optimal performance.' },
  { id: 'disable-hw-acceleration', title: 'Disable Hardware Acceleration', description: 'Disables hardware acceleration for the GPU in order to increase stability and reduce GPU overhead.', warning: 'Do not enable if you use DLSS Frame Generation or AMD FSR3. Video editing and GPU-accelerated apps will also be affected.' },
  { id: 'amd-gpu-tweaks', title: 'AMD GPU Tweaks', description: 'Optimizes the AMD graphical and latency settings, in attempt to deliver the most optimal performance.', warning: 'Only applies to AMD GPUs. Has no effect and may write unused registry keys on NVIDIA/Intel systems.' },
  { id: 'directx-tweaks', title: 'DirectX Tweaks', description: 'Optimize DirectX for more efficient utilisation of memory, and allocation of CPU resources.' },
];

const section2 = [
  { id: 'disable-gpu-timeout', title: 'Disable GPU Timeout Detection', description: 'Disables the Windows timeout detection and recovery process, which reduces GPU usage and fixes signal issues.', warning: 'If your GPU crashes or freezes, Windows will no longer auto-recover. You will need to manually restart your PC.' },
  { id: 'disable-multi-plane-overlay', title: 'Disable Multi-Plane Overlay', description: 'Removes stutters, black screens, and gray screens in most cases.' },
  { id: 'optimize-intel-igpu', title: 'Optimize Intel iGPU', description: 'Optimizes the graphical performance of the Intel iGPU, preferring maximum performance and responsiveness.' },
  { id: 'enable-fse', title: 'Enable FSE', description: 'Disables the offloading of graphical management to DWM, leading to better fullscreen exclusive performance.', warning: 'May cause issues with alt-tabbing, overlays (Discord, Steam) and multi-monitor setups.' },
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

export default function GpuPage({ tweakStates, onToggle, incompatibleTweaks }) {
  return (
    <div className="tweak-page">
      <PageHeader icon={Cpu} title="GPU Optimizations" subtitle="DirectX, AMD, Intel and rendering optimizations" iconColor={COLOR} />
      <div className="tweak-grid">
        <TweakSection label="General GPU Tweaks" tweaks={section1} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
        <TweakSection label="Advanced Display & Rendering" tweaks={section2} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
      </div>
    </div>
  );
}
