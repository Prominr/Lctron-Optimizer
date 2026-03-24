import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Search, Settings, Monitor, Cpu, Wrench, X,
  AlertTriangle, Shield, Gamepad2, Flame, BarChart2, Info, Crown, CheckCircle
} from 'lucide-react';
import TweakCard from '../components/TweakCard';
import { usePremium } from '../context/PremiumContext';
import './OptimizePage.css';

const PREMIUM_TWEAK_IDS = new Set([
  // Main — high-impact / aggressive
  'disable-core-isolation', 'disable-hyper-v', 'disable-mitigations', 'disable-vbs',
  'disable-power-throttling', 'disable-cpu-parking', 'set-ultimate-performance',
  'disable-defender-scanning', 'set-high-performance-bus',
  // Latency — advanced
  'disable-cpu-idle-states', 'set-gpu-msi-mode', 'optimize-sched-quantum',
  'pin-gpu-clocks', 'optimize-interrupt-affinity',
  // GPU — advanced
  'enable-hags', 'disable-gpu-timeout', 'enable-fse', 'optimize-d3d11', 'set-dx12-agility',
  // Nvidia — aggressive
  'disable-p-states', 'disable-power-gating',
  // Services — risky
  'block-windows-updates', 'disable-remote-registry',
]);

const ALL_TWEAKS = [
  // ── Main ──────────────────────────────────────────────────────────────────
  { id: 'disable-background-apps', title: 'Disable Background Apps', description: 'Removes bloated Windows applications from running in the background.', category: 'Main' },
  { id: 'disable-maintenance', title: 'Disable Maintenance', description: 'Disables Windows automatic background checks and scans to reduce background CPU usage.', category: 'Main' },
  { id: 'tune-priority', title: 'Tune Priority', description: 'Adjusts the default Windows allocation of resources for maximum performance.', category: 'Main' },
  { id: 'disable-fast-startup', title: 'Disable Fast Startup', description: 'Ensures a full RAM refresh each time the computer is turned off and back on again.', warning: 'Boot times will be slightly longer.', category: 'Main' },
  { id: 'disable-telemetry', title: 'Disable Telemetry', description: "Removes Windows' tracking and data collection, reducing resource usage.", warning: 'Disables compatibility tab, may affect some features.', category: 'Main' },
  { id: 'optimize-visual-effects', title: 'Optimize Visual Effects', description: 'Disables unnecessary Windows animations and delays for better performance.', category: 'Main' },
  { id: 'enable-gaming-mode', title: 'Enable Gaming Mode', description: "Enables Windows' gaming mode, optimizing services for better performance.", warning: 'Only for Windows 11.', category: 'Main' },
  { id: 'disable-accessibility', title: 'Disable Accessibility Features', description: 'Turns off ease-of-access features like sticky keys and mouse keys.', warning: 'Disables sticky keys, narrator, magnifier and all accessibility tools.', category: 'Main' },
  { id: 'optimize-memory', title: 'Optimize Memory Settings', description: 'Improves memory management, reducing fragmentation and enhancing performance.', category: 'Main' },
  { id: 'disable-hibernation', title: 'Disable Hibernation', description: 'Improves power management and frees up disk space.', category: 'Main' },
  { id: 'disable-copilot', title: 'Disable Copilot', description: "Disables Windows' bloated Copilot feature.", category: 'Main' },
  { id: 'disable-search-web', title: 'Disable Search Suggestions', description: 'Blocks Windows from searching the web in the search box.', category: 'Main' },
  { id: 'disable-cortana', title: 'Disable Cortana', description: "Completely removes Microsoft's Cortana assistant and its services.", category: 'Main' },
  { id: 'remove-xbox-gamebar', title: 'Remove Xbox Game Bar', description: 'Disables the bloated Xbox game bar overlay.', category: 'Main' },
  { id: 'disable-notifications', title: 'Disable Notifications', description: 'Turns off system notifications and toast popups.', warning: 'All app notifications will be silenced.', category: 'Main' },
  { id: 'disable-storage-sense', title: 'Disable Storage Sense', description: 'Prevents automatic cleanup of files and temporary data by Windows.', category: 'Main' },
  { id: 'disable-browser-updates', title: 'Disable Browser Auto-Updates', description: 'Prevents automatic updates for Chrome, Brave, Edge and Firefox.', warning: 'Your browser will not receive security patches automatically.', category: 'Main' },
  { id: 'disable-browser-hwaccel', title: 'Disable Browser Hardware Acceleration', description: 'Disables hardware acceleration in browsers to reduce GPU overhead.', category: 'Main' },
  { id: 'disable-large-sys-cache', title: 'Disable Large System Cache', description: 'Increases memory efficiency by stopping caching of frequently used data.', category: 'Main' },
  { id: 'disable-page-combining', title: 'Disable Page Combining', description: 'Disables combining of identical memory pages to reduce resource overhead.', category: 'Main' },
  { id: 'disable-paging-exec', title: 'Disable Paging Executive', description: 'Reduces disk activity related to virtual memory operations.', category: 'Main' },
  { id: 'disable-prefetch', title: 'Disable Prefetch', description: 'Disables preloading of predicted applications into RAM, reducing RAM usage.', category: 'Main' },
  { id: 'disable-core-isolation', title: 'Disable Core Isolation', description: 'Disables hardware virtualisation to reduce wasted CPU cycles.', warning: 'Reduces protection against kernel-level malware. Requires restart.', category: 'Main' },
  { id: 'disable-energy-logging', title: 'Disable Energy Logging', description: 'Disables power consumption tracking, leading to less CPU tasks.', category: 'Main' },
  { id: 'disable-hyper-v', title: 'Disable Hyper-V', description: 'Disables Hyper-V virtualisation services, slimming Windows.', warning: 'Breaks WSL2, Docker, and all VMs. Requires restart.', category: 'Main' },
  { id: 'disable-intel-tsx', title: 'Disable Intel TSX', description: 'Removes support for transactional memory, improving CPU performance.', category: 'Main' },
  { id: 'disable-mitigations', title: 'Disable Mitigations', description: 'Removes Windows security measures to improve performance.', warning: 'Disables Spectre/Meltdown protections. Recommended for dedicated gaming PCs only.', category: 'Main' },
  { id: 'disable-superfetch', title: 'Disable Superfetch', description: 'Disables pre-loading of frequently-used apps. Recommended with SSD and/or high RAM.', category: 'Main' },
  { id: 'disable-vbs', title: 'Disable VBS', description: 'Turns off Virtualisation Based Security for performance.', warning: 'Disables Credential Guard. Requires restart.', category: 'Main' },
  { id: 'optimize-explorer', title: 'Optimize Explorer', description: 'Stops Windows Explorer from parsing every file inside undetermined folders.', category: 'Main' },
  { id: 'optimize-fsutil', title: 'Optimize Fsutil', description: 'Optimizes NTFS file system settings for better responsiveness.', category: 'Main' },
  { id: 'max-pending-interrupts', title: 'Max Pending Interrupts', description: 'Adds a limit to pending interrupts, decreasing CPU latency.', category: 'Main' },
  { id: 'optimize-irq', title: 'Optimize IRQ Priority', description: 'Reduces the priority of less-important requests to improve interrupt handling.', category: 'Main' },
  { id: 'optimize-boot', title: 'Optimize Boot Config', description: 'Optimizes boot configuration for better performance and faster boot times.', category: 'Main' },
  { id: 'optimize-background', title: 'Optimize Background Tasks', description: 'Disables unnecessary maintenance tasks and background diagnostics.', category: 'Main' },
  { id: 'disable-touch', title: 'Disable Touch Features', description: 'Turns off touchscreen features for traditional mouse/keyboard setups.', warning: 'Disables touchscreen entirely. Do not enable on tablets.', category: 'Main' },

  // ── Latency ───────────────────────────────────────────────────────────────
  { id: 'disable-driver-services', title: 'Disable Driver Services', description: 'Removes excess Windows services, reducing CPU tasks.', warning: 'Requires restart.', category: 'Latency' },
  { id: 'mouse-tune', title: 'Mouse Tune', description: 'Optimizes mouse data queue size to reduce input delay.', warning: 'May reduce benefit for 8KHz+ polling rate mice.', category: 'Latency' },
  { id: 'keyboard-tune', title: 'Keyboard Tune', description: 'Optimizes keyboard data queue size to reduce input delay.', category: 'Latency' },
  { id: 'optimize-mouse', title: 'Optimize Mouse', description: 'Disables Windows mouse acceleration for raw 1:1 input.', category: 'Latency' },
  { id: 'timer-resolution', title: 'Timer Resolution', description: 'Increases frequency of Windows responsiveness to decrease input latency.', warning: 'Only works on Windows 11.', category: 'Latency' },
  { id: 'affinities', title: 'Affinities', description: 'Improves allocation of device tasks to CPU for better efficiency.', warning: 'May cause issues on AMD CPUs with 3D V-Cache.', category: 'Latency' },
  { id: 'csrss', title: 'CSRSS Priority', description: 'Tweaks the Client/Server Runtime Subsystem to improve resource allocation.', category: 'Latency' },
  { id: 'disable-hpet', title: 'Disable HPET', description: 'Aims to remove micro-stuttering and screen tearing in fast-paced games.', warning: 'Results vary by CPU. Test before keeping enabled.', category: 'Latency' },
  { id: 'disable-synthetic-timers', title: 'Disable Synthetic Timers', description: 'Disables timers used by virtualization software.', warning: 'Breaks VMs and virtual machines.', category: 'Latency' },
  { id: 'disable-coalescing', title: 'Disable Coalescing', description: 'Disables grouping of timer events to reduce input delay.', category: 'Latency' },
  { id: 'disable-system-responsiveness', title: 'Disable Responsiveness Tracking', description: "Removes Windows' responsiveness tracking to reduce interference.", category: 'Latency' },
  { id: 'latency-tolerance', title: 'Latency Tolerance', description: 'Fine-tunes exit latencies and tolerances for enhanced responsiveness.', category: 'Latency' },
  { id: 'optimize-svc-split', title: 'Optimize SVC Split Threshold', description: 'Optimizes SVC split threshold for better process isolation.', warning: 'Only effective on systems with 4GB+ RAM.', category: 'Latency' },
  { id: 'optimize-write-cache', title: 'Optimize Write Combining', description: 'Removes bloated power management interrupts to the kernel.', category: 'Latency' },
  { id: 'optimize-io', title: 'Optimize I/O Operations', description: 'Adjusts disk input/output priorities for better storage access.', category: 'Latency' },

  // ── Nvidia ────────────────────────────────────────────────────────────────
  { id: 'disable-nvidia-telemetry', title: 'Disable Nvidia Telemetry', description: 'Removes Nvidia tracking and data collection.', warning: 'Disables Nvidia container service.', category: 'Nvidia' },
  { id: 'disable-p-states', title: 'Disable P-States', description: 'Forces GPU to run at 100% boost clock constantly.', warning: 'Desktop PCs only. Laptop GPUs may overheat. Increases power usage.', category: 'Nvidia' },
  { id: 'disable-hdcp', title: 'Disable HDCP', description: 'Disables digital content protection, reducing GPU data overhead.', warning: 'Netflix, Disney+ may refuse full quality playback.', category: 'Nvidia' },
  { id: 'disable-power-gating', title: 'Disable Power Gating', description: 'Optimizes power usage to prefer more important tasks.', warning: 'GPU will consume more power. Not recommended for laptops.', category: 'Nvidia' },
  { id: 'nvidia-profile-inspector', title: 'Nvidia Profile Inspector', description: 'Optimizes Nvidia graphics options for maximum performance.', category: 'Nvidia' },
  { id: 'basic-nvidia-tweaks', title: 'Basic Nvidia Tweaks', description: 'Applies basic settings to improve response times and decrease latency.', category: 'Nvidia' },
  { id: 'enable-preemption', title: 'Enable Preemption', description: 'Ensures default Preemption setting is enabled for optimal resource allocation.', category: 'Nvidia' },

  // ── GPU ───────────────────────────────────────────────────────────────────
  { id: 'disable-energy-savings', title: 'Disable Energy Savings', description: 'Disables GPU power saving to prefer optimal performance.', category: 'GPU' },
  { id: 'disable-hw-acceleration', title: 'Disable Hardware Acceleration', description: 'Disables GPU hardware acceleration to reduce overhead.', warning: 'Do not enable with DLSS Frame Gen or AMD FSR3.', category: 'GPU' },
  { id: 'amd-gpu-tweaks', title: 'AMD GPU Tweaks', description: 'Optimizes AMD graphical and latency settings for best performance.', warning: 'Only applies to AMD GPUs.', category: 'GPU' },
  { id: 'directx-tweaks', title: 'DirectX Tweaks', description: 'Optimize DirectX for efficient memory use and CPU resource allocation.', category: 'GPU' },
  { id: 'disable-gpu-timeout', title: 'Disable GPU Timeout Detection', description: 'Disables the Windows GPU timeout and recovery process.', warning: 'GPU crashes will require manual restart.', category: 'GPU' },
  { id: 'disable-multi-plane-overlay', title: 'Disable Multi-Plane Overlay', description: 'Removes stutters, black screens, and gray screens in most cases.', category: 'GPU' },
  { id: 'optimize-intel-igpu', title: 'Optimize Intel iGPU', description: 'Optimizes Intel iGPU for maximum performance and responsiveness.', category: 'GPU' },
  { id: 'enable-fse', title: 'Enable FSE', description: 'Disables DWM offloading for better fullscreen exclusive performance.', warning: 'May cause issues with alt-tab and overlays.', category: 'GPU' },

  // ── Services ──────────────────────────────────────────────────────────────
  { id: 'block-windows-updates', title: 'Block Windows Updates', description: 'Blocks Windows Update to prevent automatic updates.', warning: 'Prevents ALL security patches. Re-enable before updating.', category: 'Services' },
  { id: 'remove-onedrive', title: 'Remove OneDrive', description: 'Removes OneDrive to improve privacy and reduce background processes.', warning: 'Permanently removes OneDrive.', category: 'Services' },
  { id: 'disable-sync', title: 'Disable Synchronization', description: 'Disables Windows sync services to reduce resource usage.', warning: 'Stops syncing settings, passwords and clipboard across devices.', category: 'Services' },
  { id: 'disable-xbox-services', title: 'Disable Xbox Services', description: 'Removes all Xbox-related services and background processes.', warning: 'Disables Xbox Game Bar and Xbox Live features.', category: 'Services' },
  { id: 'disable-insider', title: 'Disable Insider Preview', description: 'Prevents participation in Windows Insider preview builds.', category: 'Services' },
  { id: 'disable-bluetooth', title: 'Disable Bluetooth', description: 'Disables the Bluetooth service to reduce resources.', warning: '⚠ DO NOT enable with a Bluetooth keyboard or mouse.', category: 'Services' },
  { id: 'disable-wifi', title: 'Disable WiFi', description: 'Disables WiFi services.', warning: '⚠ ONLY enable if you use wired ethernet. This disconnects WiFi completely.', category: 'Services' },
  { id: 'disable-compatibility-assistant', title: 'Disable Compatibility Assistant', description: 'Turns off the Program Compatibility Assistant.', warning: 'Some older programs may not launch correctly.', category: 'Services' },
  { id: 'disable-homegroup', title: 'Disable Homegroup', description: 'Removes legacy home network sharing features.', category: 'Services' },
  { id: 'disable-fax-print', title: 'Disable Fax & Print Services', description: 'Removes fax and printing capabilities from Windows.', warning: 'Disables ALL printers. Do not enable if you use a printer.', category: 'Services' },
  { id: 'disable-windows-error-reporting', title: 'Disable Error Reporting', description: 'Stops Windows from sending crash data to Microsoft, removing background reporting processes.', category: 'Services' },
  { id: 'disable-remote-desktop', title: 'Disable Remote Desktop', description: 'Disables Remote Desktop Protocol (RDP) to free up resources and reduce attack surface.', warning: 'You will not be able to remote-connect to this PC.', category: 'Services' },
  { id: 'disable-search-indexing', title: 'Disable Search Indexing', description: 'Stops Windows from continuously indexing files in the background, reducing disk and CPU usage.', category: 'Services' },

  // ── Main (new) ────────────────────────────────────────────────────────────
  { id: 'disable-power-throttling', title: 'Disable Power Throttling', description: 'Prevents Windows from throttling CPU performance for background apps. Boosts foreground responsiveness.', warning: 'Slightly increases power consumption on laptops.', category: 'Main' },
  { id: 'disable-cpu-parking', title: 'Disable CPU Core Parking', description: 'Forces all CPU cores to stay active at all times, eliminating the latency spike when parked cores wake up.', warning: 'Increases CPU power draw. Not recommended for battery-only use.', category: 'Main' },
  { id: 'set-ultimate-performance', title: 'Ultimate Performance Plan', description: 'Activates Windows hidden Ultimate Performance power plan, eliminating micro-latencies caused by energy saving policies.', category: 'Main' },
  { id: 'optimize-network-adapter', title: 'Optimize Network Adapter', description: 'Disables adapter interrupt moderation and energy-saving features. Enables RSS and TCP FastOpen for lower ping.', category: 'Main' },
  { id: 'disable-nagle-algorithm', title: 'Disable Nagle Algorithm', description: 'Disables TCP packet-batching (Nagle) so packets are sent immediately rather than buffered. Lowers game ping.', category: 'Main' },
  { id: 'flush-dns-cache', title: 'Flush & Optimize DNS', description: 'Flushes the DNS cache and optimizes DNS TTL settings to reduce lookup delays for online gaming and browsing.', category: 'Main' },
  { id: 'optimize-ssd', title: 'Optimize SSD / NVMe', description: 'Runs TRIM on SSDs and enables optimal AHCI settings to maintain peak read/write performance.', warning: 'SSD only. Has no effect on HDDs.', category: 'Main' },
  { id: 'disable-defender-scanning', title: 'Disable Defender Real-Time Scan', description: 'Disables Windows Defender real-time scanning to free up significant CPU resources during gaming.', warning: '⚠ Your PC will be unprotected against malware. Only use on trusted systems.', category: 'Main' },
  { id: 'trim-working-set', title: 'Trim RAM Working Set', description: 'Forces Windows to release unused memory from background processes back to the system immediately.', category: 'Main' },

  // ── Latency (new) ─────────────────────────────────────────────────────────
  { id: 'disable-dwm-throttle', title: 'Disable DWM Throttling', description: 'Prevents Desktop Window Manager from throttling compositor performance, reducing frame delivery latency.', category: 'Latency' },
  { id: 'optimize-usb-polling', title: 'Optimize USB Polling', description: 'Disables USB selective suspend on all devices, keeping mice and keyboards at maximum polling responsiveness.', category: 'Latency' },
  { id: 'disable-raw-input-buffer', title: 'Optimize Raw Input', description: 'Disables input injection protection overhead and telemetry, delivering input events to games faster.', category: 'Latency' },
  { id: 'optimize-interrupt-affinity', title: 'Optimize Interrupt Affinity', description: 'Pins network adapter interrupts to specific CPU cores to avoid contention with game threads.', category: 'Latency' },

  // ── GPU (new) ─────────────────────────────────────────────────────────────
  { id: 'enable-hags', title: 'Hardware-Accelerated GPU Scheduling', description: 'Enables HAGS so the GPU manages its own memory scheduling instead of the CPU, lowering frame latency.', warning: 'Requires Windows 10 2004+ and a supported GPU driver. Restart required.', category: 'GPU' },
  { id: 'disable-shader-cache', title: 'Optimize GPU Shader Cache', description: 'Ensures GPU shader compilation cache is enabled and fully utilized for faster game load times.', category: 'GPU' },
  { id: 'optimize-display-refresh', title: 'Optimize Display Refresh', description: 'Disables VSync idle timeout and enables IOMMU contiguous mapping for smoother, more consistent frame delivery.', category: 'GPU' },

  // ── Nvidia (new) ──────────────────────────────────────────────────────────
  { id: 'nvidia-threaded-optimization', title: 'NVIDIA Threaded Optimization', description: 'Enables multi-threaded OpenGL command submission on NVIDIA GPUs for better CPU utilization in older games.', category: 'Nvidia' },
  { id: 'nvidia-max-pre-rendered-frames', title: 'NVIDIA Low Latency Mode', description: 'Sets pre-rendered frames to 1 (Low Latency mode), reducing input lag at the cost of slight GPU throughput.', category: 'Nvidia' },

  // ── Main (batch 2) ────────────────────────────────────────────────────────
  { id: 'disable-windows-tips', title: 'Disable Windows Tips', description: 'Stops Windows from showing tips, tricks, and suggestions that waste CPU cycles fetching content.', category: 'Main' },
  { id: 'disable-activity-history', title: 'Disable Activity History', description: 'Disables Windows Timeline and activity history collection, reducing background disk writes.', category: 'Main' },
  { id: 'disable-location-tracking', title: 'Disable Location Tracking', description: 'Turns off Windows location services, eliminating background polling from location-aware apps.', category: 'Main' },
  { id: 'disable-advertising-id', title: 'Disable Advertising ID', description: 'Removes the Windows advertising identifier used for targeted ads, stopping background tracking calls.', category: 'Main' },
  { id: 'disable-app-diagnostics', title: 'Disable App Diagnostics', description: 'Prevents apps from accessing diagnostic information and usage data in the background.', category: 'Main' },
  { id: 'optimize-ntfs', title: 'Optimize NTFS', description: 'Disables NTFS last-access timestamps and 8.3 filename generation to reduce disk I/O overhead on every file operation.', category: 'Main' },
  { id: 'disable-news-feed', title: 'Disable News Feed & Widgets', description: 'Removes the Windows 11 Widgets/News feed panel that runs a background Edge process consuming RAM and CPU.', category: 'Main' },
  { id: 'disable-startup-delay', title: 'Disable Startup Program Delay', description: 'Removes the artificial 10-second delay Windows adds before launching startup programs.', category: 'Main' },
  { id: 'disable-menu-animations', title: 'Disable Menu Animations', description: 'Turns off all menu show/hide animations and fades, making the UI feel immediately snappier.', category: 'Main' },
  { id: 'disable-window-ghosting', title: 'Disable Window Ghosting', description: "Disables the \"(Not Responding)\" ghost window feature so unresponsive apps don't visually hang the desktop.", category: 'Main' },
  { id: 'optimize-paged-pool', title: 'Optimize Paged Pool', description: 'Increases the paged and non-paged kernel pool sizes to prevent pool exhaustion under heavy load.', category: 'Main' },
  { id: 'disable-automatic-maintenance', title: 'Disable Automatic Maintenance', description: 'Stops Windows from running scheduled disk defrag, security scans, and diagnostics at random times.', category: 'Main' },
  { id: 'set-high-performance-bus', title: 'High Performance PCI-E', description: 'Disables PCI Express Active State Power Management (ASPM) to keep the GPU bus running at full speed.', warning: 'Increases system power draw slightly.', category: 'Main' },
  { id: 'disable-delivery-optimization', title: 'Disable Delivery Optimization', description: "Stops Windows from using your bandwidth to distribute updates to other PCs on Microsoft's P2P network.", category: 'Main' },
  { id: 'disable-cloud-sync', title: 'Disable Cloud Clipboard Sync', description: 'Prevents the Windows clipboard from syncing content to the cloud and other devices.', category: 'Main' },
  { id: 'set-processor-scheduling', title: 'Optimize Processor Scheduling', description: 'Sets Windows to favor foreground applications over background processes for CPU time allocation.', category: 'Main' },
  { id: 'disable-font-smoothing-extra', title: 'Optimize Font Rendering', description: 'Disables extra ClearType font smoothing sub-steps that add CPU overhead with no visible benefit at high DPI.', category: 'Main' },
  { id: 'disable-program-compat-wizard', title: 'Disable Compat Wizard', description: 'Stops Windows from launching the Program Compatibility Wizard when a program crashes or closes abnormally.', category: 'Main' },
  { id: 'disable-error-sounds', title: 'Disable System Error Sounds', description: 'Mutes the Windows error, warning, and notification sound events to reduce audio latency spikes.', category: 'Main' },

  // ── Latency (batch 2) ─────────────────────────────────────────────────────
  { id: 'disable-cpu-idle-states', title: 'Disable CPU Idle States (C-States)', description: 'Prevents CPU cores from entering deep sleep states (C1E/C3/C6), eliminating the wake-up latency spike when a core is needed.', warning: 'Significantly increases CPU power and heat. Desktop gaming PCs only.', category: 'Latency' },
  { id: 'optimize-tcp-ack', title: 'Optimize TCP ACK Frequency', description: 'Lowers TCP ACK delay from 200ms to 1ms so acknowledgements are sent immediately, reducing round-trip latency in games.', category: 'Latency' },
  { id: 'disable-tcp-autotuning', title: 'Disable TCP Auto-Tuning', description: 'Fixes TCP receive window at optimal size instead of letting Windows dynamically resize it, preventing throughput spikes.', category: 'Latency' },
  { id: 'set-gpu-msi-mode', title: 'Enable GPU MSI Mode', description: 'Switches the GPU from legacy INTx interrupt delivery to Message Signaled Interrupts for lower, more consistent interrupt latency.', warning: 'Requires a supported GPU and driver. Restart required.', category: 'Latency' },
  { id: 'disable-hardware-acceleration-cursor', title: 'Disable Cursor HW Acceleration', description: 'Removes hardware-accelerated cursor compositing from DWM, reducing cursor rendering latency at high polling rates.', category: 'Latency' },
  { id: 'optimize-sched-quantum', title: 'Optimize Scheduler Quantum', description: 'Switches Windows thread quantum from variable (server-style) to fixed short quanta, reducing frame time variance in games.', category: 'Latency' },
  { id: 'disable-speculative-execution', title: 'Disable Speculative Prefetch', description: 'Disables the speculative prefetch and ReadyBoot features that cause random disk activity during gameplay.', category: 'Latency' },
  { id: 'set-io-scheduler', title: 'Optimize I/O Scheduler', description: 'Configures the Windows I/O scheduler to use the high-performance queue depth and priority policies for NVMe/SSD drives.', category: 'Latency' },
  { id: 'disable-throttle-notif', title: 'Disable Throttle Notifications', description: 'Removes thermal throttle notification handlers that add overhead to the power management interrupt path.', category: 'Latency' },
  { id: 'pin-gpu-clocks', title: 'Pin GPU Clocks (NVIDIA)', description: 'Uses NVIDIA API to pin the GPU base and boost clocks to maximum, preventing clock ramp-up latency between frames.', warning: 'NVIDIA GPUs only. Increases power and heat. Desktop only.', category: 'Latency' },

  // ── GPU (batch 2) ─────────────────────────────────────────────────────────
  { id: 'disable-gpu-vsync-idle', title: 'Disable GPU VSync Idle', description: 'Prevents the GPU from idling to sync when no VSync is requested, eliminating a source of micro-stutter.', category: 'GPU' },
  { id: 'enable-nvlink-sli', title: 'Optimize GPU Memory Allocation', description: 'Tweaks GPU driver memory allocation strategy to prefer larger contiguous blocks, reducing texture streaming hitches.', category: 'GPU' },
  { id: 'disable-ulps', title: 'Disable ULPS (AMD)', description: 'Disables Ultra Low Power State on AMD multi-GPU or APU setups, preventing the GPU from power-gating mid-frame.', warning: 'AMD GPUs only.', category: 'GPU' },
  { id: 'optimize-d3d11', title: 'Optimize D3D11 Settings', description: 'Applies registry tweaks to the D3D11 runtime to reduce API overhead and improve draw call throughput.', category: 'GPU' },
  { id: 'disable-windows-ink', title: 'Disable Windows Ink Overlay', description: 'Removes the Windows Ink pen input layer from the GPU rendering pipeline, freeing GPU resources on non-tablet systems.', category: 'GPU' },
  { id: 'set-dx12-agility', title: 'Enable DX12 Agility SDK Path', description: 'Redirects DirectX 12 to use the latest Agility SDK runtime if available, gaining access to newer driver optimizations.', category: 'GPU' },
  { id: 'disable-transparency', title: 'Disable Transparency Effects', description: 'Turns off Acrylic/frosted glass transparency in taskbar and window chrome, freeing GPU fill-rate and bandwidth.', category: 'GPU' },
  { id: 'disable-reflections', title: 'Disable Window Reflections', description: 'Removes the DWM reflection rendering pass used for Aero glass effects on older Windows builds.', category: 'GPU' },

  // ── Services (batch 2) ────────────────────────────────────────────────────
  { id: 'disable-diagnostic-tracking', title: 'Disable Diagnostic Tracking', description: 'Stops the DiagTrack and Connected User Experiences service that constantly collects and uploads diagnostic data.', category: 'Services' },
  { id: 'disable-map-manager', title: 'Disable Maps Manager', description: 'Stops the Windows Maps download and update service running in the background for an unused feature.', category: 'Services' },
  { id: 'disable-mobile-hotspot', title: 'Disable Mobile Hotspot', description: 'Disables the Mobile Hotspot service if you do not use your PC as a Wi-Fi hotspot.', category: 'Services' },
  { id: 'disable-retail-demo', title: 'Disable Retail Demo Service', description: 'Removes the Microsoft Store retail demo mode service that runs even on consumer PCs.', category: 'Services' },
  { id: 'disable-smart-card-svc', title: 'Disable Smart Card Services', description: 'Disables Smart Card plug-and-play and enumeration services — unused on gaming systems.', category: 'Services' },
  { id: 'disable-nfs-client', title: 'Disable NFS Client', description: 'Disables the Network File System client service if you do not mount Linux/NAS shares.', category: 'Services' },
  { id: 'disable-ip-helper', title: 'Disable IP Helper', description: 'Stops the IPv6 transition technology tunnelling service (Teredo, 6to4) that adds overhead on IPv4-only networks.', category: 'Services' },
  { id: 'disable-wlan-autoconfig', title: 'Disable WLAN AutoConfig (Ethernet)', description: 'Disables the automatic Wi-Fi profile management service. Only for PCs using wired ethernet exclusively.', warning: '⚠ Do NOT enable if you use Wi-Fi.', category: 'Services' },
  { id: 'disable-net-logon', title: 'Disable Net Logon', description: 'Disables the domain authentication logon service on standalone gaming PCs not joined to a corporate domain.', category: 'Services' },
  { id: 'disable-secondary-logon', title: 'Disable Secondary Logon', description: 'Disables the "Run As" secondary logon service — not needed on single-user gaming machines.', category: 'Services' },
  { id: 'disable-sensor-services', title: 'Disable Sensor Services', description: 'Stops light sensor, accelerometer, and geolocation sensor services — unused on desktop PCs.', category: 'Services' },
  { id: 'disable-print-workflow', title: 'Disable Print Workflow', description: 'Removes the Print Workflow background service — safe to disable if no printer is used.', category: 'Services' },
  { id: 'disable-remote-registry', title: 'Disable Remote Registry', description: 'Prevents remote access to the Windows registry, improving security and removing a background service.', category: 'Services' },
];

