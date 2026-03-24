import React from 'react';
import { Monitor } from 'lucide-react';
import TweakCard from '../components/TweakCard';
import PageHeader from '../components/PageHeader';
import './TweakPage.css';

const COLOR = '#76b900';

const section1 = [
  { id: 'disable-nvidia-telemetry', title: 'Disable Nvidia Telemetry', description: 'Removes the Nvidia tracking and data collection, reducing resource usage.', warning: 'Disables Nvidia container service' },
  { id: 'disable-p-states', title: 'Disable P-States', description: 'Forces your GPU to run at 100% boost clock constantly, decreasing graphical latency.', warning: 'Desktop PCs only. Laptop users: this will cause overheating and may damage your GPU. Increases power consumption significantly.' },
  { id: 'disable-hdcp', title: 'Disable HDCP', description: 'Disables digital content protection, improving privacy and reducing the data the GPU handles.', warning: 'Netflix, Disney+ and other DRM-protected streaming services may refuse to play video at full quality.' },
  { id: 'disable-power-gating', title: 'Disable Power Gating', description: 'Optimizes the usage of power to prefer more important tasks, increasing power consumption.', warning: 'GPU will consume more power at all times. Not recommended for laptops or small form-factor PCs with limited cooling.' },
];

const section2 = [
  { id: 'nvidia-profile-inspector', title: 'Nvidia Profile Inspector', description: 'Optimizes basic Nvidia graphics options to prefer maximum performance for graphics-based operations.' },
  { id: 'basic-nvidia-tweaks', title: 'Basic Nvidia Tweaks', description: 'Applies basic settings to improve response times, decrease latency, and enhance overall GPU throughput.' },
  { id: 'enable-preemption', title: 'Enable Preemption', description: 'Ensures that the default Preemption setting is enabled, for the most optimal allocation of resources.' },
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

export default function NvidiaPage({ tweakStates, onToggle, incompatibleTweaks }) {
  return (
    <div className="tweak-page">
      <PageHeader icon={Monitor} title="NVIDIA Optimizations" subtitle="Driver, power and rendering optimizations for NVIDIA GPUs" iconColor={COLOR} />
      <div className="tweak-grid">
        <TweakSection label="Driver & Power" tweaks={section1} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
        <TweakSection label="Performance & Rendering" tweaks={section2} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
      </div>
    </div>
  );
}
