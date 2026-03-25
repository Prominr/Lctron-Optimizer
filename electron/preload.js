const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  applyTweak: (id, enabled) => ipcRenderer.invoke('apply-tweak', id, enabled),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  browseExe: () => ipcRenderer.invoke('browse-exe'),
  browseImage: () => ipcRenderer.invoke('browse-image'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  detectInstalledApps: () => ipcRenderer.invoke('detect-installed-apps'),
  boostApp: (exePath) => ipcRenderer.invoke('boost-app', exePath),
  boostAppAdvanced: (exePath, options) => ipcRenderer.invoke('boost-app-advanced', exePath, options),
  boostFocusMode: (exePath) => ipcRenderer.invoke('boost-focus-mode', exePath),
  cleanSystem: () => ipcRenderer.invoke('clean-system'),
  getSystemProfile: () => ipcRenderer.invoke('get-system-profile'),
  getStartupPrograms: () => ipcRenderer.invoke('get-startup-programs'),
  setStartupProgram: (name, enabled) => ipcRenderer.invoke('set-startup-program', name, enabled),
  getProcesses: () => ipcRenderer.invoke('get-processes'),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  getRestorePoints: () => ipcRenderer.invoke('get-restore-points'),
  createRestorePoint: (desc) => ipcRenderer.invoke('create-restore-point', desc),
  restorePoint: (seq) => ipcRenderer.invoke('restore-point', seq),
  debloatRemoveApp: (pkg) => ipcRenderer.invoke('debloat-remove-app', pkg),
  debloatUiTweak: (id) => ipcRenderer.invoke('debloat-ui-tweak', id),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  emailRegister: (name, email, password) => ipcRenderer.invoke('email-register', name, email, password),
  emailLogin: (email, password) => ipcRenderer.invoke('email-login', email, password),
  startGoogleLogin: () => ipcRenderer.send('start-google-login'),
  onGoogleLoginResult: (cb) => {
    const handler = (event, result) => cb(result);
    ipcRenderer.on('google-login-result', handler);
    return () => ipcRenderer.removeListener('google-login-result', handler);
  },
  getSavedUser: () => ipcRenderer.invoke('get-saved-user'),
  logoutUser: () => ipcRenderer.invoke('logout-user'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (cb) => {
    const handler = (event, data) => cb(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
  runAutoFixScan: () => ipcRenderer.invoke('run-auto-fix-scan'),
  runAutoFixApply: (fixId) => ipcRenderer.invoke('run-auto-fix-apply', fixId),
  exportSettings: () => ipcRenderer.invoke('export-settings'),
  importSettings: () => ipcRenderer.invoke('import-settings'),
  getStartupSetting: () => ipcRenderer.invoke('get-startup-setting'),
  setStartupSetting: (enabled) => ipcRenderer.invoke('set-startup-setting', enabled),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  flushRam: () => ipcRenderer.invoke('flush-ram'),
  gamingModeEnable: () => ipcRenderer.invoke('gaming-mode-enable'),
  gamingModeDisable: () => ipcRenderer.invoke('gaming-mode-disable'),
  getLiveStats: () => ipcRenderer.invoke('get-live-stats'),
  getFileIcon: (filePath) => ipcRenderer.invoke('get-file-icon', filePath),
});