const CATEGORIES = ['All', 'Main', 'Latency', 'Nvidia', 'GPU', 'Services'];

const CAT_ICONS = {
  All: Zap,
  Main: Settings,
  Latency: Zap,
  Nvidia: Monitor,
  GPU: Cpu,
  Services: Wrench,
};

const CAT_COLORS = {
  All: 'var(--red-primary)',
  Main: 'var(--red-primary)',
  Latency: '#e05030',
  Nvidia: '#76b900',
  GPU: '#e03080',
  Services: '#e07030',
};

const PRESET_SAFE = [
  'disable-background-apps','disable-maintenance','tune-priority','optimize-visual-effects',
  'disable-copilot','disable-search-web','disable-cortana','remove-xbox-gamebar',
  'optimize-memory','optimize-explorer','optimize-fsutil','optimize-boot',
  'optimize-background','disable-superfetch','disable-xbox-services',
  'disable-windows-error-reporting','disable-energy-logging','optimize-irq',
  'disable-homegroup','disable-insider',
];

const PRESET_GAMING = [
  ...PRESET_SAFE,
  'enable-gaming-mode','mouse-tune','keyboard-tune','optimize-mouse',
  'csrss','disable-coalescing','disable-system-responsiveness',
  'optimize-write-cache','disable-synthetic-timers','optimize-svc-split',
  'disable-nvidia-telemetry','basic-nvidia-tweaks','enable-preemption',
  'disable-energy-savings','directx-tweaks','disable-multi-plane-overlay',
  'optimize-intel-igpu','disable-hibernation','disable-storage-sense',
  'disable-driver-services','disable-dwm-throttle',
];

