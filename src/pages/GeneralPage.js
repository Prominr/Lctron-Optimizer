import React from 'react';
import { Settings } from 'lucide-react';
import TweakCard from '../components/TweakCard';
import PageHeader from '../components/PageHeader';
import { usePremium } from '../context/PremiumContext';
import './TweakPage.css';

const PREMIUM_GENERAL_IDS = new Set([
  'enable-gaming-mode',
  'disable-core-isolation', 'disable-hyper-v', 'disable-mitigations', 'disable-vbs',
  'pro-gpu-hwsched', 'pro-timer-res', 'pro-optimize-dx', 'pro-disable-uwp-bg',
]);

const section1 = [
  { id: 'disable-background-apps', title: 'Disable Background Apps', description: 'Removes bloated Windows applications from running in the background.' },
  { id: 'disable-maintenance', title: 'Disable Maintenance', description: 'Disables Windows automatic background checks and scans to reduce background CPU usage.' },
  { id: 'tune-priority', title: 'Tune Priority', description: 'Adjusts the default Windows allocation of resources to be better optimized for maximum performance.' },
  { id: 'disable-fast-startup', title: 'Disable Fast Startup', description: 'Ensures a full RAM refresh each time the computer is turned off and back on again.', warning: 'Boot times will be slightly longer after disabling.', impact: 'Medium' },
  { id: 'disable-telemetry', title: 'Disable Telemetry', description: "Removes Windows' tracking and data collection, reducing resource usage.", warning: 'Disables compatibility tab, may affect some features' },
  { id: 'optimize-visual-effects', title: 'Optimize Visual Effects', description: 'Optimizes Windows visual effects for better performance by disabling unnecessary animations and delays.' },
  { id: 'enable-gaming-mode', title: 'Enable Gaming Mode', description: "Enables Windows' gaming mode, which optimizes services for better performance.", warning: 'Only for Windows 11' },
  { id: 'disable-accessibility', title: 'Disable Accessibility Features', description: 'Turns off all ease-of-access features like sticky keys and mouse keys.', warning: 'Disables sticky keys, narrator, magnifier and all other accessibility tools.', impact: 'Low' },
  { id: 'optimize-memory', title: 'Optimize Memory Settings', description: 'Improves memory management by adjusting how freed memory is handled, reducing fragmentation and enhancing performance.' },
  { id: 'disable-hibernation', title: 'Disable Hibernation', description: 'Improves power management, leading to better boot-up times and also less wasted disk space.' },
  { id: 'disable-copilot', title: 'Disable Copilot', description: "Disables Windows' bloated Copilot feature." },
  { id: 'disable-search-web', title: 'Disable Search Suggestions', description: 'Blocks Windows from searching the web when searching in the Windows search box.' },
  { id: 'disable-cortana', title: 'Disable Cortana', description: "Completely removes Microsoft's Cortana assistant and its associated services." },
  { id: 'remove-xbox-gamebar', title: 'Remove Xbox Game Bar', description: 'Disables the bloated Xbox game bar.' },
  { id: 'disable-notifications', title: 'Disable Notifications', description: 'Turns off system notifications and toast popups for uninterrupted usage.', warning: 'All app notifications will be silenced including security alerts and reminders.', impact: 'Low' },
  { id: 'disable-storage-sense', title: 'Disable Storage Sense', description: 'Prevents automatic cleanup of files and temporary data by Windows.' },
  { id: 'disable-browser-updates', title: 'Disable Browser Auto-Updates', description: 'Prevents automatic updates for Chrome, Brave, Edge and Firefox.', warning: 'Your browser will not receive security patches automatically. Update manually.', impact: 'Low' },
  { id: 'disable-browser-hwaccel', title: 'Disable Browser Hardware Acceleration', description: 'Disables hardware acceleration in Chrome, Brave, Edge and Firefox to reduce GPU overhead.' },
];

