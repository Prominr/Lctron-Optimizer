import React from 'react';
import { Wrench } from 'lucide-react';
import TweakCard from '../components/TweakCard';
import PageHeader from '../components/PageHeader';
import './TweakPage.css';

const COLOR = '#e07030';

const section1 = [
  { id: 'block-windows-updates', title: 'Block Windows Updates', description: 'Blocks Windows Update service to prevent automatic updates.', warning: 'Prevents ALL Windows security patches. Your PC will be unprotected against new vulnerabilities. Re-enable before running Windows Update.' },
  { id: 'remove-onedrive', title: 'Remove OneDrive', description: 'Removes OneDrive from your system aiming to improve privacy and reduce background processes.', warning: 'Permanently removes OneDrive. Any unsynced files will stay local only. Reinstall OneDrive from Microsoft if needed.' },
  { id: 'disable-sync', title: 'Disable Synchronization', description: 'Disables the Windows synchronization services in order to reduce resource usage.', warning: 'Stops syncing of settings, passwords and clipboard across devices.' },
  { id: 'disable-xbox-services', title: 'Disable Xbox Services', description: 'Removes all Xbox-related services and background processes.', warning: 'Disables Xbox Game Bar, Xbox Live features and some game overlay functions.' },
  { id: 'disable-insider', title: 'Disable Insider Preview', description: 'Prevents participation in Windows Insider preview builds.' },
];

const section2 = [
  { id: 'disable-bluetooth', title: 'Disable Bluetooth', description: 'Disables the Bluetooth service aiming to reduce resources and improve system performance.', warning: '⚠ DO NOT enable if you use a Bluetooth keyboard or mouse — you will lose input immediately. Wired peripherals only.' },
  { id: 'disable-wifi', title: 'Disable WiFi', description: 'Disables WiFi services to reduce resources and improve security.', warning: '⚠ ONLY enable if you use a wired ethernet cable. This will disconnect you from WiFi completely and you will lose internet access.' },
  { id: 'disable-compatibility-assistant', title: 'Disable Compatibility Assistant', description: 'Turns off the Program Compatibility Assistant that monitors application behavior.', warning: 'Some older programs may not launch correctly without compatibility prompts.' },
  { id: 'disable-homegroup', title: 'Disable Homegroup', description: 'Removes legacy home network sharing features from Windows.' },
  { id: 'disable-fax-print', title: 'Disable Fax & Print Services', description: 'Removes fax and printing capabilities from Windows to free up resources.', warning: 'Disables ALL printers and print functionality. Do not enable if you use a printer.' },
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

export default function ServicesPage({ tweakStates, onToggle, incompatibleTweaks }) {
  return (
    <div className="tweak-page">
      <PageHeader icon={Wrench} title="Services Optimizations" subtitle="Disable bloatware services and background processes" iconColor={COLOR} />
      <div className="tweak-grid">
        <TweakSection label="Microsoft Services" tweaks={section1} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
        <TweakSection label="Background Services" tweaks={section2} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
      </div>
    </div>
  );
}