const PRESET_MAX = [
  ...PRESET_GAMING,
  'disable-fast-startup','disable-power-throttling','disable-cpu-parking',
  'set-ultimate-performance','disable-nagle-algorithm','optimize-network-adapter',
  'flush-dns-cache','optimize-ssd','trim-working-set',
  'optimize-usb-polling','disable-raw-input-buffer','optimize-interrupt-affinity',
  'timer-resolution','optimize-io','affinities',
  'nvidia-threaded-optimization','nvidia-max-pre-rendered-frames',
  'enable-hags','disable-shader-cache','optimize-display-refresh',
  'disable-p-states','disable-power-gating','disable-hdcp',
  'max-pending-interrupts','optimize-fsutil','disable-search-indexing',
];

const PRESETS = [
  { id: 'safe',   name: 'Safe Boost',      desc: 'No-risk tweaks',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  Icon: Shield,   tweaks: PRESET_SAFE },
  { id: 'gaming', name: 'Gaming Focus',    desc: 'Optimized for games', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', Icon: Gamepad2, tweaks: PRESET_GAMING },
  { id: 'max',    name: 'Max Performance', desc: 'All recommended',     color: '#e03030', bg: 'rgba(224,48,48,0.12)',  Icon: Flame,    tweaks: PRESET_MAX },
];

function ScoreRing({ percent, color, size = 52 }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(percent, 100) / 100);
  return (
    <div className="osb-score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="osb-score-num" style={{ fontSize: size < 48 ? 10 : 13 }}>{percent}%</div>
    </div>
  );
}

