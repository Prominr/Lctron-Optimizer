// Returns a Set of tweak IDs that are NOT compatible with the given system profile
export function getIncompatibleTweaks(profile) {
  if (!profile) return new Set();

  const {
    isNvidia, isAmd, isIntelGpu, isIntelCpu,
    isLaptop, isWin11, hasWifi, hasBt, hasHyperV, ramGB, hasTouch,
  } = profile;

  const incompatible = new Set();

  // NVIDIA-only tweaks
  if (!isNvidia) {
    incompatible.add('disable-nvidia-telemetry');
    incompatible.add('disable-p-states');
    incompatible.add('disable-hdcp');
    incompatible.add('disable-power-gating');
    incompatible.add('nvidia-profile-inspector');
    incompatible.add('basic-nvidia-tweaks');
    incompatible.add('enable-preemption');
  }

  // AMD GPU-only tweaks
  if (!isAmd) {
    incompatible.add('amd-gpu-tweaks');
  }

  // Intel iGPU-only tweaks
  if (!isIntelGpu) {
    incompatible.add('optimize-intel-igpu');
  }

  // Laptop warning tweaks (P-States especially risky)
  if (isLaptop) {
    incompatible.add('disable-p-states');
    incompatible.add('disable-power-gating');
  }

  // Windows 11 only
  if (!isWin11) {
    incompatible.add('timer-resolution');
    incompatible.add('enable-gaming-mode');
  }

  // WiFi tweak - only relevant if no WiFi adapter
  if (!hasWifi) {
    incompatible.add('disable-wifi');
  }

  // Bluetooth tweak - only relevant if Bluetooth service exists
  if (!hasBt) {
    incompatible.add('disable-bluetooth');
  }

  // Hyper-V already disabled - no point disabling again
  if (!hasHyperV) {
    incompatible.add('disable-hyper-v');
    incompatible.add('disable-synthetic-timers');
  }

  // Touch - only disable if no touch hardware
  if (!hasTouch) {
    incompatible.add('disable-touch');
  }

  // SVC split threshold - only effective on 4GB+ RAM
  if (ramGB < 4) {
    incompatible.add('optimize-svc-split');
  }

  // Intel TSX - Intel CPU only
  if (!isIntelCpu) {
    incompatible.add('disable-intel-tsx');
  }

  return incompatible;
}