const section2 = [
  { id: 'disable-large-sys-cache', title: 'Disable Large System Cache', description: 'Increases the efficiency of memory use as it stops the caching of frequently used data.' },
  { id: 'disable-page-combining', title: 'Disable Page Combining', description: 'Disables the combining of identical memory pages in order to reduce resource overhead.' },
  { id: 'disable-paging-exec', title: 'Disable Paging Executive', description: 'Reduces disk activity related to virtual memory operations, which can lead to better system responsiveness.' },
  { id: 'disable-prefetch', title: 'Disable Prefetch', description: 'Disables the preloading of predicted applications into RAM, reducing RAM usage.' },
  { id: 'disable-core-isolation', title: 'Disable Core Isolation', description: 'Disables the use of hardware virtualisation to reduce wasted CPU cycles.', warning: 'Reduces protection against kernel-level malware. Requires restart to take effect.', impact: 'High' },
  { id: 'disable-energy-logging', title: 'Disable Energy Logging', description: 'Disables the tracking of your computer power consumption, leading to less tasks for the processor.' },
  { id: 'disable-hyper-v', title: 'Disable Hyper-V', description: 'Disables services related to the Hyper-V virtualisation software, slimming Windows.', warning: 'Breaks WSL2, Android subsystem, Docker Desktop and all virtual machines. Requires restart.', impact: 'High' },
  { id: 'disable-intel-tsx', title: 'Disable Intel TSX', description: 'Removes support for transactional memory in the CPU, leading to better CPU performance.' },
  { id: 'disable-mitigations', title: 'Disable Mitigations', description: 'Removes Windows security measures in an attempt to improve performance.', warning: 'Disables Spectre/Meltdown CPU protections. Makes your PC more vulnerable to hardware-level exploits. Only recommended for dedicated gaming PCs.', impact: 'High' },
  { id: 'disable-superfetch', title: 'Disable Superfetch', description: 'Disable the pre-loading of frequently-used applications. Recommended if you have a SSD and/or high RAM usage.' },
  { id: 'disable-vbs', title: 'Disable VBS', description: 'Disabling Virtualisation Based Security turns off Windows security features for performance.', warning: 'Disables Credential Guard and memory integrity. Increases risk from advanced malware. Requires restart.', impact: 'High' },
  { id: 'optimize-explorer', title: 'Optimize Explorer', description: 'Stops the Windows file explorer from parsing every file inside of an undetermined folder.' },
  { id: 'optimize-fsutil', title: 'Optimize Fsutil', description: 'Optimizes NTFS file system settings including memory usage, file access time and more.' },
  { id: 'max-pending-interrupts', title: 'Max Pending Interrupts', description: 'Adds a limit to the amount of pending interrupts, decreasing CPU latency.' },
  { id: 'optimize-irq', title: 'Optimize IRQ Priority', description: 'Reduces the priority of less-important requests, leading to less bloated interrupts.' },
  { id: 'optimize-boot', title: 'Optimize Boot Config', description: 'Optimizes boot configuration settings for better system performance and faster boot times.' },
  { id: 'optimize-background', title: 'Optimize Background Tasks', description: 'Disables unnecessary system maintenance tasks and background diagnostics to reduce resource usage.' },
  { id: 'disable-touch', title: 'Disable Touch Features', description: 'Turns off touchscreen and ink workspace features for traditional mouse/keyboard setups.', warning: 'Disables touchscreen input entirely. Do not enable on a tablet or touchscreen laptop.', impact: 'Low' },
];

const section3 = [
  { id: 'pro-gpu-hwsched',    title: 'GPU Hardware Scheduling', description: 'Enables Hardware-Accelerated GPU Scheduling (HAGS) for lower latency and better frame pacing in games.' },
  { id: 'pro-timer-res',     title: 'High-Resolution Timer', description: 'Forces platform clock ticks and disables dynamic tick, giving the OS a more precise timer for lower scheduling latency.', warning: 'May slightly increase idle CPU usage.', impact: 'Medium' },
  { id: 'pro-optimize-dx',   title: 'DirectX Optimizer', description: 'Disables DirectX debug tools and optimizes IOMMU GPU memory mapping for lower DirectX overhead.' },
  { id: 'pro-disable-uwp-bg',title: 'Disable UWP Background', description: 'Globally disables all UWP (Microsoft Store) apps from running in the background, reclaiming CPU and RAM.' },
];

function TweakSection({ label, tweaks, tweakStates, onToggle, incompatibleTweaks, isPremium, onUpgrade }) {
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
            incompatible={incompatibleTweaks?.has(t.id)}
            isPremium={PREMIUM_GENERAL_IDS.has(t.id)}
            userHasPremium={isPremium}
            onUpgrade={onUpgrade}
          />
        ))}
      </div>
    </div>
  );
}

export default function GeneralPage({ tweakStates, onToggle, incompatibleTweaks, setActivePage }) {
  const { isPremium } = usePremium();
  const onUpgrade = () => setActivePage && setActivePage('premium');
  return (
    <div className="tweak-page">
      <PageHeader icon={Settings} title="General Optimizations" subtitle="Core Windows performance and system tweaks" />
      <div className="tweak-grid">
        <TweakSection label="Basic Optimizations" tweaks={section1} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} isPremium={isPremium} onUpgrade={onUpgrade} />
        <TweakSection label="Advanced Optimizations" tweaks={section2} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} isPremium={isPremium} onUpgrade={onUpgrade} />
        <TweakSection label="Pro Optimizations" tweaks={section3} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} isPremium={isPremium} onUpgrade={onUpgrade} />
      </div>
    </div>
  );
}