export default function OptimizePage({ tweakStates, onToggle, incompatibleTweaks, initialCategory, setActivePage }) {
  const { isPremium } = usePremium();
  const [activeCategory, setActiveCategory] = useState(initialCategory || 'All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let list = ALL_TWEAKS;
    if (activeCategory !== 'All') list = list.filter(t => t.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, searchQuery]);

  const activeCatColor = CAT_COLORS[activeCategory] || 'var(--red-primary)';

  // ── Sidebar derived stats ────────────────────────────
  const enabledCount = useMemo(() =>
    ALL_TWEAKS.filter(t => tweakStates[t.id]?.enabled).length,
    [tweakStates]
  );
  const totalCount = ALL_TWEAKS.length;
  const scorePercent = Math.round((enabledCount / totalCount) * 100);

  const scoreColor = scorePercent === 0 ? '#444'
    : scorePercent < 25  ? '#e03030'
    : scorePercent < 50  ? '#f59e0b'
    : scorePercent < 75  ? '#22c55e'
    : '#06b6d4';

  const scoreLabel = scorePercent === 0 ? 'Not started'
    : scorePercent < 25  ? 'Light tune'
    : scorePercent < 50  ? 'Moderate'
    : scorePercent < 75  ? 'Well tuned'
    : 'Fully optimized';

  const catStats = useMemo(() =>
    ['Main','Latency','Nvidia','GPU','Services'].map(cat => {
      const tweaks = ALL_TWEAKS.filter(t => t.category === cat);
      const enabled = tweaks.filter(t => tweakStates[t.id]?.enabled).length;
      return { cat, enabled, total: tweaks.length, pct: tweaks.length ? Math.round((enabled / tweaks.length) * 100) : 0 };
    }),
    [tweakStates]
  );

  const activeWarnings = useMemo(() =>
    ALL_TWEAKS.filter(t => t.warning && tweakStates[t.id]?.enabled).slice(0, 5),
    [tweakStates]
  );

  const applyPreset = (preset) => {
    preset.tweaks.forEach(id => {
      if (!tweakStates[id]?.enabled) onToggle(id);
    });
  };

  return (
    <div className="optimize-page">
      {/* Header */}
      <div className="optimize-header">
        <div className="optimize-header-left">
          <div className="optimize-header-icon" style={{ background: `rgba(var(--accent-rgb,224,48,48),0.12)`, border: `1px solid rgba(var(--accent-rgb,224,48,48),0.25)` }}>
            <Zap size={18} style={{ color: 'var(--red-primary)' }} />
          </div>
          <div>
            <h1 className="optimize-title">Optimize</h1>
            <p className="optimize-subtitle">Search, filter and apply tweaks — {enabledCount} active</p>
          </div>
        </div>
        <div className="optimize-search-wrap">
          <Search size={13} className="optimize-search-icon" />
          <input
            className="optimize-search"
            placeholder="Type to search tweaks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="optimize-search-clear" onClick={() => setSearchQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="optimize-tabs">
        {CATEGORIES.map(cat => {
          const Icon = CAT_ICONS[cat];
          const color = CAT_COLORS[cat];
          const isActive = activeCategory === cat;
          const count = cat === 'All' ? ALL_TWEAKS.length : ALL_TWEAKS.filter(t => t.category === cat).length;
          return (
            <motion.button
              key={cat}
              className={`optimize-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
              style={isActive ? { '--tab-color': color } : {}}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
            >
              <Icon size={12} />
              {cat}
              <span className="optimize-tab-count">{count}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Body: grid + sidebar */}
      <div className="optimize-body">

        {/* Main grid column */}
        <div className="optimize-main">
          <div className="optimize-results-info">
            <span style={{ color: activeCatColor, fontWeight: 700 }}>{filtered.length}</span>
            <span> {filtered.length === 1 ? 'tweak' : 'tweaks'}{searchQuery ? ` matching "${searchQuery}"` : activeCategory !== 'All' ? ` in ${activeCategory}` : ' total'}</span>
          </div>
          <div className="optimize-grid">
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div className="optimize-empty" key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Search size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                  <p>No tweaks found for "<strong>{searchQuery}</strong>"</p>
                </motion.div>
              ) : (
                filtered.map((tweak, i) => (
                  <motion.div
                    key={tweak.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.012, type: 'spring', stiffness: 400, damping: 30 }}
                    layout
                  >
                    <TweakCard
                      {...tweak}
                      enabled={tweakStates[tweak.id]?.enabled}
                      loading={tweakStates[tweak.id]?.loading}
                      onToggle={onToggle}
                      iconColor={CAT_COLORS[tweak.category]}
                      incompatible={incompatibleTweaks?.has(tweak.id)}
                      isPremium={PREMIUM_TWEAK_IDS.has(tweak.id)}
                      userHasPremium={isPremium}
                      onUpgrade={() => setActivePage?.('premium')}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="optimize-sidebar">

          {/* Optimization Score */}
          <motion.div className="osb-card" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
            <div className="osb-card-title"><BarChart2 size={10} /> Optimization Score</div>
            <div className="osb-score-wrap">
              <ScoreRing percent={scorePercent} color={scoreColor} size={52} />
              <div className="osb-score-info">
                <span className="osb-score-label" style={{ color: scoreColor }}>{scoreLabel}</span>
                <span className="osb-score-sub">{enabledCount} of {totalCount} tweaks active</span>
              </div>
            </div>
            <div className="osb-stat-row">
              <span className="osb-stat-label">Tweaks available</span>
              <span className="osb-stat-val">{totalCount}</span>
            </div>
            <div className="osb-stat-row">
              <span className="osb-stat-label">Active tweaks</span>
              <span className="osb-stat-val" style={{ color: scoreColor }}>{enabledCount}</span>
            </div>
            <div className="osb-stat-row">
              <span className="osb-stat-label">Active warnings</span>
              <span className="osb-stat-val" style={{ color: activeWarnings.length > 0 ? '#f59e0b' : '#555' }}>
                {activeWarnings.length}
              </span>
            </div>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div className="osb-card" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
            <div className="osb-card-title"><Settings size={10} /> By Category</div>
            {catStats.map(({ cat, enabled, total, pct }) => (
              <div key={cat} className="osb-cat-row">
                <span className="osb-cat-name">{cat}</span>
                <div className="osb-cat-bar-wrap">
                  <div
                    className="osb-cat-bar"
                    style={{
                      width: `${pct}%`,
                      background: CAT_COLORS[cat] || 'var(--red-primary)',
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="osb-cat-count" style={{ color: enabled > 0 ? CAT_COLORS[cat] : undefined }}>
                  {enabled}/{total}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Quick Presets */}
          <motion.div className="osb-card" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.11 }}>
            <div className="osb-card-title"><Zap size={10} /> Quick Presets</div>
            {PRESETS.map(preset => {
              return (
                <motion.button
                  key={preset.id}
                  className="osb-preset-btn"
                  onClick={() => applyPreset(preset)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ borderColor: `${preset.color}22` }}
                >
                  <div className="osb-preset-icon" style={{ background: preset.bg, color: preset.color }}>
                    <preset.Icon size={13} />
                  </div>
                  <div className="osb-preset-info">
                    <span className="osb-preset-name">{preset.name}</span>
                    <span className="osb-preset-desc">{preset.tweaks.length} tweaks</span>
                  </div>
                  <CheckCircle size={11} style={{ color: preset.color, flexShrink: 0 }} />
                </motion.button>
              );
            })}
          </motion.div>

          {/* Active Warnings */}
          {activeWarnings.length > 0 && (
            <motion.div className="osb-card" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 }}
              style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.03)' }}
            >
              <div className="osb-card-title" style={{ color: '#f59e0b' }}>
                <AlertTriangle size={10} /> Active Warnings
              </div>
              {activeWarnings.map(t => (
                <div key={t.id} className="osb-warn-item">
                  <div className="osb-warn-dot" />
                  <span className="osb-warn-text"><strong style={{ color: 'var(--text-primary)', fontSize: 10 }}>{t.title}</strong><br />{t.warning}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Tips */}
          <motion.div className="osb-card" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.17 }}>
            <div className="osb-card-title"><Info size={10} /> Tips</div>
            <ul className="osb-tips">
              <li><Zap size={11} style={{ color: 'var(--red-primary)', flexShrink: 0, marginTop: 1 }} /><span>Apply <strong>Safe Boost</strong> first — it's risk-free on any PC.</span></li>
              <li><Shield size={11} style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} /><span>Create a Restore Point before enabling aggressive tweaks.</span></li>
              <li><AlertTriangle size={11} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} /><span>WiFi & Bluetooth disables are permanent until re-enabled manually.</span></li>
              <li><Cpu size={11} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 1 }} /><span>CPU Parking &amp; VBS tweaks require a restart to take effect.</span></li>
              <li><Gamepad2 size={11} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: 1 }} /><span>Gaming preset is the best balance for daily-driver game PCs.</span></li>
              <li><Monitor size={11} style={{ color: '#e03080', flexShrink: 0, marginTop: 1 }} /><span>HAGS requires a supported GPU driver — test on/off for your card.</span></li>
            </ul>
          </motion.div>

        </aside>
      </div>
    </div>
  );
}
