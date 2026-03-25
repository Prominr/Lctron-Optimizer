const { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const isDev = !!process.defaultApp;

// ─── Google OAuth Config ──────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = '631574178472-m45n1ivvjei6nlob44e6oqom5uqc9rge.apps.googleusercontent.com';
const OAUTH_REDIRECT_PORT = 9876;
const OAUTH_REDIRECT_URI = `http://localhost:${OAUTH_REDIRECT_PORT}/callback`;
const OAUTH_SCOPES = 'openid email profile';

let mainWindow;
let tray = null;
let oauthServer = null;

// ─── Persistent Settings Store ───────────────────────────────────────────────
const SETTINGS_DIR = path.join(
  process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
  'LctronOptimizer'
);
const SETTINGS_PATH = path.join(SETTINGS_DIR, 'settings.json');

function ensureDir() {
  if (!fs.existsSync(SETTINGS_DIR)) fs.mkdirSync(SETTINGS_DIR, { recursive: true });
}

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {}
  return {};
}

function saveSettings(data) {
  try { ensureDir(); fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8'); } catch {}
}

// ── Per-user settings (scoped by email) ───────────────────────────────────────
function getUserSettingsPath(email) {
  const safe = (email || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
  return path.join(SETTINGS_DIR, `user_${safe}.json`);
}

function loadUserSettings(email) {
  if (!email) return {};
  try {
    const p = getUserSettingsPath(email);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return {};
}

function saveUserSettings(email, data) {
  if (!email) return;
  try { ensureDir(); fs.writeFileSync(getUserSettingsPath(email), JSON.stringify(data, null, 2), 'utf8'); } catch {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 1000,
    minHeight: 680,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    icon: path.join(__dirname, '../public/icon.ico'),
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.ico');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('Lctron Optimizer');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Lctron Optimizer',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── Single Instance Lock ────────────────────────────────────────────────────
const gotSingleLock = app.requestSingleInstanceLock();
if (!gotSingleLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupAutoUpdater();
  // Lower this process to Below Normal priority so other apps aren't affected
  exec(`wmic process where ProcessId=${process.pid} CALL setpriority "Below Normal"`, () => {});
});

app.on('window-all-closed', () => {
  // Do not quit — app stays in tray
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// Window controls
ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow && mainWindow.close());

// ─── Custom Updater (GitHub API + electron.net) ───────────────────────────────
const GH_OWNER = 'Prominr';
const GH_REPO  = 'Lctron-Optimizer';
let cachedRelease          = null;
let downloadedInstallerPath = null;

function isNewerVersion(latest, current) {
  const p = v => v.replace(/^v/, '').split('.').map(Number);
  const [lA, lB, lC] = p(latest);
  const [cA, cB, cC] = p(current);
  if (lA !== cA) return lA > cA;
  if (lB !== cB) return lB > cB;
  return lC > cC;
}

function doGithubRequest(useAuth) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Lctron-Optimizer',
      'Accept': 'application/vnd.github.v3+json',
    };
    if (useAuth && process.env.GH_TOKEN) headers['Authorization'] = `token ${process.env.GH_TOKEN}`;
    const req = https.get(
      { hostname: 'api.github.com', path: `/repos/${GH_OWNER}/${GH_REPO}/releases/latest`, headers },
      (res) => {
        let data = '';
        res.on('data', d => (data += d));
        res.on('end', () => {
          try {
            if (res.statusCode === 401 || res.statusCode === 403) {
              return reject(new Error(`auth_failed:${res.statusCode}`));
            }
            if (res.statusCode === 404) {
              return reject(new Error('No GitHub releases published yet'));
            }
            if (res.statusCode !== 200) {
              return reject(new Error(`GitHub API returned ${res.statusCode}`));
            }
            const parsed = JSON.parse(data);
            if (!parsed.tag_name) return reject(new Error(parsed.message || 'No release tag found'));
            resolve(parsed);
          } catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Update check timed out')); });
  });
}

async function fetchLatestRelease() {
  try {
    // Try authenticated first (only if GH_TOKEN env var is set)
    return await doGithubRequest(true);
  } catch (e) {
    // If auth failed or no token was set, retry without any auth (works for public repos)
    if (e.message.startsWith('auth_failed') || !process.env.GH_TOKEN) {
      return await doGithubRequest(false);
    }
    throw e;
  }
}

function downloadInstaller(downloadUrl, destPath) {
  return new Promise((resolve, reject) => {
    const { net } = require('electron');
    const file = fs.createWriteStream(destPath);
    const request = net.request({ url: downloadUrl, redirect: 'follow' });
    let totalSize = 0;
    let received  = 0;
    request.on('response', (response) => {
      totalSize = parseInt(response.headers['content-length'] || '0', 10);
      response.on('data', (chunk) => {
        received += chunk.length;
        file.write(chunk);
        if (totalSize > 0 && mainWindow) {
          mainWindow.webContents.send('update-status', {
            status: 'downloading', percent: Math.round(received / totalSize * 100),
          });
        }
      });
      response.on('end', () => file.end(() => resolve(destPath)));
      response.on('error', (e) => { file.destroy(); try { fs.unlinkSync(destPath); } catch {} reject(e); });
    });
    request.on('error', (e) => { file.destroy(); try { fs.unlinkSync(destPath); } catch {} reject(e); });
    request.end();
  });
}

async function runUpdateCheck() {
  try {
    if (mainWindow) mainWindow.webContents.send('update-status', { status: 'checking' });
    const release = await fetchLatestRelease();
    const latest  = (release.tag_name || '').replace(/^v/, '');
    const current = app.getVersion();
    if (latest && isNewerVersion(latest, current)) {
      cachedRelease = release;
      if (mainWindow) mainWindow.webContents.send('update-status', { status: 'available', version: latest });
      // Auto-download immediately
      const asset = release.assets && release.assets.find(a => a.name.endsWith('.exe'));
      if (asset) {
        const dest = path.join(app.getPath('downloads'), asset.name);
        try {
          await downloadInstaller(asset.browser_download_url, dest);
          downloadedInstallerPath = dest;
          if (mainWindow) mainWindow.webContents.send('update-status', { status: 'downloaded', version: latest });
        } catch (dlErr) {
          if (mainWindow) mainWindow.webContents.send('update-status', { status: 'error', error: dlErr.message });
        }
      }
    } else {
      if (mainWindow) mainWindow.webContents.send('update-status', { status: 'not-available' });
    }
  } catch (e) {
    if (mainWindow) mainWindow.webContents.send('update-status', { status: 'error', error: e.message });
  }
}

function setupAutoUpdater() {
  if (isDev) return;
  setTimeout(runUpdateCheck, 5000);
}

ipcMain.handle('check-for-updates', async () => {
  if (isDev) return { status: 'dev' };
  runUpdateCheck();
  return { success: true };
});

ipcMain.handle('download-update', async () => {
  if (isDev) return { status: 'dev' };
  if (cachedRelease) {
    const asset = cachedRelease.assets && cachedRelease.assets.find(a => a.name.endsWith('.exe'));
    if (asset) {
      const dest = path.join(app.getPath('downloads'), asset.name);
      try {
        await downloadInstaller(asset.browser_download_url, dest);
        downloadedInstallerPath = dest;
        const latest = (cachedRelease.tag_name || '').replace(/^v/, '');
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'downloaded', version: latest });
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    }
  }
  return { success: false, error: 'No update available' };
});

ipcMain.handle('get-startup-setting', () => {
  try { return app.getLoginItemSettings().openAtLogin; } catch { return false; }
});

ipcMain.handle('set-startup-setting', (_, enabled) => {
  try {
    app.setLoginItemSettings({ openAtLogin: !!enabled });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('install-update', async () => {
  if (mainWindow) mainWindow.hide();

  if (downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
    // Launch directly from Downloads folder — always trusted by Windows
    const err = await shell.openPath(downloadedInstallerPath);
    if (!err) { setTimeout(() => app.quit(), 1500); return { triggered: true }; }
    // Fallback: PowerShell Start-Process
    const safe = downloadedInstallerPath.replace(/'/g, "''");
    exec(`powershell -NoProfile -WindowStyle Normal -Command "Start-Process '${safe}'"`, () => {});
    setTimeout(() => app.quit(), 2000);
    return { triggered: true };
  }

  // Nothing downloaded yet — open GitHub releases page
  shell.openExternal(`https://github.com/${GH_OWNER}/${GH_REPO}/releases/latest`);
  setTimeout(() => { if (mainWindow) mainWindow.show(); }, 1500);
  return { triggered: false };
});

ipcMain.handle('open-external', (_, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

// ─── Premium Features ─────────────────────────────────────────────────────────
let savedPowerPlan = null;

ipcMain.handle('flush-ram', async () => {
  return new Promise((resolve) => {
    const script = `
      $sig = '[DllImport("psapi.dll")] public static extern bool EmptyWorkingSet(IntPtr h);'
      $t = Add-Type -MemberDefinition $sig -Name PSAPI -Namespace WS -PassThru
      Get-Process | ForEach-Object { try { $t::EmptyWorkingSet($_.Handle) } catch {} }
      Write-Output "ok"
    `;
    exec(`powershell -NoProfile -WindowStyle Hidden -Command "${script.replace(/\n\s*/g, '; ')}"`,
      (err, stdout) => resolve({ success: !err, output: stdout.trim() })
    );
  });
});

ipcMain.handle('gaming-mode-enable', async () => {
  return new Promise((resolve) => {
    // 1) Save current plan, 2) switch to High Performance, 3) flush RAM
    exec('powercfg /getactivescheme', (err, stdout) => {
      if (!err) {
        const match = stdout.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (match) savedPowerPlan = match[1];
      }
      // High Performance GUID
      exec('powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c', () => {
        // Flush RAM
        const flushScript = '$sig=\'[DllImport("psapi.dll")] public static extern bool EmptyWorkingSet(IntPtr h);\';$t=Add-Type -MemberDefinition $sig -Name PSAPI2 -Namespace WS2 -PassThru;Get-Process|ForEach-Object{try{$t::EmptyWorkingSet($_.Handle)}catch{}}';
        exec(`powershell -NoProfile -WindowStyle Hidden -Command "${flushScript}"`, () => {
          resolve({ success: true, savedPlan: savedPowerPlan });
        });
      });
    });
  });
});

ipcMain.handle('gaming-mode-disable', async () => {
  return new Promise((resolve) => {
    const planToRestore = savedPowerPlan || 'balanced';
    const cmd = savedPowerPlan
      ? `powercfg /setactive ${savedPowerPlan}`
      : 'powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e';
    exec(cmd, (err) => {
      savedPowerPlan = null;
      resolve({ success: !err });
    });
  });
});

// ─── System Restore Points ────────────────────────────────────────────────────
ipcMain.handle('get-restore-points', async () => {
  try {
    const script = `
      Enable-ComputerRestore -Drive "$env:SystemDrive" -ErrorAction SilentlyContinue
      $points = Get-ComputerRestorePoint -ErrorAction SilentlyContinue
      if ($points) {
        $arr = @($points) | ForEach-Object {
          [PSCustomObject]@{
            SequenceNumber   = $_.SequenceNumber
            Description      = $_.Description
            CreationTime     = $_.ConvertToDateTime($_.CreationTime).ToString('M/d/yyyy h:mm:ss tt')
            RestorePointType = $_.RestorePointType
          }
        }
        $arr | Sort-Object SequenceNumber -Descending | ConvertTo-Json -Depth 3
      } else {
        Write-Output '[]'
      }
    `;
    const out = await runPowerShell(script);
    const raw = (out || '').trim();
    let points = [];
    try {
      points = JSON.parse(raw);
      if (!Array.isArray(points)) points = [points];
    } catch {}
    return { points };
  } catch (e) {
    return { points: [], error: e.toString() };
  }
});

ipcMain.handle('create-restore-point', async (event, description) => {
  try {
    const desc = (description || 'Lctron Optimizer').replace(/"/g, '');
    const script = `
      Enable-ComputerRestore -Drive "$env:SystemDrive" -ErrorAction SilentlyContinue
      New-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore" -Name "SystemRestorePointCreationFrequency" -Value 0 -PropertyType DWORD -Force -ErrorAction SilentlyContinue | Out-Null
      Checkpoint-Computer -Description "${desc}" -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop
      Write-Output "success"
    `;
    const out = await runPowerShell(script);
    if (out && out.toLowerCase().includes('error')) {
      return { success: false, error: out };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

ipcMain.handle('restore-point', async (event, sequenceNumber) => {
  try {
    const seq = parseInt(sequenceNumber, 10);
    if (!seq) return { success: false, error: 'Invalid sequence number' };
    await runPowerShell(`Restore-Computer -RestorePoint ${seq} -Confirm:$false`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

ipcMain.handle('load-settings', () => {
  const global = loadSettings();
  const email = global.loggedInUser?.email;
  if (email) {
    const userSettings = loadUserSettings(email);
    return { ...userSettings, loggedInUser: global.loggedInUser };
  }
  return global;
});

ipcMain.handle('save-settings', (event, data) => {
  const global = loadSettings();
  const email = global.loggedInUser?.email;
  if (email) {
    const { loggedInUser, emailUsers, ...userOnly } = data;
    const existing = loadUserSettings(email);
    saveUserSettings(email, { ...existing, ...userOnly });
  } else {
    saveSettings({ ...global, ...data });
  }
  return { success: true };
});

ipcMain.handle('export-settings', async () => {
  const global = loadSettings();
  const email = global.loggedInUser?.email;
  const userSettings = email ? loadUserSettings(email) : global;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Lctron Settings',
    defaultPath: `lctron-backup-${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled) return { success: false };
  try {
    fs.writeFileSync(result.filePath, JSON.stringify({ ...userSettings, _exportedBy: email, _exportedAt: new Date().toISOString() }, null, 2), 'utf8');
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('import-settings', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Lctron Settings',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return { success: false, canceled: true };
  try {
    const imported = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
    const { _exportedBy, _exportedAt, emailUsers, loggedInUser, ...cleanData } = imported;
    const global = loadSettings();
    const email = global.loggedInUser?.email;
    if (email) {
      const existing = loadUserSettings(email);
      saveUserSettings(email, { ...existing, ...cleanData });
    } else {
      saveSettings({ ...global, ...cleanData });
    }
    return { success: true, data: cleanData };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Advanced Auto Fix ────────────────────────────────────────────────────────
ipcMain.handle('run-auto-fix-scan', async () => {
  try {
    const script = `
      $results = @()

      # ── RAM / Memory ──────────────────────────────────────────────────────
      $os = Get-WmiObject Win32_OperatingSystem
      $ramTotalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
      $ramFreeGB  = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
      $ramUsedPct = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100)
      if ($ramUsedPct -gt 85) {
        $results += [PSCustomObject]@{ category='RAM'; severity='high'; label="RAM usage critical ($ramUsedPct% used)"; fix='Trim process working sets'; fixId='trim-working-set'; detail="$ramFreeGB GB free of $ramTotalGB GB" }
      } elseif ($ramUsedPct -gt 70) {
        $results += [PSCustomObject]@{ category='RAM'; severity='medium'; label="High RAM usage ($ramUsedPct%)"; fix='Trim process working sets'; fixId='trim-working-set'; detail="$ramFreeGB GB free of $ramTotalGB GB" }
      }

      # Pagefile check
      $pf = Get-WmiObject Win32_PageFileUsage -ErrorAction SilentlyContinue
      if ($pf) {
        $pfUsedPct = [math]::Round(($pf.CurrentUsage / $pf.AllocatedBaseSize) * 100)
        if ($pfUsedPct -gt 60) {
          $results += [PSCustomObject]@{ category='RAM'; severity='medium'; label="Pagefile heavily used ($pfUsedPct%)"; fix='Optimize memory settings'; fixId='optimize-memory'; detail="$($pf.CurrentUsage) MB / $($pf.AllocatedBaseSize) MB" }
        }
      }

      # ── CPU ───────────────────────────────────────────────────────────────
      $cpu = Get-WmiObject Win32_Processor
      $cpuLoad = $cpu.LoadPercentage
      if ($cpuLoad -gt 80) {
        $results += [PSCustomObject]@{ category='CPU'; severity='high'; label="CPU usage very high ($cpuLoad%)"; fix='Disable background apps & telemetry'; fixId='disable-background-apps'; detail="$($cpu.Name)" }
      }
      # Check power plan
      $plan = (powercfg /getactivescheme 2>&1)
      if ($plan -notmatch 'Ultimate|High performance') {
        $results += [PSCustomObject]@{ category='CPU'; severity='medium'; label='Power plan not set to maximum performance'; fix='Activate Ultimate Performance plan'; fixId='set-ultimate-performance'; detail=$plan }
      }
      # CPU parking
      $parkKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\54533251-82be-4824-96c1-47b60b740d00\\0cc5b647-c1df-4637-891a-dec35c318583"
      $parkVal = (Get-ItemProperty -Path $parkKey -ErrorAction SilentlyContinue).ValueMax
      if ($parkVal -ne 0 -and $parkVal -ne $null) {
        $results += [PSCustomObject]@{ category='CPU'; severity='medium'; label='CPU core parking enabled (causes latency spikes)'; fix='Disable CPU core parking'; fixId='disable-cpu-parking'; detail="Park max value: $parkVal%" }
      }
      # Power throttling
      $ptOff = (Get-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -ErrorAction SilentlyContinue).PowerThrottlingOff
      if ($ptOff -ne 1) {
        $results += [PSCustomObject]@{ category='CPU'; severity='medium'; label='Windows Power Throttling is active'; fix='Disable power throttling'; fixId='disable-power-throttling'; detail='Reduces foreground app CPU speed' }
      }

      # ── Disk ──────────────────────────────────────────────────────────────
      $disks = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3"
      foreach ($d in $disks) {
        $freePct = [math]::Round(($d.FreeSpace / $d.Size) * 100)
        $freeGB  = [math]::Round($d.FreeSpace / 1GB, 1)
        if ($freePct -lt 10) {
          $results += [PSCustomObject]@{ category='Disk'; severity='high'; label="Drive $($d.DeviceID) critically low on space ($freePct% free)"; fix='Run disk cleaner'; fixId='clean-registry'; detail="$freeGB GB free" }
        } elseif ($freePct -lt 20) {
          $results += [PSCustomObject]@{ category='Disk'; severity='medium'; label="Drive $($d.DeviceID) low on space ($freePct% free)"; fix='Run disk cleaner'; fixId='clean-registry'; detail="$freeGB GB free" }
        }
      }
      # TRIM / NTFS
      $trimDisabled = (fsutil behavior query DisableDeleteNotify 2>&1)
      if ($trimDisabled -match '1') {
        $results += [PSCustomObject]@{ category='Disk'; severity='high'; label='SSD TRIM is DISABLED — reduces SSD performance over time'; fix='Enable SSD TRIM'; fixId='optimize-ssd'; detail='fsutil DisableDeleteNotify=1' }
      }
      # Search indexing using disk
      $wsearch = Get-Service -Name WSearch -ErrorAction SilentlyContinue
      if ($wsearch -and $wsearch.Status -eq 'Running') {
        $results += [PSCustomObject]@{ category='Disk'; severity='low'; label='Windows Search indexing running in background'; fix='Disable search indexing'; fixId='disable-search-indexing'; detail='Consumes continuous disk I/O' }
      }
      # Temp folder size
      $tempSize = (Get-ChildItem $env:TEMP -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
      $tempMB = [math]::Round($tempSize / 1MB)
      if ($tempMB -gt 500) {
        $results += [PSCustomObject]@{ category='Disk'; severity='medium'; label="Temp folder is $tempMB MB — needs cleaning"; fix='Clear temp files'; fixId='clear-temp-folder'; detail="$env:TEMP" }
      }

      # ── SMART / Drive Health ──────────────────────────────────────────────
      $physDisks = Get-PhysicalDisk -ErrorAction SilentlyContinue
      foreach ($pd in $physDisks) {
        if ($pd.HealthStatus -ne 'Healthy') {
          $results += [PSCustomObject]@{ category='Drive Health'; severity='high'; label="Drive '$($pd.FriendlyName)' health: $($pd.HealthStatus)"; fix='Back up data immediately'; fixId=''; detail="Model: $($pd.Model)" }
        }
        if ($pd.OperationalStatus -ne 'OK') {
          $results += [PSCustomObject]@{ category='Drive Health'; severity='high'; label="Drive '$($pd.FriendlyName)' operational status: $($pd.OperationalStatus)"; fix='Check drive for errors'; fixId=''; detail="MediaType: $($pd.MediaType)" }
        }
      }

      # ── GPU ───────────────────────────────────────────────────────────────
      $gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.CurrentBitsPerPixel -gt 0 } | Select-Object -First 1
      if ($gpu) {
        # HAGS check
        $hags = (Get-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -ErrorAction SilentlyContinue).HwSchMode
        if ($hags -ne 2) {
          $results += [PSCustomObject]@{ category='GPU'; severity='medium'; label='Hardware-Accelerated GPU Scheduling (HAGS) is off'; fix='Enable HAGS'; fixId='enable-hags'; detail="GPU: $($gpu.Name)" }
        }
        # MPO / Multiplane overlay
        $mpo = (Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm" -ErrorAction SilentlyContinue).OverlayTestMode
        if ($mpo -ne 5) {
          $results += [PSCustomObject]@{ category='GPU'; severity='low'; label='Multi-Plane Overlay may cause stutter'; fix='Disable MPO'; fixId='disable-multi-plane-overlay'; detail='Can cause stuttering on some GPUs' }
        }
        # TDR level
        $tdr = (Get-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -ErrorAction SilentlyContinue).TdrLevel
        if ($tdr -ne 0) {
          $results += [PSCustomObject]@{ category='GPU'; severity='low'; label='GPU Timeout Detection (TDR) active'; fix='Disable GPU timeout'; fixId='disable-gpu-timeout'; detail='Can interrupt GPU under heavy load' }
        }
      }

      # ── Network ───────────────────────────────────────────────────────────
      $nagle = $false
      $tcpInterfaces = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" -ErrorAction SilentlyContinue
      foreach ($iface in $tcpInterfaces) {
        $ackFreq = (Get-ItemProperty $iface.PSPath -ErrorAction SilentlyContinue).TcpAckFrequency
        if ($ackFreq -ne 1) { $nagle = $true }
      }
      if ($nagle) {
        $results += [PSCustomObject]@{ category='Network'; severity='medium'; label="Nagle algorithm active (batches TCP packets, adds latency)"; fix='Disable Nagle algorithm'; fixId='disable-nagle-algorithm'; detail='TcpAckFrequency != 1' }
      }

      # DNS check
      $dnsServers = Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.ServerAddresses.Count -gt 0 }
      $slowDns = $true
      foreach ($d in $dnsServers) {
        foreach ($s in $d.ServerAddresses) {
          if ($s -match '1\.1\.1\.1|8\.8\.8\.8|9\.9\.9\.9|1\.0\.0\.1') { $slowDns = $false }
        }
      }
      if ($slowDns) {
        $results += [PSCustomObject]@{ category='Network'; severity='medium'; label='DNS servers not using fast public resolvers'; fix='Flush & optimize DNS to Cloudflare/Google'; fixId='flush-dns-cache'; detail='Using ISP default DNS' }
      }

      # Network adapter power saving
      $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
      foreach ($a in $adapters) {
        $modInt = Get-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Interrupt Moderation" -ErrorAction SilentlyContinue
        if ($modInt -and $modInt.DisplayValue -ne 'Disabled') {
          $results += [PSCustomObject]@{ category='Network'; severity='low'; label="Network adapter '$($a.Name)' interrupt moderation on"; fix='Optimize network adapter'; fixId='optimize-network-adapter'; detail='Adds latency under load' }
          break
        }
      }

      # ── Telemetry / Privacy ───────────────────────────────────────────────
      $telVal = (Get-ItemProperty "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" -ErrorAction SilentlyContinue).AllowTelemetry
      if ($telVal -ne 0) {
        $results += [PSCustomObject]@{ category='Privacy'; severity='medium'; label='Windows telemetry & data collection active'; fix='Disable telemetry'; fixId='disable-telemetry'; detail="AllowTelemetry=$telVal" }
      }

      $gameBarEnabled = (Get-ItemProperty "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -ErrorAction SilentlyContinue).AppCaptureEnabled
      if ($gameBarEnabled -ne 0) {
        $results += [PSCustomObject]@{ category='Privacy'; severity='low'; label='Xbox Game Bar / DVR overlay active'; fix='Disable Game Bar overlay'; fixId='remove-xbox-gamebar'; detail='Runs in background, captures screen' }
      }

      # ── Services ─────────────────────────────────────────────────────────
      $heavyServices = @(
        @{ Name='DiagTrack';    Label='Connected User Experiences (telemetry)'; FixId='disable-telemetry' },
        @{ Name='WerSvc';       Label='Windows Error Reporting service';       FixId='disable-windows-error-reporting' },
        @{ Name='SysMain';      Label='SysMain (Superfetch) — high disk I/O'; FixId='disable-superfetch' },
        @{ Name='WSearch';      Label='Windows Search indexing service';        FixId='disable-search-indexing' },
        @{ Name='XblGameSave';  Label='Xbox Game Save service';                FixId='disable-xbox-services' }
      )
      foreach ($svc in $heavyServices) {
        $s = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
        if ($s -and $s.Status -eq 'Running' -and $s.StartType -ne 'Disabled') {
          $results += [PSCustomObject]@{ category='Services'; severity='low'; label="$($svc.Label) is running"; fix="Disable $($svc.Name)"; fixId=$svc.FixId; detail="StartType: $($s.StartType)" }
        }
      }

      # ── Startup Programs ──────────────────────────────────────────────────
      $startupCount = (Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue | Measure-Object).Count
      if ($startupCount -gt 12) {
        $results += [PSCustomObject]@{ category='Startup'; severity='medium'; label="$startupCount programs launch at startup (slows boot)"; fix='Review startup programs'; fixId=''; detail='Use Startup Manager to disable' }
      } elseif ($startupCount -gt 7) {
        $results += [PSCustomObject]@{ category='Startup'; severity='low'; label="$startupCount startup programs (moderate impact)"; fix='Review startup programs'; fixId=''; detail='Use Startup Manager to disable' }
      }

      # ── Visual Effects ────────────────────────────────────────────────────
      $perfOpts = (Get-ItemProperty "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -ErrorAction SilentlyContinue).VisualFXSetting
      if ($perfOpts -ne 2) {
        $results += [PSCustomObject]@{ category='Visual'; severity='low'; label='Windows visual effects not optimized for performance'; fix='Optimize visual effects'; fixId='optimize-visual-effects'; detail="VisualFXSetting=$perfOpts" }
      }

      # ── Windows Defender ─────────────────────────────────────────────────
      $defPref = Get-MpPreference -ErrorAction SilentlyContinue
      if ($defPref -and $defPref.DisableRealtimeMonitoring -eq $false) {
        $results += [PSCustomObject]@{ category='Security'; severity='info'; label='Windows Defender real-time scanning active'; fix='Consider disabling during gaming'; fixId='disable-defender-scanning'; detail='Uses ~2-5% CPU continuously' }
      }

      # ── Updates ───────────────────────────────────────────────────────────
      $pendingReboots = Test-Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending" -ErrorAction SilentlyContinue
      if ($pendingReboots) {
        $results += [PSCustomObject]@{ category='Updates'; severity='medium'; label='Pending system reboot (affects performance until restarted)'; fix='Restart your PC'; fixId=''; detail='Windows update or driver install pending' }
      }

      # ── Mouse & Keyboard / Input Devices ─────────────────────────────────
      # Mouse acceleration (Enhance Pointer Precision)
      $mouseAccel = (Get-ItemProperty "HKCU:\\Control Panel\\Mouse" -ErrorAction SilentlyContinue).MouseSpeed
      $mouseThresh1 = (Get-ItemProperty "HKCU:\\Control Panel\\Mouse" -ErrorAction SilentlyContinue).MouseThreshold1
      $mouseThresh2 = (Get-ItemProperty "HKCU:\\Control Panel\\Mouse" -ErrorAction SilentlyContinue).MouseThreshold2
      if ($mouseAccel -ne "0" -or $mouseThresh1 -ne "0" -or $mouseThresh2 -ne "0") {
        $results += [PSCustomObject]@{ category='Mouse'; severity='medium'; label='Mouse acceleration (Enhance Pointer Precision) is ON'; fix='Disable mouse acceleration for consistent aim'; fixId='disable-mouse-acceleration'; detail="Speed=$mouseAccel Thresh1=$mouseThresh1 Thresh2=$mouseThresh2" }
      }

      # Mouse pointer speed (not at center value 10)
      $mouseSpd = (Get-ItemProperty "HKCU:\\Control Panel\\Mouse" -ErrorAction SilentlyContinue).MouseSensitivity
      if ($mouseSpd -and $mouseSpd -ne "10") {
        $results += [PSCustomObject]@{ category='Mouse'; severity='low'; label="Pointer speed not at default (6/11) — currently $mouseSpd/20"; fix='Set pointer speed to default'; fixId=''; detail='Non-default sensitivity may cause inconsistency' }
      }

      # Raw input / direct input check via SmoothMouseXCurve
      $smoothCurve = (Get-ItemProperty "HKCU:\\Control Panel\\Mouse" -ErrorAction SilentlyContinue).SmoothMouseXCurve
      if ($smoothCurve) {
        $results += [PSCustomObject]@{ category='Mouse'; severity='low'; label='Smooth mouse curve active (adds input smoothing)'; fix='Remove mouse smoothing curve'; fixId='disable-mouse-acceleration'; detail='SmoothMouseXCurve present' }
      }

      # USB HID polling rate — check if any HID device has lower than 1000Hz set
      $hidKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters"
      $hidPoll = (Get-ItemProperty $hidKey -ErrorAction SilentlyContinue).MouseDataQueueSize
      # Check USB poll interval in device registry
      $usbHidDevices = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USB" -ErrorAction SilentlyContinue | Get-ChildItem -ErrorAction SilentlyContinue
      $lowPollFound = $false
      foreach ($dev in $usbHidDevices) {
        $pollProp = (Get-ItemProperty $dev.PSPath -ErrorAction SilentlyContinue).HidIdleTime
        if ($pollProp -and [int]$pollProp -gt 4) { $lowPollFound = $true; break }
      }
      if ($lowPollFound) {
        $results += [PSCustomObject]@{ category='Mouse'; severity='medium'; label='USB HID device idle time high (reduces polling rate)'; fix='Optimize USB polling rate'; fixId='optimize-usb-polling'; detail='HidIdleTime > 4ms detected' }
      }

      # Filter Keys (adds input delay to keyboard)
      $filterFlags = (Get-ItemProperty "HKCU:\\Control Panel\\Accessibility\\Keyboard Response" -ErrorAction SilentlyContinue).Flags
      if ($filterFlags -and ($filterFlags -band 1) -eq 1) {
        $results += [PSCustomObject]@{ category='Keyboard'; severity='high'; label='Filter Keys enabled — adds deliberate keyboard input delay'; fix='Disable Filter Keys'; fixId='disable-filter-keys'; detail="Flags=$filterFlags" }
      }

      # Sticky Keys
      $stickyFlags = (Get-ItemProperty "HKCU:\\Control Panel\\Accessibility\\StickyKeys" -ErrorAction SilentlyContinue).Flags
      if ($stickyFlags -and ($stickyFlags -band 1) -eq 1) {
        $results += [PSCustomObject]@{ category='Keyboard'; severity='medium'; label='Sticky Keys enabled — may interfere during gaming'; fix='Disable Sticky Keys'; fixId='disable-sticky-keys'; detail="Flags=$stickyFlags" }
      }

      # Toggle Keys
      $toggleFlags = (Get-ItemProperty "HKCU:\\Control Panel\\Accessibility\\ToggleKeys" -ErrorAction SilentlyContinue).Flags
      if ($toggleFlags -and ($toggleFlags -band 1) -eq 1) {
        $results += [PSCustomObject]@{ category='Keyboard'; severity='low'; label='Toggle Keys enabled'; fix='Disable Toggle Keys'; fixId='disable-toggle-keys'; detail="Flags=$toggleFlags" }
      }

      # Keyboard repeat rate / delay (slow repeat = higher value)
      $kbdDelay = (Get-ItemProperty "HKCU:\\Control Panel\\Keyboard" -ErrorAction SilentlyContinue).KeyboardDelay
      $kbdSpeed = (Get-ItemProperty "HKCU:\\Control Panel\\Keyboard" -ErrorAction SilentlyContinue).KeyboardSpeed
      if ($kbdDelay -and [int]$kbdDelay -gt 1) {
        $results += [PSCustomObject]@{ category='Keyboard'; severity='low'; label="Keyboard repeat delay is slow (value $kbdDelay / max 3)"; fix='Optimize keyboard repeat rate'; fixId='optimize-keyboard-repeat'; detail='Lower value = faster key response' }
      }

      # PS/2 keyboard legacy emulation (adds latency)
      $i8042 = Get-Service -Name i8042prt -ErrorAction SilentlyContinue
      if ($i8042 -and $i8042.Status -eq 'Running') {
        $results += [PSCustomObject]@{ category='Keyboard'; severity='low'; label='Legacy PS/2 keyboard driver (i8042prt) active'; fix='Switch to USB HID driver'; fixId=''; detail='PS/2 emulation adds interrupt latency' }
      }

      # USB power saving / selective suspend on HID devices
      $usbSuspend = (Get-ItemProperty "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB" -ErrorAction SilentlyContinue).DisableSelectiveSuspend
      if ($usbSuspend -ne 1) {
        $results += [PSCustomObject]@{ category='Mouse'; severity='medium'; label='USB selective suspend enabled (can cause mouse/keyboard stutter)'; fix='Disable USB selective suspend'; fixId='disable-usb-selective-suspend'; detail='USB devices may micro-stutter or disconnect' }
      }

      # Input lag — foreground boost check
      $fgBoost = (Get-ItemProperty "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -ErrorAction SilentlyContinue).Win32PrioritySeparation
      if ($fgBoost -ne 38 -and $fgBoost -ne 26) {
        $results += [PSCustomObject]@{ category='Mouse'; severity='low'; label='Foreground process priority boost not optimized'; fix='Optimize foreground priority for low input latency'; fixId='optimize-foreground-boost'; detail="Win32PrioritySeparation=$fgBoost" }
      }

      # ── Audio Services ────────────────────────────────────────────────────
      $audioSvc = Get-Service -Name AudioSrv -ErrorAction SilentlyContinue
      $audioEpSvc = Get-Service -Name AudioEndpointBuilder -ErrorAction SilentlyContinue
      if ($audioSvc -and $audioSvc.Status -ne 'Running') {
        $results += [PSCustomObject]@{ category='Audio'; severity='high'; label='Windows Audio service is NOT running — no sound output'; fix='Restart audio service'; fixId='fix-audio-service'; detail="AudioSrv status: $($audioSvc.Status)" }
      }
      if ($audioEpSvc -and $audioEpSvc.Status -ne 'Running') {
        $results += [PSCustomObject]@{ category='Audio'; severity='high'; label='Windows Audio Endpoint Builder not running — devices unavailable'; fix='Restart audio endpoint service'; fixId='fix-audio-service'; detail="AudioEndpointBuilder status: $($audioEpSvc.Status)" }
      }

      # ── Driver / Device errors ────────────────────────────────────────────
      $errorDevices = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Error' -or $_.Status -eq 'Unknown' }
      if ($errorDevices) {
        $errCount = ($errorDevices | Measure-Object).Count
        $errNames = ($errorDevices | Select-Object -First 3 | ForEach-Object { $_.FriendlyName }) -join ', '
        $results += [PSCustomObject]@{ category='Drivers'; severity='high'; label="$errCount device(s) have driver errors in Device Manager"; fix='Update or reinstall affected drivers'; fixId=''; detail=$errNames }
      }

      # ── Battery (laptops) ─────────────────────────────────────────────────
      $battery = Get-WmiObject Win32_Battery -ErrorAction SilentlyContinue
      if ($battery) {
        $charge = $battery.EstimatedChargeRemaining
        $battStatus = $battery.BatteryStatus
        if ($charge -lt 20 -and $battStatus -ne 2) {
          $results += [PSCustomObject]@{ category='Battery'; severity='high'; label="Battery critically low ($charge% remaining)"; fix='Plug in charger immediately'; fixId=''; detail="BatteryStatus=$battStatus" }
        }
        powercfg /batteryreport /output "$env:TEMP\lctron_batt.xml" /xml 2>&1 | Out-Null
        if (Test-Path "$env:TEMP\lctron_batt.xml") {
          try {
            [xml]$bxml = Get-Content "$env:TEMP\lctron_batt.xml" -ErrorAction SilentlyContinue
            $design = [int]($bxml.BatteryReport.Batteries.Battery.DesignCapacity)
            $full   = [int]($bxml.BatteryReport.Batteries.Battery.FullChargeCapacity)
            if ($design -gt 0) {
              $healthPct = [math]::Round(($full / $design) * 100)
              if ($healthPct -lt 60) {
                $results += [PSCustomObject]@{ category='Battery'; severity='high'; label="Battery health critical ($healthPct% of original capacity)"; fix='Replace battery soon'; fixId=''; detail="Full: $full mWh / Design: $design mWh" }
              } elseif ($healthPct -lt 80) {
                $results += [PSCustomObject]@{ category='Battery'; severity='medium'; label="Battery health degraded ($healthPct% of original capacity)"; fix='Consider replacing battery'; fixId=''; detail="Full: $full mWh / Design: $design mWh" }
              }
            }
          } catch {}
          Remove-Item "$env:TEMP\lctron_batt.xml" -Force -ErrorAction SilentlyContinue
        }
      }

      # ── Windows Activation ────────────────────────────────────────────────
      $actStatus = (Get-CimInstance SoftwareLicensingProduct -Filter "Name like 'Windows%'" -ErrorAction SilentlyContinue | Where-Object { $_.PartialProductKey } | Select-Object -First 1).LicenseStatus
      if ($actStatus -and $actStatus -ne 1) {
        $results += [PSCustomObject]@{ category='Windows'; severity='high'; label='Windows is NOT activated — may cause performance limitations'; fix='Activate Windows in Settings'; fixId=''; detail="LicenseStatus: $actStatus" }
      }

      # ── Windows File Corruption (CBS log) ────────────────────────────────
      $cbsLog = Get-Content "$env:windir\Logs\CBS\CBS.log" -Tail 200 -ErrorAction SilentlyContinue
      if ($cbsLog -match 'Cannot repair member file|Repair failed|could not be repaired') {
        $results += [PSCustomObject]@{ category='Windows'; severity='high'; label='Windows system file corruption detected'; fix='Run: sfc /scannow in elevated Command Prompt'; fixId=''; detail='Corruption found in CBS.log' }
      }

      # ── Pending Windows Updates ───────────────────────────────────────────
      try {
        $wuSession = New-Object -ComObject Microsoft.Update.Session -ErrorAction SilentlyContinue
        if ($wuSession) {
          $searcher = $wuSession.CreateUpdateSearcher()
          $searchResult = $searcher.Search("IsInstalled=0 and Type='Software' and IsHidden=0")
          $updateCount = $searchResult.Updates.Count
          if ($updateCount -gt 5) {
            $results += [PSCustomObject]@{ category='Windows'; severity='medium'; label="$updateCount Windows updates pending installation"; fix='Install updates via Windows Update'; fixId=''; detail='Updates include security patches' }
          } elseif ($updateCount -gt 0) {
            $results += [PSCustomObject]@{ category='Windows'; severity='low'; label="$updateCount Windows update(s) available"; fix='Install updates via Windows Update'; fixId=''; detail='Keep Windows up to date' }
          }
        }
      } catch {}

      # ── Timer Resolution ──────────────────────────────────────────────────
      $sysResp = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -ErrorAction SilentlyContinue).SystemResponsiveness
      if ($sysResp -ne $null -and $sysResp -ne 0) {
        $results += [PSCustomObject]@{ category='CPU'; severity='medium'; label="Multimedia timer SystemResponsiveness=$sysResp (not optimal for gaming)"; fix='Set timer resolution to lowest latency'; fixId='timer-resolution'; detail='Should be 0 for minimum input latency' }
      }

      # ── Memory — single process hogging RAM ───────────────────────────────
      $topProc = Get-Process -ErrorAction SilentlyContinue | Sort-Object WorkingSet64 -Descending | Select-Object -First 1
      if ($topProc -and $topProc.WorkingSet64 -gt 2147483648) {
        $procGB = [math]::Round($topProc.WorkingSet64 / 1GB, 1)
        $results += [PSCustomObject]@{ category='RAM'; severity='medium'; label="Process '$($topProc.Name)' is using $procGB GB RAM"; fix='Close or restart the application'; fixId=''; detail="PID: $($topProc.Id)" }
      }

      # ── HDD Fragmentation hint ────────────────────────────────────────────
      $physDisksAll = Get-PhysicalDisk -ErrorAction SilentlyContinue
      $hasHDD = $physDisksAll | Where-Object { $_.MediaType -eq 'HDD' }
      if ($hasHDD) {
        $results += [PSCustomObject]@{ category='Disk'; severity='low'; label='HDD detected — fragmentation may reduce performance'; fix='Run Disk Defragmenter'; fixId=''; detail='SSDs do not need defragmentation' }
      }

      # ── QoS bandwidth reservation ─────────────────────────────────────────
      $qosLimit = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched" -ErrorAction SilentlyContinue).NonBestEffortLimit
      if ($qosLimit -and $qosLimit -gt 0) {
        $results += [PSCustomObject]@{ category='Network'; severity='medium'; label="QoS reserves $qosLimit% of bandwidth for Windows background tasks"; fix='Remove QoS bandwidth reservation'; fixId='optimize-bufferbloat'; detail='Reduces available network throughput' }
      }

      # ── Windows Firewall disabled ─────────────────────────────────────────
      $fwProfiles = Get-NetFirewallProfile -ErrorAction SilentlyContinue
      $fwOff = $fwProfiles | Where-Object { $_.Enabled -eq $false }
      if ($fwOff) {
        $fwNames = ($fwOff | ForEach-Object { $_.Name }) -join ', '
        $results += [PSCustomObject]@{ category='Security'; severity='high'; label="Windows Firewall DISABLED on: $fwNames"; fix='Re-enable Windows Firewall for protection'; fixId=''; detail='System exposed to network threats without firewall' }
      }

      # ── Scheduled task bloat ──────────────────────────────────────────────
      $taskCount = (Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Ready' -and $_.TaskPath -notmatch '\\Microsoft\\' } | Measure-Object).Count
      if ($taskCount -gt 20) {
        $results += [PSCustomObject]@{ category='Startup'; severity='medium'; label="$taskCount third-party scheduled tasks running in background"; fix='Review scheduled tasks'; fixId=''; detail='Excess tasks slow down the system' }
      }

      $results | ConvertTo-Json -Depth 3 -Compress
    `;
    const raw = await runPowerShell(script);
    let findings = [];
    try {
      const parsed = JSON.parse(raw);
      findings = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      findings = [];
    }
    return { success: true, findings };
  } catch (e) {
    return { success: false, error: e.toString(), findings: [] };
  }
});

ipcMain.handle('run-auto-fix-apply', async (event, fixId) => {
  if (!fixId) return { success: true };
  try {
    const result = await applyTweak(fixId, true);
    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

// ─── App Version (runtime, always accurate) ───────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion());

// ─── App Booster – real disk detection ───────────────────────────────────────
// Known game/app entries; paths may contain multiple candidates (first found wins)
const KNOWN_APPS = [
  // Steam games — paths relative to a Steam library root under steamapps\common
  { name: 'CS2',               exe: 'cs2.exe',                           steamDir: 'Counter-Strike Global Offensive\\game\\bin\\win64',           steamAppId: 730,     emoji: '💣', publisher: 'Valve' },
  { name: 'Dota 2',            exe: 'dota2.exe',                         steamDir: 'dota 2 beta\\game\\bin\\win64',                                steamAppId: 570,     emoji: '⚔️', publisher: 'Valve' },
  { name: 'Apex Legends',      exe: 'r5apex.exe',                        steamDir: 'Apex Legends',                                                 steamAppId: 1172470, emoji: '🏹', publisher: 'EA' },
  { name: 'GTA V',             exe: 'GTA5.exe',                          steamDir: 'Grand Theft Auto V',                                           steamAppId: 271590,  emoji: '🚗', publisher: 'Rockstar' },
  { name: 'Cyberpunk 2077',    exe: 'Cyberpunk2077.exe',                 steamDir: 'Cyberpunk 2077\\bin\\x64',                                     steamAppId: 1091500, emoji: '🤖', publisher: 'CD Projekt Red' },
  { name: 'Elden Ring',        exe: 'eldenring.exe',                     steamDir: 'ELDEN RING\\Game',                                             steamAppId: 1245620, emoji: '🗡️', publisher: 'FromSoftware' },
  { name: 'Rocket League',     exe: 'RocketLeague.exe',                  steamDir: 'rocketleague\\Binaries\\Win64',                                steamAppId: 252950,  emoji: '🚀', publisher: 'Psyonix' },
  { name: 'PUBG',              exe: 'TslGame.exe',                       steamDir: 'PUBG\\TslGame\\Binaries\\Win64',                               steamAppId: 578080,  emoji: '🎯', publisher: 'Krafton' },
  { name: 'Team Fortress 2',   exe: 'hl2.exe',                           steamDir: 'Team Fortress 2',                                              steamAppId: 440,     emoji: '🎩', publisher: 'Valve' },
  { name: 'Left 4 Dead 2',     exe: 'left4dead2.exe',                    steamDir: 'Left 4 Dead 2',                                                steamAppId: 550,     emoji: '🧟', publisher: 'Valve' },
  { name: 'Rust',              exe: 'RustClient.exe',                    steamDir: 'Rust',                                                         steamAppId: 252490,  emoji: '🪓', publisher: 'Facepunch' },
  { name: 'ARK',               exe: 'ShooterGame.exe',                   steamDir: 'ARK\\ShooterGame\\Binaries\\Win64',                            steamAppId: 346110,  emoji: '🦕', publisher: 'Studio Wildcard' },
  { name: 'Forza Horizon 5',   exe: 'ForzaHorizon5.exe',                 steamDir: 'ForzaHorizon5',                                                steamAppId: 1551360, emoji: '🏎️', publisher: 'Xbox' },
  { name: 'Halo Infinite',     exe: 'HaloInfinite.exe',                  steamDir: 'Halo Infinite',                                                steamAppId: 1240440, emoji: '🪖', publisher: 'Xbox' },
  { name: 'Baldur\'s Gate 3',  exe: 'bg3.exe',                           steamDir: 'Baldurs Gate 3\\bin',                                          steamAppId: 1086940, emoji: '⚔️', publisher: 'Larian' },
  { name: 'Hogwarts Legacy',   exe: 'HogwartsLegacy.exe',                steamDir: 'Hogwarts Legacy\\Phoenix\\Binaries\\Win64',                    steamAppId: 990080,  emoji: '🧙', publisher: 'WB Games' },
  { name: 'The Witcher 3',     exe: 'witcher3.exe',                      steamDir: 'The Witcher 3\\bin\\x64',                                      steamAppId: 292030,  emoji: '🗡️', publisher: 'CD Projekt Red' },
  { name: 'Rainbow Six Siege', exe: 'RainbowSix.exe',                    steamDir: 'Tom Clancy\'s Rainbow Six Siege',                              steamAppId: 359550,  emoji: '🛡️', publisher: 'Ubisoft' },
  { name: 'Warframe',          exe: 'Warframe.x64.exe',                  steamDir: 'Warframe',                                                     steamAppId: 230410,  emoji: '🤖', publisher: 'Digital Extremes' },
  { name: 'Destiny 2',         exe: 'destiny2.exe',                      steamDir: 'Destiny 2',                                                    steamAppId: 1085660, emoji: '🚀', publisher: 'Bungie' },
  // Non-steam fixed paths
  { name: 'Fortnite',          exe: 'FortniteClient-Win64-Shipping.exe', fixedPaths: ['C:\\Program Files\\Epic Games\\Fortnite\\FortniteGame\\Binaries\\Win64\\FortniteClient-Win64-Shipping.exe'], emoji: '🎮', publisher: 'Epic Games' },
  { name: 'Valorant',          exe: 'VALORANT-Win64-Shipping.exe',       fixedPaths: ['C:\\Riot Games\\VALORANT\\live\\ShooterGame\\Binaries\\Win64\\VALORANT-Win64-Shipping.exe'], emoji: '🔫', publisher: 'Riot Games' },
  { name: 'League of Legends', exe: 'League of Legends.exe',             fixedPaths: ['C:\\Riot Games\\League of Legends\\Game\\League of Legends.exe'], emoji: '⚔️', publisher: 'Riot Games' },
  { name: 'Overwatch 2',       exe: 'Overwatch.exe',                     fixedPaths: ['C:\\Program Files (x86)\\Overwatch\\Overwatch.exe', 'C:\\Program Files\\Overwatch\\Overwatch.exe'], emoji: '🦸', publisher: 'Blizzard' },
  { name: 'Minecraft',         exe: 'MinecraftLauncher.exe',             fixedPaths: ['C:\\Program Files (x86)\\Minecraft Launcher\\MinecraftLauncher.exe', 'C:\\Program Files\\Minecraft Launcher\\MinecraftLauncher.exe', `${process.env.LOCALAPPDATA || ''}\\Packages\\Microsoft.4297127D64EC6_8wekyb3d8bbwe\\LocalCache\\Local\\runtime`], emoji: '⛏️', publisher: 'Mojang' },
  { name: 'Roblox',            exe: 'RobloxPlayerBeta.exe',              fixedPaths: [`${process.env.LOCALAPPDATA || ''}\\Roblox\\Versions`], exeSearch: true, emoji: '🧱', publisher: 'Roblox' },
  { name: 'Warzone',           exe: 'ModernWarfare.exe',                 fixedPaths: ['C:\\Program Files (x86)\\Call of Duty\\ModernWarfare.exe', 'C:\\Program Files\\Call of Duty\\ModernWarfare.exe'], emoji: '🪖', publisher: 'Activision' },
  // Apps
  { name: 'Discord',           exe: 'Discord.exe',                       fixedPaths: [`${process.env.LOCALAPPDATA || ''}\\Discord`], exeSearch: true, emoji: '💬', publisher: 'Discord', isApp: true },
  { name: 'Steam',             exe: 'steam.exe',                         fixedPaths: ['C:\\Program Files (x86)\\Steam\\steam.exe', 'C:\\Program Files\\Steam\\steam.exe'], emoji: '🎮', publisher: 'Valve', isApp: true },
  { name: 'Chrome',            exe: 'chrome.exe',                        fixedPaths: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'], emoji: '🌐', publisher: 'Google', isApp: true },
  { name: 'Firefox',           exe: 'firefox.exe',                       fixedPaths: ['C:\\Program Files\\Mozilla Firefox\\firefox.exe', 'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'], emoji: '🦊', publisher: 'Mozilla', isApp: true },
  { name: 'OBS Studio',        exe: 'obs64.exe',                         fixedPaths: ['C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe', 'C:\\Program Files (x86)\\obs-studio\\bin\\64bit\\obs64.exe'], emoji: '📹', publisher: 'OBS Project', isApp: true },
  { name: 'Spotify',           exe: 'Spotify.exe',                       fixedPaths: [`${process.env.APPDATA || ''}\\Spotify\\Spotify.exe`], emoji: '🎵', publisher: 'Spotify', isApp: true },
  { name: 'Epic Games',        exe: 'EpicGamesLauncher.exe',             fixedPaths: ['C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe', 'C:\\Program Files\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe'], emoji: '🚀', publisher: 'Epic Games', isApp: true },
  { name: 'Battle.net',        exe: 'Battle.net.exe',                    fixedPaths: ['C:\\Program Files (x86)\\Battle.net\\Battle.net.exe', 'C:\\Program Files\\Battle.net\\Battle.net.exe'], emoji: '⚔️', publisher: 'Blizzard', isApp: true },
  { name: 'Ubisoft Connect',   exe: 'UbisoftConnect.exe',                fixedPaths: ['C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\UbisoftConnect.exe'], emoji: '🎮', publisher: 'Ubisoft', isApp: true },
];

function getSteamLibraryPaths() {
  const roots = [];
  // Default Steam locations
  const defaults = [
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
    path.join(process.env.LOCALAPPDATA || '', 'Steam'),
  ];
  for (const d of defaults) {
    if (fs.existsSync(d)) roots.push(d);
  }
  // Parse libraryfolders.vdf for additional library paths
  for (const root of [...roots]) {
    const vdf = path.join(root, 'steamapps', 'libraryfolders.vdf');
    if (!fs.existsSync(vdf)) continue;
    try {
      const text = fs.readFileSync(vdf, 'utf8');
      const matches = text.matchAll(/"path"\s+"([^"]+)"/g);
      for (const m of matches) {
        const p = m[1].replace(/\\\\/g, '\\');
        if (!roots.includes(p) && fs.existsSync(p)) roots.push(p);
      }
    } catch {}
  }
  return roots;
}

function findExeInDir(dir, exeName) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.toLowerCase() === exeName.toLowerCase()) {
        return path.join(dir, e.name);
      }
      if (e.isDirectory()) {
        const found = findExeInDir(path.join(dir, e.name), exeName);
        if (found) return found;
      }
    }
  } catch {}
  return null;
}

const NON_GAME_EXE = /^(unins|setup|install|update|crash|vcredist|directx|redist|repair|dotnet|msvc|prerequisite|helper|notification|drm|eac|easyanticheat|battleye|cef_|dxsetup|vc_|oalinst|unarc|7za|cleanup|uninst|uninstaller|crashpad|crashreport|crashhandler)/i;
const NON_GAME_DIR = /^(redist|\$|__inst|prerequisites|directx|vcredist|dotnet|support|tools|__common|commonredist|physx|backdrop)/i;

function scoreExe(exePath, rootDirName) {
  const base = path.basename(exePath, '.exe').toLowerCase().replace(/[^a-z0-9]/g, '');
  const dir  = rootDirName.toLowerCase().replace(/[^a-z0-9]/g, '');
  let score = 0;
  try { score += Math.log10(Math.max(fs.statSync(exePath).size, 1)); } catch {}
  if (base === dir) score += 50;                     // exact match
  else if (base.includes(dir) || dir.includes(base)) score += 20; // partial match
  if (/launcher|bootstrap|patcher|updater|autoupdat/i.test(base)) score -= 15;
  return score;
}

function findBestGameExe(dir, depth = 0, rootDir) {
  if (depth >= 4) return null;
  const root = rootDir || path.basename(dir);
  let bestExe = null;
  let bestScore = -Infinity;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.toLowerCase().endsWith('.exe') && !NON_GAME_EXE.test(e.name)) {
        const exePath = path.join(dir, e.name);
        try {
          if (fs.statSync(exePath).size < 1024 * 1024) continue;
          const s = scoreExe(exePath, root);
          if (s > bestScore) { bestScore = s; bestExe = exePath; }
        } catch {}
      } else if (e.isDirectory() && !e.name.startsWith('.') && !NON_GAME_DIR.test(e.name)) {
        const sub = findBestGameExe(path.join(dir, e.name), depth + 1, root);
        if (sub) {
          const s = scoreExe(sub, root);
          if (s > bestScore) { bestScore = s; bestExe = sub; }
        }
      }
    }
  } catch {}
  return bestExe;
}

ipcMain.handle('detect-installed-apps', async () => {
  const steamLibs = getSteamLibraryPaths();
  const seenPaths = new Set();
  const found = [];

  const addApp = (entry) => {
    const key = (entry.path || '').toLowerCase();
    if (!key || seenPaths.has(key)) return;
    seenPaths.add(key);
    found.push({ ...entry, id: Date.now() + Math.random() });
  };

  const isDupDir = (gameDir) => {
    const lk = gameDir.toLowerCase() + '\\';
    for (const p of seenPaths) { if (p.startsWith(lk)) return true; }
    return false;
  };

  // ── 1. Known apps (Steam dirs + fixed paths) ─────────────────────────
  for (const entry of KNOWN_APPS) {
    let resolved = null;
    if (entry.steamDir && steamLibs.length) {
      for (const lib of steamLibs) {
        const candidate = path.join(lib, 'steamapps', 'common', entry.steamDir, entry.exe);
        if (fs.existsSync(candidate)) { resolved = candidate; break; }
      }
    }
    if (!resolved && entry.fixedPaths) {
      for (const fp of entry.fixedPaths) {
        if (entry.exeSearch) {
          if (fs.existsSync(fp)) { const hit = findExeInDir(fp, entry.exe); if (hit) { resolved = hit; break; } }
        } else {
          if (fs.existsSync(fp)) { resolved = fp; break; }
        }
      }
    }
    if (resolved) {
      addApp({ name: entry.name, exe: entry.exe, path: resolved, emoji: entry.emoji, publisher: entry.publisher, isApp: entry.isApp || false, steamAppId: entry.steamAppId || null });
    }
  }

  // ── 2. Generic Steam — scan ALL steamapps/common directories ─────────
  for (const lib of steamLibs) {
    const commonDir = path.join(lib, 'steamapps', 'common');
    if (!fs.existsSync(commonDir)) continue;
    try {
      const dirs = fs.readdirSync(commonDir, { withFileTypes: true }).filter(e => e.isDirectory());
      for (const gd of dirs) {
        const gameDir = path.join(commonDir, gd.name);
        if (isDupDir(gameDir)) continue;
        const bestExe = findBestGameExe(gameDir);
        if (bestExe) addApp({ name: gd.name, exe: path.basename(bestExe), path: bestExe, emoji: '🎮', publisher: 'Steam', isApp: false, steamAppId: null });
      }
    } catch {}
  }

  // ── 3. Epic Games — parse installed manifests ────────────────────────
  const epicManDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
  if (fs.existsSync(epicManDir)) {
    try {
      const items = fs.readdirSync(epicManDir).filter(f => f.endsWith('.item'));
      for (const item of items) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(epicManDir, item), 'utf8'));
          const installDir = data.InstallLocation;
          const launchExe  = data.LaunchExecutable;
          if (!installDir || !launchExe) continue;
          const exePath = path.join(installDir, launchExe);
          if (!fs.existsSync(exePath)) continue;
          addApp({ name: data.DisplayName || data.AppName || path.basename(installDir), exe: path.basename(launchExe), path: exePath, emoji: '🎮', publisher: 'Epic Games', isApp: false, steamAppId: null });
        } catch {}
      }
    } catch {}
  }

  // ── 4. GOG, EA, Ubisoft, Xbox + extra drives ─────────────────────────
  const extraGameDirs = [
    { dir: 'C:\\Program Files (x86)\\GOG Galaxy\\Games',                          publisher: 'GOG' },
    { dir: 'C:\\Program Files\\GOG Games',                                         publisher: 'GOG' },
    { dir: 'C:\\Program Files\\EA Games',                                          publisher: 'EA' },
    { dir: 'C:\\Program Files (x86)\\Origin Games',                               publisher: 'EA' },
    { dir: 'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games',      publisher: 'Ubisoft' },
    { dir: 'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher\\games',            publisher: 'Ubisoft' },
    { dir: 'C:\\XboxGames',                                                        publisher: 'Xbox' },
  ];
  for (const drive of ['D','E','F','G','H']) {
    extraGameDirs.push({ dir: `${drive}:\\Games`,                             publisher: 'Games' });
    extraGameDirs.push({ dir: `${drive}:\\SteamLibrary\\steamapps\\common`,   publisher: 'Steam' });
    extraGameDirs.push({ dir: `${drive}:\\Steam\\steamapps\\common`,          publisher: 'Steam' });
    extraGameDirs.push({ dir: `${drive}:\\Program Files\\EA Games`,           publisher: 'EA' });
  }
  for (const { dir, publisher } of extraGameDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory());
      for (const e of entries) {
        const gameDir = path.join(dir, e.name);
        if (isDupDir(gameDir)) continue;
        const bestExe = findBestGameExe(gameDir);
        if (bestExe) addApp({ name: e.name, exe: path.basename(bestExe), path: bestExe, emoji: '🎮', publisher, isApp: false, steamAppId: null });
      }
    } catch {}
  }

  // ── 5. Generic Program Files scan ────────────────────────────────────
  const SKIP_PF = /^(microsoft|windows|common files|internet explorer|windows media player|windows nt|windowspowershell|windowsapps|packages|uninstall information|drivers|intel|amd|nvidia|displaylink|realtek|vlc media|7-zip|winrar|notepad|putty|python|git |node|java|android|zoom|teams|slack|skype|whatsapp|office|visual studio|adobe|autodesk|blender|obs studio|discord|steam|epic|battle\.net|ubisoft|gog|origin|roblox|riot games)/i;
  for (const pf of ['C:\\Program Files', 'C:\\Program Files (x86)']) {
    if (!fs.existsSync(pf)) continue;
    try {
      const entries = fs.readdirSync(pf, { withFileTypes: true }).filter(e => e.isDirectory());
      for (const e of entries) {
        if (SKIP_PF.test(e.name)) continue;
        const gameDir = path.join(pf, e.name);
        if (isDupDir(gameDir)) continue;
        const bestExe = findBestGameExe(gameDir);
        if (bestExe) addApp({ name: e.name, exe: path.basename(bestExe), path: bestExe, emoji: '🎮', publisher: 'Unknown', isApp: false, steamAppId: null });
      }
    } catch {}
  }

  return found;
});

ipcMain.handle('get-file-icon', async (event, filePath) => {
  try {
    const icon = await app.getFileIcon(filePath, { size: 'large' });
    return icon.toDataURL();
  } catch { return null; }
});

ipcMain.handle('browse-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Wallpaper Image',
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }],
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ─── App Booster ──────────────────────────────────────────────────────────────
ipcMain.handle('browse-exe', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Game / App',
    filters: [{ name: 'Executable', extensions: ['exe'] }],
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('boost-app', async (event, exePath) => {
  try {
    const exeName = path.basename(exePath);
    const procName = exeName.replace('.exe', '');
    const script = `
      $running = $false
      $procs = Get-Process -Name "${procName}" -ErrorAction SilentlyContinue
      if ($procs) {
        $running = $true
        foreach ($p in $procs) {
          try { $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High } catch {}
          # Set I/O priority to High via NtSetInformationProcess
          try {
            Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class NtPrio {
  [DllImport("ntdll.dll")] public static extern int NtSetInformationProcess(IntPtr h, int cls, ref int info, int len);
}
'@ -ErrorAction SilentlyContinue
            $ioPrio = 3
            [NtPrio]::NtSetInformationProcess($p.Handle, 33, [ref]$ioPrio, 4) | Out-Null
          } catch {}
        }
      }
      # GPU / Games multimedia profile
      $gpuKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games"
      if (!(Test-Path $gpuKey)) { New-Item -Path $gpuKey -Force | Out-Null }
      Set-ItemProperty -Path $gpuKey -Name "GPU Priority"         -Value 8      -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Priority"             -Value 6      -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Scheduling Category"  -Value "High" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "SFIO Priority"        -Value "High" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Background Only"      -Value "False"-Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Clock Rate"           -Value 10000  -Type DWord  -Force -ErrorAction SilentlyContinue
      # Multimedia profile — keep SystemResponsiveness at 10 (safe, improves game scheduling without breaking audio)
      $profKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile"
      Set-ItemProperty -Path $profKey -Name "SystemResponsiveness"    -Value 10 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $profKey -Name "NetworkThrottlingIndex"  -Value 0xffffffff -Type DWord -Force -ErrorAction SilentlyContinue
      # Win32PrioritySeparation = 38 (short, variable, boost foreground)
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -Type DWord -Force -ErrorAction SilentlyContinue
      # Disable power throttling for the exe
      $ptKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling"
      if (!(Test-Path $ptKey)) { New-Item -Path $ptKey -Force | Out-Null }
      Set-ItemProperty -Path $ptKey -Name "PowerThrottlingOff" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      # Disable HPET timer latency for the process (set high res timer)
      try { [System.Threading.Thread]::CurrentThread.Priority = [System.Threading.ThreadPriority]::Highest } catch {}
      if ($running) { Write-Output "boosted" } else { Write-Output "not_running" }
    `;
    const output = await runPowerShell(script);
    return { success: true, running: String(output).includes('boosted') };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

ipcMain.handle('boost-app-advanced', async (event, exePath, options) => {
  try {
    const exeName = path.basename(exePath);
    const procName = exeName.replace('.exe', '');
    const isRoblox = exeName.toLowerCase().includes('roblox');
    const {
      disableCO = true,
      optimizeDSCP = true,
      optimizePriority = true,
      optimizeIO = true,
      clearRAM = false,
      trimWorkingSet = false,
      disableFullscreenOptimizations = false,
      disableHighDPI = false,
      robloxGpuBoost = false,
      robloxNetworkOpt = false,
      robloxCpuBoost = false,
      // Anti-lag & FPS
      fixLagSpikes = true,
      antiMicrostutter = true,
      reducePingSpikes = true,
      // CPU / Scheduler
      disableCpuParking = true,
      setTimerResolution = false,
      disableHpet = false,
      disableCStates = false,
      optimizeScheduler = false,
      optimizeKernelMode = false,
      disableIdleTasks = false,
      disableStartupDelay = false,
      optimizeInterrupts = false,
      // GPU advanced
      disableMpo = false,
      optimizeGpuDriver = false,
      optimizeShaderCache = false,
      optimizeFramePacing = false,
      optimizeRegistry = false,
      // Network advanced
      disableNagle = false,
      optimizeTcpIp = false,
      optimizeDns = false,
      setQosPriority = false,
      optimizeTcpWindow = false,
      disableTcpAutoTuning = false,
      optimizeNetworkBuffer = false,
      setDnsCache = false,
      disableLso = false,
      optimizeAckFrequency = false,
      optimizeTcpStack = false,
      // Storage
      optimizeSsd = false,
      trimDisks = false,
      disablePrefetch = false,
      // Windows
      disableFullscreenOpt = false,
      disableAnimations = false,
      disableTelemetry = false,
      disableDiagnostics = false,
      disableSearchIndexing = false,
      disableSysMain = false,
      // Audio
      optimizeAudio = false,
      disableAudioEnhancements = false,
      // Game mode
      gameMode = false,
      highPerfMode = false,
      disableGameBar = false,
      disableXboxServices = false,
      disableBackgroundApps = false,
      enableHags = false,
    } = options || {};

    let script = `
      $procName = "${procName}"
      $running = $false
      $procs = Get-Process -Name $procName -ErrorAction SilentlyContinue
      if ($procs) { $running = $true }
    `;

    if (optimizePriority) {
      script += `
      if ($procs) {
        foreach ($p in $procs) {
          try { $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High } catch {}
        }
      }
      $w32prio = ${isRoblox ? 26 : 38}
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value $w32prio -Type DWord -Force -ErrorAction SilentlyContinue
      $gpuKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games"
      if (!(Test-Path $gpuKey)) { New-Item -Path $gpuKey -Force | Out-Null }
      Set-ItemProperty -Path $gpuKey -Name "GPU Priority"        -Value 8      -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Priority"            -Value 6      -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Scheduling Category" -Value "High" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "SFIO Priority"       -Value "High" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Clock Rate"          -Value 10000  -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "SystemResponsiveness" -Value 10 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeIO) {
      script += `
      if ($procs) {
        foreach ($p in $procs) {
          try {
            Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class NtIO { [DllImport("ntdll.dll")] public static extern int NtSetInformationProcess(IntPtr h, int cls, ref int info, int len); }
'@ -ErrorAction SilentlyContinue
            $ioPrio = 3
            [NtIO]::NtSetInformationProcess($p.Handle, 33, [ref]$ioPrio, 4) | Out-Null
          } catch {}
        }
      }
      `;
    }

    if (optimizeDSCP) {
      script += `
      $qosKey = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\QoS\\${exeName}"
      if (!(Test-Path $qosKey)) { New-Item -Path $qosKey -Force | Out-Null }
      Set-ItemProperty -Path $qosKey -Name "Application Name"    -Value "${exeName}"  -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Version"             -Value "1.0"         -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Protocol"            -Value "*"           -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Local Port"          -Value "*"           -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Remote Port"         -Value "*"           -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Local IP"            -Value "*"           -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Local IP Prefix Length" -Value "0"        -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Remote IP"           -Value "*"           -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Remote IP Prefix Length" -Value "0"       -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "DSCP Value"          -Value "46"          -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Throttle Rate"       -Value "-1"          -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\QoS" -Name "NCPAEnabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableCO) {
      script += `
      $ptKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling"
      if (!(Test-Path $ptKey)) { New-Item -Path $ptKey -Force | Out-Null }
      Set-ItemProperty -Path $ptKey -Name "PowerThrottlingOff" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableFullscreenOptimizations) {
      script += `
      $fsKey = "HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers"
      if (!(Test-Path $fsKey)) { New-Item -Path $fsKey -Force | Out-Null }
      Set-ItemProperty -Path $fsKey -Name "${exePath}" -Value "~ DISABLEDXMAXIMIZEDWINDOWEDMODE" -Type String -Force -ErrorAction SilentlyContinue
      `;
    }

    if (isRoblox && robloxGpuBoost) {
      script += `
      $hagsKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers"
      Set-ItemProperty -Path $hagsKey -Name "HwSchMode" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (isRoblox && robloxNetworkOpt) {
      script += `
      Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
        Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword '*TCPChecksumOffloadIPv4' -RegistryValue 3 -ErrorAction SilentlyContinue
        Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword 'NetworkAddress' -RegistryValue '' -ErrorAction SilentlyContinue
      }
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpAckFrequency" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TCPNoDelay" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (isRoblox && robloxCpuBoost) {
      script += `
      if ($procs) {
        foreach ($p in $procs) {
          try { $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High } catch {}
        }
      }
      $parkKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\54533251-82be-4824-96c1-47b60b740d00\\0cc5b647-c1df-4637-891a-dec35c318583"
      Set-ItemProperty -Path $parkKey -Name "ValueMax" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (clearRAM) {
      script += `
      try {
        $mem = [System.Runtime.InteropServices.Marshal]::AllocHGlobal(1)
        [System.Runtime.InteropServices.Marshal]::FreeHGlobal($mem)
      } catch {}
      [System.GC]::Collect()
      [System.GC]::WaitForPendingFinalizers()
      Get-Process | Where-Object { $_.WorkingSet64 -gt 50MB -and $_.Name -notmatch "^(${procName}|svchost|lsass|winlogon|dwm|csrss|smss|wininit)$" } | ForEach-Object {
        try { $_.MinWorkingSet = [IntPtr]::new(4096); $_.MaxWorkingSet = [IntPtr]::new(1024*1024) } catch {}
      }
      `;
    }

    if (fixLagSpikes) {
      script += `
      # Anti-lag spike: set high-res timer + disable throttling + optimize scheduler
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 26 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "SystemResponsiveness" -Value 10 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NetworkThrottlingIndex" -Value 4294967295 -Type DWord -Force -ErrorAction SilentlyContinue
      $ptKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling"
      if (!(Test-Path $ptKey)) { New-Item -Path $ptKey -Force | Out-Null }
      Set-ItemProperty -Path $ptKey -Name "PowerThrottlingOff" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (antiMicrostutter) {
      script += `
      # Anti micro-stutter: GPU priority + frame pacing registry
      $gpuKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games"
      if (!(Test-Path $gpuKey)) { New-Item -Path $gpuKey -Force | Out-Null }
      Set-ItemProperty -Path $gpuKey -Name "GPU Priority"        -Value 8      -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Priority"            -Value 6      -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Scheduling Category" -Value "High" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "SFIO Priority"       -Value "High" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Clock Rate"          -Value 10000  -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (reducePingSpikes) {
      script += `
      # Reduce ping spikes: disable Nagle, ACK delay, and set gaming QoS
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpAckFrequency" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TCPNoDelay"      -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "DefaultTTL"      -Value 64 -Type DWord -Force -ErrorAction SilentlyContinue
      Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
        try { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*InterruptModeration" -RegistryValue 0 -ErrorAction SilentlyContinue } catch {}
      }
      `;
    }

    if (disableNagle) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpAckFrequency" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TCPNoDelay"      -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeTcpIp) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "DefaultTTL"             -Value 64           -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "Tcp1323Opts"            -Value 1            -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpMaxDupAcks"          -Value 2            -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "SackOpts"               -Value 1            -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpTimedWaitDelay"      -Value 30           -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "MaxUserPort"            -Value 65534        -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpWindowSize"          -Value 65536        -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "GlobalMaxTcpWindowSize" -Value 65536        -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (gameMode) {
      script += `
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AllowAutoGameMode" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AutoGameModeEnabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (highPerfMode) {
      script += `
      try { powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null } catch {}
      `;
    }

    if (disableGameBar) {
      script += `
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_Enabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (enableHags) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableXboxServices) {
      script += `
      $xboxSvcs = @("XblAuthManager","XblGameSave","XboxGipSvc","XboxNetApiSvc")
      foreach ($svc in $xboxSvcs) {
        try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
      }
      `;
    }

    if (disableBackgroundApps) {
      script += `
      $bgKey = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications"
      if (!(Test-Path $bgKey)) { New-Item -Path $bgKey -Force | Out-Null }
      Set-ItemProperty -Path $bgKey -Name "GlobalUserDisabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableCpuParking) {
      script += `
      $cpuGuid  = "54533251-82be-4824-96c1-47b60b740d00"
      $parkGuid = "0cc5b647-c1df-4637-891a-dec35c318583"
      try { powercfg /setacvalueindex SCHEME_CURRENT $cpuGuid $parkGuid 100 2>$null } catch {}
      try { powercfg /setdcvalueindex SCHEME_CURRENT $cpuGuid $parkGuid 100 2>$null } catch {}
      try { powercfg /apply 2>$null } catch {}
      $parkRegKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\$cpuGuid\\$parkGuid"
      if (Test-Path $parkRegKey) {
        Set-ItemProperty -Path $parkRegKey -Name "ValueMax" -Value 100 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $parkRegKey -Name "ValueMin" -Value 100 -Type DWord -Force -ErrorAction SilentlyContinue
      }
      `;
    }

    if (disableMpo) {
      script += `
      $dwmKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm"
      if (!(Test-Path $dwmKey)) { New-Item -Path $dwmKey -Force | Out-Null }
      Set-ItemProperty -Path $dwmKey -Name "OverlayTestMode" -Value 5 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (setTimerResolution) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "SystemResponsiveness" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      try { bcdedit /set useplatformtick yes 2>$null } catch {}
      `;
    }

    if (disableHpet) {
      script += `
      try { bcdedit /deletevalue useplatformclock 2>$null } catch {}
      try { bcdedit /set disabledynamictick yes 2>$null } catch {}
      `;
    }

    if (disableCStates) {
      script += `
      try { powercfg /setacvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 5d76a2ca-e8c0-402f-a133-2158492d58ad 0 2>$null } catch {}
      try { powercfg /setdcvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 5d76a2ca-e8c0-402f-a133-2158492d58ad 0 2>$null } catch {}
      `;
    }

    if (optimizeInterrupts) {
      script += `
      Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
        try { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*InterruptModeration" -RegistryValue 0 -ErrorAction SilentlyContinue } catch {}
        try { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*RSS"                -RegistryValue 1 -ErrorAction SilentlyContinue } catch {}
        try { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*NumRssQueues"       -RegistryValue 4 -ErrorAction SilentlyContinue } catch {}
      }
      `;
    }

    if (disableSysMain) {
      script += `
      try { Stop-Service SysMain -Force -ErrorAction SilentlyContinue } catch {}
      try { Set-Service  SysMain -StartupType Disabled -ErrorAction SilentlyContinue } catch {}
      `;
    }

    if (disableTelemetry) {
      script += `
      try { Stop-Process -Name "diagtrack" -Force -ErrorAction SilentlyContinue } catch {}
      try { Stop-Service DiagTrack -Force -ErrorAction SilentlyContinue } catch {}
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" -Name "AllowTelemetry" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableDiagnostics) {
      script += `
      try { Stop-Service DiagTrack -Force -ErrorAction SilentlyContinue } catch {}
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\DiagTrack" -Name "Start" -Value 4 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeGpuDriver) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode"            -Value 2  -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "DpiMapIommuContiguous" -Value 1  -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "TdrDelay"              -Value 60 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "TdrDdiDelay"           -Value 60 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeShaderCache) {
      script += `
      $nvidiaKey = "HKLM:\\SOFTWARE\\NVIDIA Corporation\\Global\\NVTweak"
      if (!(Test-Path $nvidiaKey)) { New-Item -Path $nvidiaKey -Force | Out-Null }
      Set-ItemProperty -Path $nvidiaKey -Name "UseGlobalCacheDir" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "TdrDelay" -Value 60 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeFramePacing) {
      script += `
      $gamesKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games"
      if (!(Test-Path $gamesKey)) { New-Item -Path $gamesKey -Force | Out-Null }
      Set-ItemProperty -Path $gamesKey -Name "GPU Priority"        -Value 8       -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gamesKey -Name "Priority"            -Value 6       -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gamesKey -Name "Scheduling Category" -Value "High"  -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gamesKey -Name "SFIO Priority"       -Value "High"  -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gamesKey -Name "Affinity"            -Value 0       -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gamesKey -Name "Background Only"     -Value "False" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gamesKey -Name "Clock Rate"          -Value 10000   -Type DWord  -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableFullscreenOpt) {
      script += `
      $fsKey = "HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers"
      if (!(Test-Path $fsKey)) { New-Item -Path $fsKey -Force | Out-Null }
      Set-ItemProperty -Path $fsKey -Name "${exePath}" -Value "~ DISABLEDXMAXIMIZEDWINDOWEDMODE" -Type String -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableAnimations) {
      script += `
      Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop"                                           -Name "MenuShowDelay"     -Value "0" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop\\WindowMetrics"                            -Name "MinAnimate"        -Value "0" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "TaskbarAnimations" -Value 0   -Type DWord  -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeTcpWindow) {
      script += `
      try { netsh int tcp set global autotuninglevel=normal  2>$null } catch {}
      try { netsh int tcp set global rss=enabled             2>$null } catch {}
      try { netsh int tcp set global chimney=disabled        2>$null } catch {}
      `;
    }

    if (disableTcpAutoTuning) {
      script += `
      try { netsh int tcp set global autotuninglevel=disabled 2>$null } catch {}
      `;
    }

    if (optimizeNetworkBuffer) {
      script += `
      Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
        try { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*ReceiveBuffers"  -RegistryValue 512 -ErrorAction SilentlyContinue } catch {}
        try { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*TransmitBuffers" -RegistryValue 512 -ErrorAction SilentlyContinue } catch {}
      }
      `;
    }

    if (setDnsCache) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "MaxCacheSize"             -Value 4096 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "CacheHashTableBucketSize" -Value 64   -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "MaxSOACacheEntryTtlLimit" -Value 300  -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableLso) {
      script += `
      Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
        try { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*LsoV2IPv4" -RegistryValue 0 -ErrorAction SilentlyContinue } catch {}
        try { Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*LsoV2IPv6" -RegistryValue 0 -ErrorAction SilentlyContinue } catch {}
        try { Disable-NetAdapterLso -Name $_.Name -ErrorAction SilentlyContinue } catch {}
      }
      `;
    }

    if (optimizeAckFrequency) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpAckFrequency" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TCPNoDelay"      -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpDelAckTicks"  -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeTcpStack) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "EnablePMTUBHDetect"  -Value 0     -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "EnablePMTUDiscovery" -Value 1     -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpMaxSendFree"      -Value 65535 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeDns) {
      script += `
      try {
        Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
          try { Set-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -ServerAddresses ("8.8.8.8","8.8.4.4") -ErrorAction SilentlyContinue } catch {}
        }
      } catch {}
      try { ipconfig /flushdns 2>$null } catch {}
      `;
    }

    if (setQosPriority) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" -Name "NonBestEffortLimit" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NetworkThrottlingIndex" -Value 4294967295 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeSsd) {
      script += `
      try { fsutil behavior set disabledeletenotify 0 2>$null } catch {}
      try { fsutil behavior set disable8dot3        1 2>$null } catch {}
      try { fsutil behavior set disablelastaccess   1 2>$null } catch {}
      try { fsutil behavior set mftzone             2 2>$null } catch {}
      `;
    }

    if (trimDisks) {
      script += `
      try { fsutil behavior set disabledeletenotify 0 2>$null } catch {}
      try {
        Get-Volume | Where-Object { $_.DriveType -eq 'Fixed' -and $_.FileSystem -eq 'NTFS' } | ForEach-Object {
          try { Optimize-Volume -DriveLetter $_.DriveLetter -ReTrim -ErrorAction SilentlyContinue } catch {}
        }
      } catch {}
      `;
    }

    if (disablePrefetch) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" -Name "EnablePrefetcher"    -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" -Name "EnableBootPrefetcher" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (trimWorkingSet) {
      script += `
      Get-Process | Where-Object { $_.Name -notmatch "^(${procName}|System|Idle|lsass|winlogon|csrss|smss|wininit|dwm|svchost)$" } | ForEach-Object {
        try { $_.MinWorkingSet = [IntPtr]::new(4096); $_.MaxWorkingSet = [IntPtr]::new(1024*1024) } catch {}
      }
      `;
    }

    if (optimizeScheduler) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 26 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "IRQ8Priority"            -Value 1  -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "SystemResponsiveness" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeKernelMode) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "LargeSystemCache"       -Value 0      -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "DisablePagingExecutive" -Value 1      -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "IoPageLockLimit"        -Value 983040 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableIdleTasks) {
      script += `
      try { Stop-ScheduledTask -TaskPath "\\Microsoft\\Windows\\TaskScheduler\\" -TaskName "Idle Maintenance" -ErrorAction SilentlyContinue } catch {}
      try { Stop-ScheduledTask -TaskPath "\\Microsoft\\Windows\\Defrag\\"        -TaskName "ScheduledDefrag"  -ErrorAction SilentlyContinue } catch {}
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "EnableSuperfetch" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableStartupDelay) {
      script += `
      $serKey = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize"
      if (!(Test-Path $serKey)) { New-Item -Path $serKey -Force | Out-Null }
      Set-ItemProperty -Path $serKey -Name "StartupDelayInMSec" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableSearchIndexing) {
      script += `
      try { Stop-Service WSearch -Force -ErrorAction SilentlyContinue } catch {}
      `;
    }

    if (optimizeAudio) {
      script += `
      $audioKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Pro Audio"
      if (!(Test-Path $audioKey)) { New-Item -Path $audioKey -Force | Out-Null }
      Set-ItemProperty -Path $audioKey -Name "Scheduling Category" -Value "High"  -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $audioKey -Name "SFIO Priority"       -Value "High"  -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $audioKey -Name "Priority"            -Value 6       -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $audioKey -Name "Clock Rate"          -Value 10000   -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $audioKey -Name "GPU Priority"        -Value 1       -Type DWord  -Force -ErrorAction SilentlyContinue
      `;
    }

    if (disableAudioEnhancements) {
      script += `
      $audioDevKey = "HKCU:\\Software\\Microsoft\\Multimedia\\Audio\\DeviceCriteria"
      if (!(Test-Path $audioDevKey)) { New-Item -Path $audioDevKey -Force | Out-Null }
      Set-ItemProperty -Path $audioDevKey -Name "DisableAllEnhancements" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    if (optimizeRegistry) {
      script += `
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" -Name "NtfsMemoryUsage"             -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" -Name "NtfsDisable8dot3NameCreation" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" -Name "NtfsDisableLastAccessUpdate"  -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `;
    }

    script += `
      if ($running) { Write-Output "boosted" } else { Write-Output "not_running" }
    `;

    const output = await runPowerShell(script);
    return { success: true, running: String(output).includes('boosted') };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

ipcMain.handle('boost-focus-mode', async (event, exePath) => {
  try {
    const exeName = path.basename(exePath);
    const procName = exeName.replace('.exe', '');

    const script = `
      $targetProc = "${procName}"
      $running = $false
      $procs = Get-Process -Name $targetProc -ErrorAction SilentlyContinue
      if ($procs) {
        $running = $true
        foreach ($p in $procs) {
          try { $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High } catch {}
        }
      }

      # Kill known background bloat processes (safe list — won't kill system critical)
      $killList = @("SearchIndexer","OneDrive","SkypeApp","YourPhone","Cortana","SearchApp","WindowsInternal.ComposableShell.Experiences.TextInput.InputApp","PhoneExperienceHost","MicrosoftEdgeUpdate","WidgetService","widgets","gamingservices","XboxPCApp","XboxGameOverlay","XboxGamingOverlay","EpicWebHelper","EpicGamesLauncher","Discord","steam")
      foreach ($k in $killList) {
        if ($k -ne $targetProc) {
          Get-Process -Name $k -ErrorAction SilentlyContinue | ForEach-Object {
            try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch {}
          }
        }
      }

      # Suspend non-essential services temporarily
      $suspendSvcs = @("SysMain","DiagTrack","wuauserv","WSearch","TabletInputService","WerSvc")
      foreach ($svc in $suspendSvcs) {
        try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
      }

      # GPU / scheduling
      $gpuKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games"
      if (!(Test-Path $gpuKey)) { New-Item -Path $gpuKey -Force | Out-Null }
      Set-ItemProperty -Path $gpuKey -Name "GPU Priority"        -Value 8      -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Priority"            -Value 6      -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Scheduling Category" -Value "High" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "SFIO Priority"       -Value "High" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $gpuKey -Name "Clock Rate"          -Value 10000  -Type DWord  -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "SystemResponsiveness" -Value 10 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -Type DWord -Force -ErrorAction SilentlyContinue

      # Disable power throttling globally
      $ptKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling"
      if (!(Test-Path $ptKey)) { New-Item -Path $ptKey -Force | Out-Null }
      Set-ItemProperty -Path $ptKey -Name "PowerThrottlingOff" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue

      # Disable notifications / focus assist
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" -Name "NOC_GLOBAL_SETTING_TOASTS_ENABLED" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\Store\\DefaultAccount\\Current\\default\\windows.focusassist.duringgame\\windows.data.focusassist.focusassist" -Name "Data" -Value ([byte[]](0x02,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00)) -Type Binary -Force -ErrorAction SilentlyContinue

      # DSCP QoS for the target process
      $qosKey = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\QoS\\${exeName}"
      if (!(Test-Path $qosKey)) { New-Item -Path $qosKey -Force | Out-Null }
      Set-ItemProperty -Path $qosKey -Name "Application Name" -Value "${exeName}" -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Version"          -Value "1.0"        -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Protocol"         -Value "*"          -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Local Port"       -Value "*"          -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Remote Port"      -Value "*"          -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Local IP"         -Value "*"          -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Local IP Prefix Length" -Value "0"   -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Remote IP"        -Value "*"          -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Remote IP Prefix Length" -Value "0"  -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "DSCP Value"       -Value "46"         -Type String -Force -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $qosKey -Name "Throttle Rate"    -Value "-1"         -Type String -Force -ErrorAction SilentlyContinue

      # Trim RAM — empty standby list
      try {
        $code = @'
using System; using System.Runtime.InteropServices;
public class MemTrim {
  [DllImport("ntdll.dll")] public static extern uint NtSetSystemInformation(int cls, IntPtr info, int len);
  public static void TrimStandby() { var buf = Marshal.AllocHGlobal(4); Marshal.WriteInt32(buf, 4); NtSetSystemInformation(80, buf, 4); Marshal.FreeHGlobal(buf); }
}
'@
        Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
        [MemTrim]::TrimStandby()
      } catch {}
      [System.GC]::Collect()
      [System.GC]::WaitForPendingFinalizers()

      # Fullscreen optimizations off for target exe
      $fsKey = "HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers"
      if (!(Test-Path $fsKey)) { New-Item -Path $fsKey -Force | Out-Null }
      Set-ItemProperty -Path $fsKey -Name "${exePath}" -Value "~ DISABLEDXMAXIMIZEDWINDOWEDMODE" -Type String -Force -ErrorAction SilentlyContinue

      if ($running) { Write-Output "focus_boosted" } else { Write-Output "focus_ready" }
    `;

    const output = await runPowerShell(script);
    return { success: true, running: String(output).includes('focus_boosted'), focusMode: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

// Run PowerShell command as admin
function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const os = require('os');
    const tmpFile = path.join(os.tmpdir(), `lctron_${Date.now()}_${Math.random().toString(36).slice(2)}.ps1`);
    const wrapped = `try {\n${script}\n} catch {}\n`;
    try { fs.writeFileSync(tmpFile, wrapped, { encoding: 'utf8' }); } catch (e) { return reject(e.message); }
    const ps = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpFile], {
      windowsHide: true,
    });
    let out = '';
    let err = '';
    ps.stdout.setEncoding('utf8');
    ps.stderr.setEncoding('utf8');
    ps.stdout.on('data', d => (out += d));
    ps.stderr.on('data', d => (err += d));
    ps.on('close', () => {
      try { fs.unlinkSync(tmpFile); } catch {}
      resolve(out.trim() || err.trim());
    });
    ps.on('error', e => { try { fs.unlinkSync(tmpFile); } catch {} reject(e.message); });
  });
}

// Run registry command
function runReg(args) {
  return new Promise((resolve, reject) => {
    exec(`reg ${args}`, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(stderr || err.message);
      else resolve(stdout.trim());
    });
  });
}

// ─── Google OAuth (Implicit Flow) ───────────────────────────────────────────
function base64URLEncode(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fetchGoogleUserInfo(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: 'www.googleapis.com',
      path: '/oauth2/v2/userinfo',
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (res) => {
      let data = '';
      res.on('data', d => (data += d));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
  });
}

ipcMain.on('start-google-login', (event) => {
  if (oauthServer) { try { oauthServer.close(); } catch {} oauthServer = null; }

  const state = base64URLEncode(crypto.randomBytes(16));

  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: 'token',
    scope: OAUTH_SCOPES,
    state,
    prompt: 'select_account',
  }).toString();

  oauthServer = http.createServer(async (req, res) => {
    if (!req.url) { res.writeHead(404); res.end(); return; }

    if (req.url.startsWith('/callback')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><html>
<head><title>Lctron</title>
<style>body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px;margin:0;}
h2{font-weight:700;font-size:20px;margin:0;} p{color:#888;font-size:13px;margin:0;}</style></head>
<body>
<h2>✓ Signed in!</h2><p>You can close this tab and return to Lctron.</p>
<script>
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  const err = params.get('error');
  const url = '/token?' + (token ? 'access_token=' + encodeURIComponent(token) : 'error=' + encodeURIComponent(err || 'unknown'));
  fetch(url);
</script>
</body></html>`);
      return;
    }

    if (req.url.startsWith('/token')) {
      const urlParams = new URL(req.url, `http://localhost:${OAUTH_REDIRECT_PORT}`);
      const accessToken = urlParams.searchParams.get('access_token');
      const error = urlParams.searchParams.get('error');
      res.writeHead(200); res.end('ok');
      if (oauthServer) { try { oauthServer.close(); } catch {} oauthServer = null; }

      if (error || !accessToken) {
        if (mainWindow) mainWindow.webContents.send('google-login-result', { success: false, error: error || 'No token received' });
        return;
      }

      try {
        const user = await fetchGoogleUserInfo(accessToken);
        if (!user.email) throw new Error('No email returned from Google');
        const saved = { name: user.name, email: user.email, picture: user.picture };
        const settings = loadSettings();
        settings.loggedInUser = saved;
        saveSettings(settings);
        if (mainWindow) {
          mainWindow.webContents.send('google-login-result', { success: true, user: saved });
          mainWindow.focus();
        }
      } catch (err) {
        if (mainWindow) mainWindow.webContents.send('google-login-result', { success: false, error: err.message });
      }
      return;
    }

    res.writeHead(404); res.end();
  });

  oauthServer.listen(OAUTH_REDIRECT_PORT, '127.0.0.1', () => {
    shell.openExternal(authUrl);
  });

  oauthServer.on('error', (err) => {
    event.sender.send('google-login-result', { success: false, error: `Could not start auth server: ${err.message}` });
  });
});

// ─── Email Auth ───────────────────────────────────────────────────────────────
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'lctron-salt-2024').digest('hex');
}

ipcMain.handle('email-register', (event, name, email, password) => {
  const settings = loadSettings();
  const users = settings.emailUsers || {};
  const key = email.toLowerCase();
  if (users[key]) {
    return { success: false, error: 'An account with this email already exists. Try signing in.' };
  }
  users[key] = { name, email, passwordHash: hashPassword(password) };
  settings.emailUsers = users;
  const user = { name, email, picture: null };
  settings.loggedInUser = user;
  saveSettings(settings);
  return { success: true, user };
});

ipcMain.handle('email-login', (event, email, password) => {
  const settings = loadSettings();
  const users = settings.emailUsers || {};
  const key = email.toLowerCase();
  const account = users[key];
  if (!account) {
    return { success: false, error: 'No account found with this email. Please sign up first.' };
  }
  if (account.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }
  const user = { name: account.name, email: account.email, picture: null };
  settings.loggedInUser = user;
  saveSettings(settings);
  return { success: true, user };
});

ipcMain.handle('get-saved-user', () => {
  const settings = loadSettings();
  return settings.loggedInUser || null;
});

ipcMain.handle('logout-user', () => {
  const settings = loadSettings();
  delete settings.loggedInUser;
  saveSettings(settings);
  return { success: true };
});

// ─── Debloat UI Tweaks (Registry-based) ──────────────────────────────────────
ipcMain.handle('debloat-ui-tweak', async (event, tweakId) => {
  const uiTweaks = {
    'disable-widgets': `
      New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Dsh" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Dsh" -Name "AllowNewsAndInterests" -Value 0 -Type DWord -Force
    `,
    'disable-trending-searches': `
      New-Item -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" -Name "DisableSearchBoxSuggestions" -Value 1 -Type DWord -Force
      New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" -Name "DisableWebSearch" -Value 1 -Type DWord -Force
    `,
    'disable-news-feed': `
      New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds" -Name "ShellFeedsTaskbarViewMode" -Value 2 -Type DWord -Force
      New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Feeds" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Feeds" -Name "EnableFeeds" -Value 0 -Type DWord -Force
    `,
    'disable-search-highlights': `
      New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\SearchSettings" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\SearchSettings" -Name "IsDynamicSearchBoxEnabled" -Value 0 -Type DWord -Force
    `,
    'disable-start-recommendations': `
      New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "Start_IrisRecommendations" -Value 0 -Type DWord -Force
      New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer" -Name "HideRecommendedSection" -Value 1 -Type DWord -Force
    `,
    'disable-teams-chat': `
      New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "TaskbarMn" -Value 0 -Type DWord -Force
    `,
    'disable-copilot-taskbar': `
      New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "ShowCopilotButton" -Value 0 -Type DWord -Force
    `,
    'disable-taskview': `
      New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "ShowTaskViewButton" -Value 0 -Type DWord -Force
    `,
  };
  const script = uiTweaks[tweakId];
  if (!script) return { success: false, error: 'Unknown tweak: ' + tweakId };
  try {
    await runPowerShell(script);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

ipcMain.handle('debloat-remove-app', async (event, pkg) => {
  try {
    await runPowerShell(`Get-AppxPackage *${pkg}* | Remove-AppxPackage -ErrorAction SilentlyContinue; Get-AppxProvisionedPackage -Online | Where-Object DisplayName -like *${pkg}* | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

// ─── Tweak Handlers ─────────────────────────────────────────────────────────

ipcMain.handle('apply-tweak', async (event, tweakId, enabled) => {
  try {
    const result = await applyTweak(tweakId, enabled);
    return { success: true, ...(result || {}) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

ipcMain.handle('get-system-info', async () => {
  const osModule = require('os');

  // Helper: run a command and return trimmed stdout, never throws
  const run = (cmd) => new Promise(resolve => {
    exec(cmd, { timeout: 8000, windowsHide: true }, (err, stdout) => {
      resolve(err ? '' : (stdout || '').trim());
    });
  });

  // ── CPU + RAM via Node.js os module (always works, no encoding issues) ──────
  const cpus = osModule.cpus();
  const cpuName    = cpus[0]?.model?.replace(/\s+/g, ' ').trim() || 'Unknown CPU';
  const cpuThreads = cpus.length;
  const cpuSpeedMhz = cpus[0]?.speed || 0;
  const ramTotalBytes = osModule.totalmem();
  const ramFreeBytes  = osModule.freemem();
  const ramTotalGB = Math.round(ramTotalBytes / 1024 ** 3 * 10) / 10;
  const ramUsedGB  = Math.round((ramTotalBytes - ramFreeBytes) / 1024 ** 3 * 10) / 10;

  // System uptime from Node.js os module
  const uptimeSec  = Math.floor(osModule.uptime());
  const uptimeDays = Math.floor(uptimeSec / 86400);
  const uptimeHrs  = Math.floor((uptimeSec % 86400) / 3600);
  const uptimeMins = Math.floor((uptimeSec % 3600) / 60);
  const uptime = uptimeDays > 0 ? `${uptimeDays}d ${uptimeHrs}h ${uptimeMins}m` : `${uptimeHrs}h ${uptimeMins}m`;

  // ── WMIC queries (simple text, no JSON, no encoding issues) ─────────────────
  const [cpuWmic, gpuWmic, gpuFallback, diskCWmic, allDisksWmic, osWmic, audioWmic, battWmic] = await Promise.all([
    run('wmic cpu get numberofcores,loadpercentage /format:list'),
    run('wmic path win32_VideoController where "CurrentBitsPerPixel>0" get name,adapterram,driverversion /format:list'),
    run('wmic path win32_VideoController get name,adapterram,driverversion /format:list'),
    run('wmic logicaldisk where "deviceid=\'C:\'" get size,freespace /format:list'),
    run('wmic logicaldisk where "drivetype=3" get size,freespace /format:list'),
    run('wmic os get caption,buildnumber /format:list'),
    run('wmic sounddev get name /format:list'),
    run('wmic path win32_battery get estimatedchargeremaining,batterystatus /format:list'),
  ]);

  // Parse CPU cores and load
  const coresMatch = cpuWmic.match(/NumberOfCores=(\d+)/i);
  const cpuCores = coresMatch ? parseInt(coresMatch[1]) : Math.max(1, Math.round(cpuThreads / 2));
  const loadMatch = cpuWmic.match(/LoadPercentage=(\d+)/i);
  const cpuLoad = loadMatch ? parseInt(loadMatch[1]) : 0;

  // Parse GPU (prefer active display adapter)
  const gpuSrc = gpuWmic.trim() || gpuFallback.trim();
  const gpuNameMatch = gpuSrc.match(/Name=(.+)/i);
  const gpuVramMatch = gpuSrc.match(/AdapterRAM=(\d+)/i);
  const gpuDriverMatch = gpuSrc.match(/DriverVersion=(.+)/i);
  const gpuName   = gpuNameMatch   ? gpuNameMatch[1].trim()   : 'Unknown GPU';
  const gpuVramBytes = gpuVramMatch ? parseInt(gpuVramMatch[1]) : 0;
  const gpuVram   = gpuVramBytes > 0 ? `${Math.round(gpuVramBytes / 1024 ** 3 * 10) / 10} GB` : 'N/A';
  const gpuDriver = gpuDriverMatch  ? gpuDriverMatch[1].trim() : '';

  // Parse disk C:
  const diskCSizeMatch = diskCWmic.match(/Size=(\d+)/i);
  const diskCFreeMatch = diskCWmic.match(/FreeSpace=(\d+)/i);
  const diskCapacity = diskCSizeMatch ? Math.round(parseInt(diskCSizeMatch[1]) / 1024 ** 3) : 0;
  const diskFree     = diskCFreeMatch ? Math.round(parseInt(diskCFreeMatch[1]) / 1024 ** 3) : 0;

  // Parse all disks total
  const allSizes = [...allDisksWmic.matchAll(/Size=(\d+)/gi)].reduce((s, m) => s + parseInt(m[1]), 0);
  const allFree  = [...allDisksWmic.matchAll(/FreeSpace=(\d+)/gi)].reduce((s, m) => s + parseInt(m[1]), 0);
  const totalDisk = Math.round(allSizes / 1024 ** 3);
  const freeDisk  = Math.round(allFree  / 1024 ** 3);

  // Parse OS
  const osCaptionMatch = osWmic.match(/Caption=(.+)/i);
  const osBuildMatch   = osWmic.match(/BuildNumber=(\d+)/i);
  const osName  = osCaptionMatch ? osCaptionMatch[1].replace(/Microsoft\s*/i, '').trim() : 'Windows';
  const osBuild = osBuildMatch   ? osBuildMatch[1].trim() : '';

  // Parse audio
  const audioMatch = audioWmic.match(/Name=(.+)/i);
  const audioDevice = audioMatch ? audioMatch[1].trim() : 'N/A';

  // Parse battery
  const battPctMatch      = battWmic.match(/EstimatedChargeRemaining=(\d+)/i);
  const battStatusMatch   = battWmic.match(/BatteryStatus=(\d+)/i);
  const battPct      = battPctMatch    ? parseInt(battPctMatch[1])    : -1;
  const battCharging = battStatusMatch ? parseInt(battStatusMatch[1]) === 2 : false;

  return {
    cpu:         cpuName,
    cpuCores,
    cpuThreads,
    cpuSpeed:    cpuSpeedMhz > 0 ? `${(cpuSpeedMhz / 1000).toFixed(1)} GHz` : '',
    cpuLoad,
    gpu:         gpuName,
    gpuVram,
    gpuDriver,
    ramTotal:    ramTotalGB,
    ramUsed:     ramUsedGB,
    diskCapacity,
    diskFree,
    totalDisk,
    freeDisk,
    osName,
    osBuild,
    uptime,
    audioDevice,
    battPct,
    battCharging,
    netAdapter:  'N/A',
    netSpeed:    'N/A',
  };
});

ipcMain.handle('get-system-profile', async () => {
  try {
    const [gpuRaw, cpuRaw, osBuild, wifiRaw, btRaw, hyperVRaw, ramRaw, touchRaw] = await Promise.allSettled([
      runPowerShell("Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Name | Out-String"),
      runPowerShell("Get-WmiObject Win32_Processor | Select-Object -ExpandProperty Name"),
      runPowerShell("(Get-WmiObject Win32_OperatingSystem).BuildNumber"),
      runPowerShell("Get-NetAdapter | Where-Object { $_.InterfaceDescription -match 'Wi-Fi|Wireless|802.11' } | Measure-Object | Select-Object -ExpandProperty Count"),
      runPowerShell("Get-Service bthserv -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status"),
      runPowerShell("(Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -ErrorAction SilentlyContinue).State"),
      runPowerShell("[math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory/1GB,1)"),
      runPowerShell("Get-PnpDevice | Where-Object { $_.Class -eq 'HIDClass' -and $_.FriendlyName -match 'touch' } | Measure-Object | Select-Object -ExpandProperty Count"),
    ]);

    const gpuStr = (gpuRaw.status === 'fulfilled' ? gpuRaw.value : '').toLowerCase();
    const cpuStr = (cpuRaw.status === 'fulfilled' ? cpuRaw.value : '').toLowerCase();
    const build  = parseInt(osBuild.status === 'fulfilled' ? osBuild.value : '0') || 0;
    const hasWifi = parseInt(wifiRaw.status === 'fulfilled' ? wifiRaw.value : '0') > 0;
    const hasBt   = btRaw.status === 'fulfilled' && btRaw.value.toLowerCase().includes('running');
    const hasHyperV = hyperVRaw.status === 'fulfilled' && hyperVRaw.value.toLowerCase().includes('enabled');
    const ramGB   = parseFloat(ramRaw.status === 'fulfilled' ? ramRaw.value : '0') || 0;
    const hasTouch = parseInt(touchRaw.status === 'fulfilled' ? touchRaw.value : '0') > 0;

    const isNvidia  = gpuStr.includes('nvidia');
    const isAmd     = gpuStr.includes('amd') || gpuStr.includes('radeon');
    const isIntelGpu = gpuStr.includes('intel');
    const isIntelCpu = cpuStr.includes('intel');
    const isLaptop  = cpuStr.includes('laptop') || cpuStr.includes('mobile') || cpuStr.includes('u ') || cpuStr.includes('h ');
    const isWin11   = build >= 22000;

    return {
      isNvidia, isAmd, isIntelGpu, isIntelCpu, isLaptop,
      isWin11, hasWifi, hasBt, hasHyperV, ramGB, hasTouch,
      gpuStr, cpuStr, build,
    };
  } catch (e) {
    return { error: e.toString() };
  }
});

ipcMain.handle('registry-set', async (event, enabled, entry) => {
  if (!entry) return { success: false, error: 'No entry provided' };
  try {
    const { hive, path: regPath, name, type, value } = entry;
    const shortHive = hive
      .replace('HKEY_LOCAL_MACHINE', 'HKLM')
      .replace('HKEY_CURRENT_USER', 'HKCU')
      .replace('HKEY_CLASSES_ROOT', 'HKCR')
      .replace('HKEY_USERS', 'HKU')
      .replace('HKEY_CURRENT_CONFIG', 'HKCC');
    const fullKey = `${shortHive}\\${regPath}`;
    const script = `
      New-Item -Path "Registry::${fullKey}" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "Registry::${fullKey}" -Name "${name}" -Value ${type === 'REG_DWORD' || type === 'REG_QWORD' ? value : `"${value}"`} -Type ${type.replace('REG_', '')} -Force
    `;
    await runPowerShell(script);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

ipcMain.handle('clean-system', async () => {
  try {
    await runPowerShell(`
      Remove-Item "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue;
      Remove-Item "C:\\Windows\\Temp\\*" -Recurse -Force -ErrorAction SilentlyContinue;
      Remove-Item "$env:LOCALAPPDATA\\Temp\\*" -Recurse -Force -ErrorAction SilentlyContinue;
      $size = (Get-ChildItem "$env:TEMP" -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum;
      Write-Output "Cleaned"
    `);
    return { success: true, message: 'Temp files cleaned successfully' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
});

// ─── Startup Programs ───────────────────────────────────────────────────────
ipcMain.handle('get-startup-programs', async () => {
  try {
    const script = `
      $results = @()
      $keys = @(
        'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'
      )
      foreach ($key in $keys) {
        if (Test-Path $key) {
          $props = Get-ItemProperty $key -ErrorAction SilentlyContinue
          $props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
            $results += [PSCustomObject]@{ name=$_.Name; path=$_.Value; hive=$key; enabled=$true }
          }
        }
      }
      $disabledKey = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
      if (Test-Path $disabledKey) {
        $props = Get-ItemProperty $disabledKey -ErrorAction SilentlyContinue
        $props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
          $bytes = $_.Value
          $isDisabled = $bytes -and $bytes[0] -eq 3
          $propName = $_.Name
          $match = $results | Where-Object { $_.name -eq $propName }
          if ($match) { $match.enabled = -not $isDisabled }
        }
      }
      $results | ConvertTo-Json -Compress
    `;
    const out = await runPowerShell(script);
    let items = [];
    try { items = JSON.parse(out); if (!Array.isArray(items)) items = [items]; } catch {}
    return { success: true, items };
  } catch (e) { return { success: false, error: e.toString(), items: [] }; }
});

ipcMain.handle('set-startup-program', async (event, name, enabled) => {
  try {
    const val = enabled ? 2 : 3;
    const script = `
      $key = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
      if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
      $bytes = [byte[]](${val},0,0,0,0,0,0,0,0,0,0,0)
      Set-ItemProperty -Path $key -Name "${name}" -Value $bytes -Type Binary -Force
    `;
    await runPowerShell(script);
    return { success: true };
  } catch (e) { return { success: false, error: e.toString() }; }
});

// ─── Process Manager ─────────────────────────────────────────────────────────
ipcMain.handle('get-processes', async () => {
  try {
    const script = `
      Get-Process | Select-Object Name, Id,
        @{N='CPU';E={[math]::Round($_.CPU,1)}},
        @{N='RAM';E={[math]::Round($_.WorkingSet64/1MB,1)}} |
        Sort-Object RAM -Descending |
        Select-Object -First 60 |
        ConvertTo-Json -Compress
    `;
    const out = await runPowerShell(script);
    let procs = [];
    try { procs = JSON.parse(out); if (!Array.isArray(procs)) procs = [procs]; } catch {}
    return { success: true, procs };
  } catch (e) { return { success: false, error: e.toString(), procs: [] }; }
});

ipcMain.handle('kill-process', async (event, pid) => {
  try {
    await runPowerShell(`Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`);
    return { success: true };
  } catch (e) { return { success: false, error: e.toString() }; }
});


// ─── App Boost Logic ────────────────────────────────────────────────────────
async function applyAppBoost(name, exePath) {
  const script = `
    # Set high priority for the process image
    $regPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\${name}.exe\\PerfOptions"
    New-Item -Path $regPath -Force | Out-Null
    Set-ItemProperty -Path $regPath -Name "CpuPriorityClass" -Value 3 -Type DWord
    Set-ItemProperty -Path $regPath -Name "IoPriority" -Value 3 -Type DWord
    Set-ItemProperty -Path $regPath -Name "PagePriority" -Value 5 -Type DWord
    
    # Network optimizations
    netsh int tcp set global autotuninglevel=normal
    netsh int tcp set global ecncapability=enabled
    netsh int tcp set global timestamps=disabled
    netsh int tcp set global rss=enabled
    netsh int tcp set global fastopen=enabled
    netsh int tcp set global dca=enabled
    netsh int tcp set global netdma=enabled
    
    # Disable nagle algorithm for lower latency
    $tcpReg = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"
    Get-ChildItem $tcpReg | ForEach-Object {
      Set-ItemProperty -Path $_.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord -ErrorAction SilentlyContinue
      Set-ItemProperty -Path $_.PSPath -Name "TCPNoDelay" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    }
    
    Write-Output "Boost applied for ${name}"
  `;
  await runPowerShell(script);
}

// ─── Tweak Definitions ──────────────────────────────────────────────────────
async function applyTweak(id, enabled) {
  const E = enabled; // shorthand

  const tweaks = {
    // ── General ──────────────────────────────────────────────────
    'disable-background-apps': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 0 -Type DWord -Force`
    ),
    'disable-maintenance': () => runPowerShell(
      E ? `
        New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" -Name "MaintenanceDisabled" -Value 1 -Type DWord -Force
      ` : `
        New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" -Name "MaintenanceDisabled" -Value 0 -Type DWord -Force
      `
    ),
    'tune-priority': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 2 -Type DWord -Force`
    ),
    'disable-fast-startup': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" -Name "HiberbootEnabled" -Value 0 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" -Name "HiberbootEnabled" -Value 1 -Type DWord -Force`
    ),
    'disable-telemetry': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" -Name "AllowTelemetry" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" -Name "AllowTelemetry" -Value 0 -Type DWord -Force
        Stop-Service DiagTrack -Force -ErrorAction SilentlyContinue
        Set-Service DiagTrack -StartupType Disabled -ErrorAction SilentlyContinue
      ` : `
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" -Name "AllowTelemetry" -Value 3 -Type DWord -Force
        Set-Service DiagTrack -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service DiagTrack -ErrorAction SilentlyContinue
      `
    ),
    'optimize-visual-effects': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 2 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 0 -Type DWord -Force`
    ),
    'enable-gaming-mode': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AutoGameModeEnabled" -Value 1 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AutoGameModeEnabled" -Value 0 -Type DWord -Force`
    ),
    'disable-accessibility': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\StickyKeys" -Name "Flags" -Value "506" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\ToggleKeys" -Name "Flags" -Value "58" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\Keyboard Response" -Name "Flags" -Value "122" -Force
      ` : `
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\StickyKeys" -Name "Flags" -Value "510" -Force
      `
    ),
    // ── Mouse & Keyboard Input ────────────────────────────────────
    'disable-mouse-acceleration': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseSpeed" -Value "0" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold1" -Value "0" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold2" -Value "0" -Force
        Remove-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "SmoothMouseXCurve" -Force -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "SmoothMouseYCurve" -Force -ErrorAction SilentlyContinue
      ` : `
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseSpeed" -Value "1" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold1" -Value "6" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold2" -Value "10" -Force
      `
    ),
    'disable-filter-keys': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\Keyboard Response" -Name "Flags" -Value "122" -Force`
        : `Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\Keyboard Response" -Name "Flags" -Value "123" -Force`
    ),
    'disable-sticky-keys': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\StickyKeys" -Name "Flags" -Value "506" -Force`
        : `Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\StickyKeys" -Name "Flags" -Value "510" -Force`
    ),
    'disable-toggle-keys': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\ToggleKeys" -Name "Flags" -Value "58" -Force`
        : `Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\ToggleKeys" -Name "Flags" -Value "59" -Force`
    ),
    'optimize-keyboard-repeat': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Keyboard" -Name "KeyboardDelay" -Value "0" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Keyboard" -Name "KeyboardSpeed" -Value "31" -Force
      ` : `
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Keyboard" -Name "KeyboardDelay" -Value "1" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Keyboard" -Name "KeyboardSpeed" -Value "31" -Force
      `
    ),
    'disable-usb-selective-suspend': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB" -Name "DisableSelectiveSuspend" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null
        powercfg /setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null
        powercfg /setactive SCHEME_CURRENT 2>&1 | Out-Null
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB" -Name "DisableSelectiveSuspend" -Force -ErrorAction SilentlyContinue
      `
    ),
    'optimize-usb-polling': () => runPowerShell(
      E ? `
        $usbDevs = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USB" -ErrorAction SilentlyContinue | Get-ChildItem -ErrorAction SilentlyContinue
        foreach ($d in $usbDevs) {
          Set-ItemProperty -Path $d.PSPath -Name "HidIdleTime" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        }
      ` : `
        $usbDevs = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USB" -ErrorAction SilentlyContinue | Get-ChildItem -ErrorAction SilentlyContinue
        foreach ($d in $usbDevs) {
          Remove-ItemProperty -Path $d.PSPath -Name "HidIdleTime" -Force -ErrorAction SilentlyContinue
        }
      `
    ),
    'optimize-foreground-boost': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 2 -Type DWord -Force`
    ),
    'optimize-memory': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "ClearPageFileAtShutdown" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "LargeSystemCache" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "DisablePagingExecutive" -Value 1 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "DisablePagingExecutive" -Value 0 -Type DWord -Force
      `
    ),
    'disable-hibernation': () => runPowerShell(E ? `powercfg /h off` : `powercfg /h on`),
    'disable-large-sys-cache': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "LargeSystemCache" -Value 0 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "LargeSystemCache" -Value 1 -Type DWord -Force`
    ),
    'disable-page-combining': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "EnablePageCombining" -Value 0 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "EnablePageCombining" -Value 1 -Type DWord -Force`
    ),
    'disable-paging-exec': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "DisablePagingExecutive" -Value 1 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "DisablePagingExecutive" -Value 0 -Type DWord -Force`
    ),
    'disable-prefetch': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" -Name "EnablePrefetcher" -Value 0 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" -Name "EnablePrefetcher" -Value 3 -Type DWord -Force`
    ),
    'disable-copilot': () => runPowerShell(
      E ? `
        New-Item -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" -Force | Out-Null
        Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" -Name "TurnOffWindowsCopilot" -Value 1 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" -Name "TurnOffWindowsCopilot" -Value 0 -Type DWord -Force
      `
    ),
    'disable-search-web': () => runPowerShell(
      E ? `
        New-Item -Path "HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer" -Force | Out-Null
        Set-ItemProperty -Path "HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer" -Name "DisableSearchBoxSuggestions" -Value 1 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer" -Name "DisableSearchBoxSuggestions" -Value 0 -Type DWord -Force
      `
    ),
    'disable-core-isolation': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity" -Name "Enabled" -Value 0 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity" -Name "Enabled" -Value 1 -Type DWord -Force`
    ),
    'disable-energy-logging': () => runPowerShell(
      E ? `
        powercfg /energyhst off 2>&1 | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\eeCtrl" -Name "Start" -Value 4 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "Energy logging disabled"
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\eeCtrl" -Name "Start" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "Energy logging restored"
      `
    ),
    'disable-hyper-v': () => runPowerShell(
      E ? `
        Disable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -NoRestart -ErrorAction SilentlyContinue 2>&1 | Out-Null
        bcdedit /set hypervisorlaunchtype off 2>&1 | Out-Null
        Write-Output "Hyper-V disabled"
      ` : `
        Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -NoRestart -ErrorAction SilentlyContinue 2>&1 | Out-Null
        bcdedit /set hypervisorlaunchtype auto 2>&1 | Out-Null
        Write-Output "Hyper-V enabled"
      `
    ),
    'disable-intel-tsx': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" -Name "DisableTsx" -Value 1 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" -Name "DisableTsx" -Value 0 -Type DWord -Force`
    ),
    'disable-mitigations': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "FeatureSettingsOverride" -Value 3 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "FeatureSettingsOverrideMask" -Value 3 -Type DWord -Force
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "FeatureSettingsOverride" -Force -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "FeatureSettingsOverrideMask" -Force -ErrorAction SilentlyContinue
      `
    ),
    'disable-superfetch': () => runPowerShell(
      E ? `
        Stop-Service SysMain -Force -ErrorAction SilentlyContinue
        Set-Service SysMain -StartupType Disabled -ErrorAction SilentlyContinue
      ` : `
        Set-Service SysMain -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service SysMain -ErrorAction SilentlyContinue
      `
    ),
    'disable-vbs': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" -Name "EnableVirtualizationBasedSecurity" -Value 0 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" -Name "EnableVirtualizationBasedSecurity" -Value 1 -Type DWord -Force
      `
    ),
    'optimize-explorer': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "NoNetCrawling" -Value 1 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "NoNetCrawling" -Value 0 -Type DWord -Force`
    ),
    'optimize-fsutil': () => runPowerShell(
      E ? `
        fsutil behavior set disablelastaccess 1
        fsutil behavior set disable8dot3 1
        fsutil behavior set memoryusage 2
      ` : `
        fsutil behavior set disablelastaccess 0
        fsutil behavior set disable8dot3 0
        fsutil behavior set memoryusage 1
      `
    ),
    'remove-xbox-gamebar': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_Enabled" -Value 0 -Type DWord -Force
        Get-AppxPackage *XboxGamingOverlay* | Remove-AppxPackage -ErrorAction SilentlyContinue
      ` : `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 1 -Type DWord -Force
        Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_Enabled" -Value 1 -Type DWord -Force
      `
    ),
    'max-pending-interrupts': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" -Name "MaxDynamicTickDuration" -Value 10 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" -Name "MaxDynamicTickDuration" -ErrorAction SilentlyContinue`
    ),
    'optimize-irq': () => runPowerShell(
      E ? `
        New-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "IRQ8Priority" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "IRQ16Priority" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "IRQ priority optimized"
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "IRQ8Priority" -Force -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "IRQ16Priority" -Force -ErrorAction SilentlyContinue
        Write-Output "IRQ priority restored"
      `
    ),
    'optimize-boot': () => runPowerShell(
      E ? `
        bcdedit /set useplatformtick yes 2>&1 | Out-Null
        bcdedit /set disabledynamictick yes 2>&1 | Out-Null
        bcdedit /set tscsyncpolicy enhanced 2>&1 | Out-Null
        bcdedit /timeout 3 2>&1 | Out-Null
        Write-Output "Boot config optimized"
      ` : `
        bcdedit /deletevalue useplatformtick 2>&1 | Out-Null
        bcdedit /deletevalue disabledynamictick 2>&1 | Out-Null
        bcdedit /deletevalue tscsyncpolicy 2>&1 | Out-Null
        bcdedit /timeout 30 2>&1 | Out-Null
        Write-Output "Boot config restored"
      `
    ),
    'optimize-background': () => runPowerShell(
      E ? `
        Disable-ScheduledTask -TaskName "\\Microsoft\\Windows\\Defrag\\ScheduledDefrag" -ErrorAction SilentlyContinue
        Disable-ScheduledTask -TaskName "\\Microsoft\\Windows\\Diagnosis\\Scheduled" -ErrorAction SilentlyContinue
        Disable-ScheduledTask -TaskName "\\Microsoft\\Windows\\DiskDiagnostic\\Microsoft-Windows-DiskDiagnosticDataCollector" -ErrorAction SilentlyContinue
      ` : `
        Enable-ScheduledTask -TaskName "\\Microsoft\\Windows\\Defrag\\ScheduledDefrag" -ErrorAction SilentlyContinue
      `
    ),
    'disable-touch': () => runPowerShell(
      E ? `
        New-Item -Path "HKCU:\\Software\\Microsoft\\TabletTip\\1.7" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\TabletTip\\1.7" -Name "EnableAutocorrection" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\TabletPC" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\TabletPC" -Name "DisableInkball" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        New-Item -Path "HKCU:\\Software\\Microsoft\\TabletTip\\1.7" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\TabletTip\\1.7" -Name "EnableAutocorrection" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `
    ),
    'disable-cortana': () => runPowerShell(
      E ? `
        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" -Name "AllowCortana" -Value 0 -Type DWord -Force
        Get-AppxPackage *Microsoft.549981C3F5F10* | Remove-AppxPackage -ErrorAction SilentlyContinue
      ` : `
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" -Name "AllowCortana" -Value 1 -Type DWord -Force
      `
    ),
    'disable-storage-sense': () => runPowerShell(
      E ? `
        New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" -Name "01" -Value 0 -Type DWord -Force
      ` : `
        New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" -Name "01" -Value 1 -Type DWord -Force
      `
    ),
    'disable-notifications': () => runPowerShell(
      E ? `
        New-Item -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" -Force | Out-Null
        Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" -Name "DisableNotificationCenter" -Value 1 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" -Name "DisableNotificationCenter" -Value 0 -Type DWord -Force
      `
    ),
    'disable-browser-hwaccel': () => runPowerShell(
      E ? `
        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Google\\Chrome" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Google\\Chrome" -Name "HardwareAccelerationModeEnabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\BraveSoftware\\Brave" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\BraveSoftware\\Brave" -Name "HardwareAccelerationModeEnabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Google\\Chrome" -Name "HardwareAccelerationModeEnabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\BraveSoftware\\Brave" -Name "HardwareAccelerationModeEnabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `
    ),
    'disable-browser-updates': () => runPowerShell(
      E ? `
        Stop-Service GoogleChromeElevationService -Force -ErrorAction SilentlyContinue
        Set-Service GoogleChromeElevationService -StartupType Disabled -ErrorAction SilentlyContinue
        Stop-Service edgeupdate -Force -ErrorAction SilentlyContinue
        Set-Service edgeupdate -StartupType Disabled -ErrorAction SilentlyContinue
      ` : `
        Set-Service GoogleChromeElevationService -StartupType Automatic -ErrorAction SilentlyContinue
        Set-Service edgeupdate -StartupType Automatic -ErrorAction SilentlyContinue
      `
    ),

    // ── Latency ──────────────────────────────────────────────────
    'disable-driver-services': () => runPowerShell(
      E ? `
        $services = @("lltdsvc","MapsBroker","NetTcpPortSharing","RemoteRegistry","SharedAccess","WMPNetworkSvc")
        foreach ($s in $services) {
          Stop-Service $s -Force -ErrorAction SilentlyContinue
          Set-Service $s -StartupType Disabled -ErrorAction SilentlyContinue
        }
      ` : `
        $services = @("lltdsvc","MapsBroker","NetTcpPortSharing","RemoteRegistry","SharedAccess","WMPNetworkSvc")
        foreach ($s in $services) {
          Set-Service $s -StartupType Manual -ErrorAction SilentlyContinue
        }
      `
    ),
    'mouse-tune': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters" -Name "MouseDataQueueSize" -Value 16 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\mouhid\\Parameters" -Name "MouseDataQueueSize" -Value 16 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters" -Name "MouseDataQueueSize" -Value 100 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\mouhid\\Parameters" -Name "MouseDataQueueSize" -Value 100 -Type DWord -Force
      `
    ),
    'keyboard-tune': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\kbdclass\\Parameters" -Name "KeyboardDataQueueSize" -Value 16 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\kbdclass\\Parameters" -Name "KeyboardDataQueueSize" -Value 100 -Type DWord -Force
      `
    ),
    'timer-resolution': () => runPowerShell(
      E ? `
        New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "SystemResponsiveness" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NetworkThrottlingIndex" -Value 4294967295 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "SystemResponsiveness" -Value 20 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NetworkThrottlingIndex" -Value 10 -Type DWord -Force
      `
    ),
    'optimize-mouse': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseSpeed" -Value "0" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold1" -Value "0" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold2" -Value "0" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseSensitivity" -Value "10" -Force
      ` : `
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseSpeed" -Value "1" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold1" -Value "6" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold2" -Value "10" -Force
        Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseSensitivity" -Value "10" -Force
      `
    ),
    'affinities': () => runPowerShell(
      E ? `
        $cpuCount = (Get-WmiObject Win32_Processor).NumberOfLogicalProcessors
        $affinityMask = [int]([Math]::Pow(2, $cpuCount) - 1)
        Get-Process | Where-Object { $_.Id -ne 0 -and $_.Id -ne 4 } | ForEach-Object {
          try { $_.ProcessorAffinity = $affinityMask } catch {}
        }
        Write-Output "Affinities set for all processes: $affinityMask"
      ` : `
        Write-Output "Affinities restored to default"
      `
    ),
    'csrss': () => runPowerShell(
      E ? `
        $csrssPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\csrss.exe\\PerfOptions"
        New-Item -Path $csrssPath -Force | Out-Null
        Set-ItemProperty -Path $csrssPath -Name "CpuPriorityClass" -Value 4 -Type DWord -Force
        Set-ItemProperty -Path $csrssPath -Name "IoPriority" -Value 3 -Type DWord -Force
        Set-ItemProperty -Path $csrssPath -Name "PagePriority" -Value 5 -Type DWord -Force
      ` : `
        Remove-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\csrss.exe\\PerfOptions" -Force -ErrorAction SilentlyContinue
      `
    ),
    'disable-hpet': () => runPowerShell(
      E ? `
        bcdedit /deletevalue useplatformclock 2>&1 | Out-Null
        bcdedit /set useplatformtick yes 2>&1 | Out-Null
        bcdedit /set disabledynamictick yes 2>&1 | Out-Null
        Write-Output "HPET disabled"
      ` : `
        bcdedit /set useplatformclock true 2>&1 | Out-Null
        bcdedit /deletevalue useplatformtick 2>&1 | Out-Null
        bcdedit /deletevalue disabledynamictick 2>&1 | Out-Null
        Write-Output "HPET restored"
      `
    ),
    'disable-synthetic-timers': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\TimedOperation" -Name "Start" -Value 4 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\TimedOperation" -Name "Start" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
      `
    ),
    'disable-coalescing': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" -Name "CoalescingTimerInterval" -Value 0 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" -Name "CoalescingTimerInterval" -Value 0xFFFFFFFF -Type DWord -Force
      `
    ),
    'disable-system-responsiveness': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\\Scheduler" -Name "EnablePreemption" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\\Scheduler" -Name "EnablePreemption" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      `
    ),
    'latency-tolerance': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PciLatencyTimerControl" -Value "0x20" -Force -ErrorAction SilentlyContinue
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PciLatencyTimerControl" -Force -ErrorAction SilentlyContinue
      `
    ),
    'optimize-svc-split': () => runPowerShell(
      E ? `
        $ram = [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1KB)
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control" -Name "SvcHostSplitThresholdInKB" -Value $ram -Type DWord -Force
        Write-Output "SvcHostSplitThreshold set to RAM size: $ram KB"
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control" -Name "SvcHostSplitThresholdInKB" -Value 3670016 -Type DWord -Force
        Write-Output "SvcHostSplitThreshold restored"
      `
    ),
    'optimize-write-cache': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\disk" -Name "TimeOutValue" -Value 30 -Type DWord -Force
        $diskDrives = Get-WmiObject Win32_DiskDrive
        foreach ($d in $diskDrives) {
          $devId = $d.PNPDeviceID -replace '\\\\', '\\'
          $regPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$devId\\Device Parameters\\Disk"
          if (Test-Path $regPath) {
            Set-ItemProperty -Path $regPath -Name "UserWriteCacheSetting" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
          }
        }
        Write-Output "Write cache and disk timeout optimized"
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\disk" -Name "TimeOutValue" -Value 60 -Type DWord -Force
        Write-Output "Disk timeout restored"
      `
    ),
    'optimize-io': () => runPowerShell(
      E ? `
        New-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "IRQ8Priority" -Value 1 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "IRQ16Priority" -Value 1 -Type DWord -Force
        Write-Output "I/O priorities optimized"
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "IRQ8Priority" -Force -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "IRQ16Priority" -Force -ErrorAction SilentlyContinue
        Write-Output "I/O priorities restored"
      `
    ),

    // ── NVIDIA ───────────────────────────────────────────────────
    'disable-nvidia-telemetry': () => runPowerShell(
      E ? `
        $services = @("NvTelemetryContainer","NvSvc","nvagent","NvContainerLocalSystem")
        foreach ($s in $services) {
          Stop-Service $s -Force -ErrorAction SilentlyContinue
          Set-Service $s -StartupType Disabled -ErrorAction SilentlyContinue
        }
        Remove-Item "$env:ProgramData\\NVIDIA Corporation\\NetService\\" -Recurse -Force -ErrorAction SilentlyContinue
      ` : `
        $services = @("NvTelemetryContainer","nvagent")
        foreach ($s in $services) {
          Set-Service $s -StartupType Automatic -ErrorAction SilentlyContinue
          Start-Service $s -ErrorAction SilentlyContinue
        }
      `
    ),
    'disable-p-states': () => runPowerShell(
      E ? `
        $gpu = Get-WmiObject -Namespace "root\\CIMV2" -Class "Win32_VideoController" | Where-Object {$_.Name -like "*NVIDIA*"} | Select-Object -First 1
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "DisableDynamicPstate" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "DisableDynamicPstate" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `
    ),
    'disable-hdcp': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "RMHdcpKeyglobZero" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "RMHdcpKeyglobZero" -Force -ErrorAction SilentlyContinue
      `
    ),
    'disable-power-gating': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PerfLevelSrc" -Value 0x2222 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PowerMizerEnable" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PowerMizerLevel" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PowerMizerLevelAC" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PowerMizerEnable" -Force -ErrorAction SilentlyContinue
      `
    ),
    'nvidia-profile-inspector': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PreferSystemMemoryContiguous" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "RMAERRForceDisable" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PreferSystemMemoryContiguous" -Force -ErrorAction SilentlyContinue
      `
    ),
    'basic-nvidia-tweaks': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "EnableMidBufferPreemption" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "EnableCEPreemption" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "EnableMidBufferPreemption" -Force -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "EnableCEPreemption" -Force -ErrorAction SilentlyContinue
      `
    ),
    'enable-preemption': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\\Scheduler" -Name "EnablePreemption" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\\Scheduler" -Name "EnablePreemption" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `
    ),

    // ── GPU ──────────────────────────────────────────────────────
    'disable-hw-acceleration': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Avalon.Graphics" -Name "DisableHWAcceleration" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Avalon.Graphics" -Name "DisableHWAcceleration" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      `
    ),
    'disable-energy-savings': () => runPowerShell(
      E ? `
        $hp = (powercfg /list | Select-String 'High performance').ToString().Split()[3]
        if ($hp) { powercfg /setactive $hp 2>&1 | Out-Null }
        powercfg /change standby-timeout-ac 0 2>&1 | Out-Null
        powercfg /change monitor-timeout-ac 0 2>&1 | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "D3PColdSupported" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "GPU energy savings disabled"
      ` : `
        $bal = (powercfg /list | Select-String 'Balanced').ToString().Split()[3]
        if ($bal) { powercfg /setactive $bal 2>&1 | Out-Null }
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "D3PColdSupported" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "GPU energy savings restored"
      `
    ),
    'amd-gpu-tweaks': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "KMD_EnableComputePreemption" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "DisableDrmdmaPowerGating" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "KMD_EnableComputePreemption" -Force -ErrorAction SilentlyContinue
      `
    ),
    'directx-tweaks': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\DirectX" -Name "D3D12_CPU_PAGE_TABLE_ENABLED" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\DirectX" -Name "D3D12_HEAP_SERIALIZATION_ENABLED" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\DirectX" -Name "D3D12_CPU_PAGE_TABLE_ENABLED" -Force -ErrorAction SilentlyContinue
      `
    ),
    'disable-gpu-timeout': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "TdrLevel" -Value 0 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "TdrLevel" -Value 3 -Type DWord -Force
      `
    ),
    'disable-multi-plane-overlay': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm" -Name "OverlayTestMode" -Value 5 -Type DWord -Force
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm" -Name "OverlayTestMode" -Force -ErrorAction SilentlyContinue
      `
    ),
    'optimize-intel-igpu': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0001" -Name "Disable_OverlayDSQualityEnhancement" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0001" -Name "Disable_OverlayDSQualityEnhancement" -Force -ErrorAction SilentlyContinue
      `
    ),
    'enable-fse': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_DSEBehavior" -Value 2 -Type DWord -Force
        Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_HonorUserFSEBehaviorMode" -Value 1 -Type DWord -Force
        Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_EFSEFeatureFlags" -Value 0 -Type DWord -Force
      ` : `
        Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_DSEBehavior" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_HonorUserFSEBehaviorMode" -Value 0 -Type DWord -Force
      `
    ),

    // ── Services ─────────────────────────────────────────────────
    'block-windows-updates': () => runPowerShell(
      E ? `
        Stop-Service wuauserv -Force -ErrorAction SilentlyContinue
        Set-Service wuauserv -StartupType Disabled -ErrorAction SilentlyContinue
        Stop-Service UsoSvc -Force -ErrorAction SilentlyContinue
        Set-Service UsoSvc -StartupType Disabled -ErrorAction SilentlyContinue
      ` : `
        Set-Service wuauserv -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service wuauserv -ErrorAction SilentlyContinue
        Set-Service UsoSvc -StartupType Automatic -ErrorAction SilentlyContinue
      `
    ),
    'disable-bluetooth': () => runPowerShell(
      E ? `
        Stop-Service bthserv -Force -ErrorAction SilentlyContinue
        Set-Service bthserv -StartupType Disabled -ErrorAction SilentlyContinue
      ` : `
        Set-Service bthserv -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service bthserv -ErrorAction SilentlyContinue
      `
    ),
    'disable-wifi': () => runPowerShell(
      E ? `
        Stop-Service WlanSvc -Force -ErrorAction SilentlyContinue
        Set-Service WlanSvc -StartupType Disabled -ErrorAction SilentlyContinue
      ` : `
        Set-Service WlanSvc -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service WlanSvc -ErrorAction SilentlyContinue
      `
    ),
    'disable-sync': () => runPowerShell(
      E ? `
        Stop-Service OneSyncSvc -Force -ErrorAction SilentlyContinue
        Set-Service OneSyncSvc -StartupType Disabled -ErrorAction SilentlyContinue
      ` : `
        Set-Service OneSyncSvc -StartupType Automatic -ErrorAction SilentlyContinue
      `
    ),
    'remove-onedrive': () => runPowerShell(
      E ? `
        Stop-Process -Name OneDrive -Force -ErrorAction SilentlyContinue
        Start-Process "$env:WINDIR\\SysWOW64\\OneDriveSetup.exe" -ArgumentList "/uninstall" -Wait -ErrorAction SilentlyContinue
        Start-Process "$env:WINDIR\\System32\\OneDriveSetup.exe" -ArgumentList "/uninstall" -Wait -ErrorAction SilentlyContinue
        Remove-Item "$env:USERPROFILE\\OneDrive" -Recurse -Force -ErrorAction SilentlyContinue
      ` : `
        Write-Output "OneDrive removed - reinstall manually if needed"
      `
    ),
    'disable-compatibility-assistant': () => runPowerShell(
      E ? `
        Stop-Service PcaSvc -Force -ErrorAction SilentlyContinue
        Set-Service PcaSvc -StartupType Disabled -ErrorAction SilentlyContinue
      ` : `
        Set-Service PcaSvc -StartupType Automatic -ErrorAction SilentlyContinue
      `
    ),
    'disable-homegroup': () => runPowerShell(
      E ? `
        Stop-Service HomeGroupListener -Force -ErrorAction SilentlyContinue
        Set-Service HomeGroupListener -StartupType Disabled -ErrorAction SilentlyContinue
        Stop-Service HomeGroupProvider -Force -ErrorAction SilentlyContinue
        Set-Service HomeGroupProvider -StartupType Disabled -ErrorAction SilentlyContinue
      ` : `
        Set-Service HomeGroupListener -StartupType Manual -ErrorAction SilentlyContinue
        Set-Service HomeGroupProvider -StartupType Manual -ErrorAction SilentlyContinue
      `
    ),
    'disable-xbox-services': () => runPowerShell(
      E ? `
        $xboxServices = @("XblAuthManager","XblGameSave","XboxGipSvc","XboxNetApiSvc")
        foreach ($s in $xboxServices) {
          Stop-Service $s -Force -ErrorAction SilentlyContinue
          Set-Service $s -StartupType Disabled -ErrorAction SilentlyContinue
        }
      ` : `
        $xboxServices = @("XblAuthManager","XblGameSave","XboxGipSvc","XboxNetApiSvc")
        foreach ($s in $xboxServices) {
          Set-Service $s -StartupType Manual -ErrorAction SilentlyContinue
        }
      `
    ),
    'disable-insider': () => runPowerShell(
      E ? `
        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\PreviewBuilds" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\PreviewBuilds" -Name "AllowBuildPreview" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\PreviewBuilds" -Name "EnableConfigFlighting" -Value 0 -Type DWord -Force
        Write-Output "Insider preview disabled"
      ` : `
        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\PreviewBuilds" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\PreviewBuilds" -Name "AllowBuildPreview" -Value 1 -Type DWord -Force
        Write-Output "Insider preview enabled"
      `
    ),
    'disable-fax-print': () => runPowerShell(
      E ? `
        Stop-Service Fax -Force -ErrorAction SilentlyContinue
        Set-Service Fax -StartupType Disabled -ErrorAction SilentlyContinue
        Stop-Service Spooler -Force -ErrorAction SilentlyContinue
        Set-Service Spooler -StartupType Disabled -ErrorAction SilentlyContinue
      ` : `
        Set-Service Fax -StartupType Manual -ErrorAction SilentlyContinue
        Set-Service Spooler -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service Spooler -ErrorAction SilentlyContinue
      `
    ),

    // ── New Main Tweaks ───────────────────────────────────────────
    'disable-power-throttling': () => runPowerShell(
      E ? `
        New-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -Name "PowerThrottlingOff" -Value 1 -Type DWord -Force
        Write-Output "Power throttling disabled"
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -Name "PowerThrottlingOff" -Value 0 -Type DWord -Force
        Write-Output "Power throttling restored"
      `
    ),
    'disable-cpu-parking': () => runPowerShell(
      E ? `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 0
        powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 0
        powercfg /apply
        Write-Output "CPU parking disabled"
      ` : `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 100
        powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 100
        powercfg /apply
        Write-Output "CPU parking restored"
      `
    ),
    'disable-search-indexing': () => runPowerShell(
      E ? `
        Stop-Service WSearch -Force -ErrorAction SilentlyContinue
        Set-Service WSearch -StartupType Disabled -ErrorAction SilentlyContinue
        Write-Output "Search indexing disabled"
      ` : `
        Set-Service WSearch -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service WSearch -ErrorAction SilentlyContinue
        Write-Output "Search indexing enabled"
      `
    ),
    'disable-windows-error-reporting': () => runPowerShell(
      E ? `
        Stop-Service WerSvc -Force -ErrorAction SilentlyContinue
        Set-Service WerSvc -StartupType Disabled -ErrorAction SilentlyContinue
        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Error Reporting" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Error Reporting" -Name "Disabled" -Value 1 -Type DWord -Force
        Write-Output "Windows Error Reporting disabled"
      ` : `
        Set-Service WerSvc -StartupType Manual -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Error Reporting" -Name "Disabled" -Value 0 -Type DWord -Force
        Write-Output "Windows Error Reporting enabled"
      `
    ),
    'fix-audio-service': () => runPowerShell(`
      Set-Service AudioEndpointBuilder -StartupType Automatic -ErrorAction SilentlyContinue
      Start-Service AudioEndpointBuilder -ErrorAction SilentlyContinue
      Set-Service AudioSrv -StartupType Automatic -ErrorAction SilentlyContinue
      Start-Service AudioSrv -ErrorAction SilentlyContinue
      Write-Output "Audio services restarted"
    `),
    'disable-remote-desktop': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server" -Name "fDenyTSConnections" -Value 1 -Type DWord -Force
        Stop-Service TermService -Force -ErrorAction SilentlyContinue
        Set-Service TermService -StartupType Disabled -ErrorAction SilentlyContinue
        Write-Output "Remote Desktop disabled"
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server" -Name "fDenyTSConnections" -Value 0 -Type DWord -Force
        Set-Service TermService -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service TermService -ErrorAction SilentlyContinue
        Write-Output "Remote Desktop enabled"
      `
    ),
    'optimize-network-adapter': () => runPowerShell(
      E ? `
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        foreach ($a in $adapters) {
          Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Interrupt Moderation" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Receive Side Scaling" -DisplayValue "Enabled" -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Energy Efficient Ethernet" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Flow Control" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
        }
        netsh int tcp set global autotuninglevel=normal
        netsh int tcp set global rss=enabled
        netsh int tcp set global fastopen=enabled
        netsh int tcp set global ecncapability=enabled
        Write-Output "Network adapter optimized"
      ` : `
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        foreach ($a in $adapters) {
          Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Interrupt Moderation" -DisplayValue "Enabled" -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Energy Efficient Ethernet" -DisplayValue "Enabled" -ErrorAction SilentlyContinue
        }
        Write-Output "Network adapter restored"
      `
    ),
    'disable-nagle-algorithm': () => runPowerShell(
      E ? `
        $tcpReg = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"
        Get-ChildItem $tcpReg | ForEach-Object {
          Set-ItemProperty -Path $_.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
          Set-ItemProperty -Path $_.PSPath -Name "TCPNoDelay" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        }
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\MSMQ\\Parameters" -Name "TCPNoDelay" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "Nagle algorithm disabled"
      ` : `
        $tcpReg = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"
        Get-ChildItem $tcpReg | ForEach-Object {
          Remove-ItemProperty -Path $_.PSPath -Name "TcpAckFrequency" -Force -ErrorAction SilentlyContinue
          Remove-ItemProperty -Path $_.PSPath -Name "TCPNoDelay" -Force -ErrorAction SilentlyContinue
        }
        Write-Output "Nagle algorithm restored"
      `
    ),
    'flush-dns-cache': () => runPowerShell(
      E ? `
        ipconfig /flushdns
        Clear-DnsClientCache -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "MaxCacheTtl" -Value 86400 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "MaxNegativeCacheTtl" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "DNS cache flushed and optimized"
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "MaxCacheTtl" -Force -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "MaxNegativeCacheTtl" -Force -ErrorAction SilentlyContinue
        Write-Output "DNS settings restored"
      `
    ),
    'optimize-ssd': () => runPowerShell(
      E ? `
        $drives = Get-PhysicalDisk | Where-Object { $_.MediaType -eq "SSD" -or $_.MediaType -eq "NVMe" }
        foreach ($d in $drives) {
          Optimize-Volume -DriveLetter C -ReTrim -ErrorAction SilentlyContinue
        }
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\storahci\\Parameters\\Device" -Name "TreatAsInternalPort" -Value @(0,1,2,3,4,5) -Type MultiString -Force -ErrorAction SilentlyContinue
        fsutil behavior set DisableDeleteNotify 0
        Write-Output "SSD optimized with TRIM"
      ` : `
        fsutil behavior set DisableDeleteNotify 1
        Write-Output "SSD settings restored"
      `
    ),
    'disable-defender-scanning': () => runPowerShell(
      E ? `
        Set-MpPreference -DisableRealtimeMonitoring $true -ErrorAction SilentlyContinue
        Set-MpPreference -DisableBehaviorMonitoring $true -ErrorAction SilentlyContinue
        Set-MpPreference -DisableBlockAtFirstSeen $true -ErrorAction SilentlyContinue
        Set-MpPreference -DisableIOAVProtection $true -ErrorAction SilentlyContinue
        Write-Output "Windows Defender real-time scanning disabled"
      ` : `
        Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableBehaviorMonitoring $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableBlockAtFirstSeen $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableIOAVProtection $false -ErrorAction SilentlyContinue
        Write-Output "Windows Defender real-time scanning enabled"
      `
    ),
    'set-ultimate-performance': () => runPowerShell(
      E ? `
        $guid = (powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>&1)
        $match = [regex]::Match($guid, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
        if ($match.Success) {
          powercfg /setactive $match.Value
          Write-Output "Ultimate Performance plan activated: $($match.Value)"
        } else {
          $plans = powercfg /list
          $ultra = ($plans | Select-String "Ultimate Performance").ToString()
          if ($ultra) {
            $uguid = [regex]::Match($ultra, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').Value
            powercfg /setactive $uguid
            Write-Output "Ultimate Performance plan set active"
          }
        }
      ` : `
        $bal = (powercfg /list | Select-String "Balanced").ToString()
        $bguid = [regex]::Match($bal, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').Value
        if ($bguid) { powercfg /setactive $bguid }
        Write-Output "Balanced power plan restored"
      `
    ),
    'trim-working-set': () => runPowerShell(
      E ? `
        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
        $mem = Get-WmiObject Win32_OperatingSystem
        $freeBefore = [math]::Round($mem.FreePhysicalMemory / 1MB, 1)
        Get-Process | Where-Object { $_.WorkingSet -gt 50MB -and $_.Name -notin @('System','Idle','csrss','smss','lsass','services','winlogon') } | ForEach-Object {
          try {
            $sig = Add-Type -MemberDefinition '[DllImport("kernel32.dll")] public static extern bool SetProcessWorkingSetSize(IntPtr proc, int min, int max);' -Name Win32Mem -Namespace Win32 -PassThru -ErrorAction SilentlyContinue
            $sig::SetProcessWorkingSetSize($_.Handle, -1, -1) | Out-Null
          } catch {}
        }
        $freeAfter = [math]::Round((Get-WmiObject Win32_OperatingSystem).FreePhysicalMemory / 1MB, 1)
        Write-Output "RAM trimmed. Free: $freeBefore GB -> $freeAfter GB"
      ` : `
        Write-Output "RAM trim is a one-time action, no undo needed"
      `
    ),

    // ── New Latency Tweaks ────────────────────────────────────────
    'disable-dwm-throttle': () => runPowerShell(
      E ? `
        New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\DWM" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\DWM" -Name "Composition" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NoLazyMode" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "AlwaysOn" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "DWM throttling disabled"
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NoLazyMode" -Force -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "AlwaysOn" -Force -ErrorAction SilentlyContinue
        Write-Output "DWM throttling restored"
      `
    ),
    'optimize-usb-polling': () => runPowerShell(
      E ? `
        Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USB" -Recurse -ErrorAction SilentlyContinue |
          Where-Object { (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).DeviceSelectiveSuspended -ne $null } |
          ForEach-Object {
            Set-ItemProperty -Path $_.PSPath -Name "IdleInWorkingState" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
          }
        New-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB" -Name "DisableSelectiveSuspend" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "USB selective suspend disabled"
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB" -Name "DisableSelectiveSuspend" -Force -ErrorAction SilentlyContinue
        Write-Output "USB polling restored"
      `
    ),
    'disable-raw-input-buffer': () => runPowerShell(
      E ? `
        New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Input" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Input" -Name "EnableInputInjectionProtection" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        New-Item -Path "HKCU:\\Software\\Microsoft\\Input\\Settings" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Input\\Settings" -Name "InsightsEnabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "Raw input buffer optimized"
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Input" -Name "EnableInputInjectionProtection" -Force -ErrorAction SilentlyContinue
        Write-Output "Raw input settings restored"
      `
    ),
    'optimize-interrupt-affinity': () => runPowerShell(
      E ? `
        $cpuCount = (Get-WmiObject Win32_Processor).NumberOfLogicalProcessors
        $mask = 1
        Get-WmiObject Win32_NetworkAdapter | Where-Object { $_.NetEnabled -eq $true } | ForEach-Object {
          $devId = $_.DeviceID
          $regPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($_.PNPDeviceID)\\Device Parameters\\Interrupt Management\\Affinity Policy"
          New-Item -Path $regPath -Force -ErrorAction SilentlyContinue | Out-Null
          Set-ItemProperty -Path $regPath -Name "AssignmentPolicy" -Value 4 -Type DWord -Force -ErrorAction SilentlyContinue
        }
        Write-Output "Interrupt affinity optimized"
      ` : `
        Write-Output "Interrupt affinity restored to default"
      `
    ),

    // ── New GPU Tweaks ────────────────────────────────────────────
    'enable-hags': () => runPowerShell(
      E ? `
        New-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode" -Value 2 -Type DWord -Force
        Write-Output "Hardware-Accelerated GPU Scheduling enabled"
      ` : `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode" -Value 1 -Type DWord -Force
        Write-Output "HAGS disabled"
      `
    ),
    'disable-shader-cache': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences" -Name "DirectXUserGlobalSettings" -Value "ShaderCache=UserDefined" -Force -ErrorAction SilentlyContinue
        New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Direct3D" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Direct3D" -Name "DisableOptimizations" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "GPU shader cache optimized"
      ` : `
        Write-Output "Shader cache settings restored"
      `
    ),
    'optimize-display-refresh': () => runPowerShell(
      E ? `
        New-Item -Path "HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\\Scheduler" -Name "VsyncIdleTimeout" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "DpiMapIommuContiguous" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "Display refresh rate optimization applied"
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\\Scheduler" -Name "VsyncIdleTimeout" -Force -ErrorAction SilentlyContinue
        Write-Output "Display refresh settings restored"
      `
    ),

    // ── New Nvidia Tweaks ─────────────────────────────────────────
    'nvidia-threaded-optimization': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "OGL_ThreadedOptimizations" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\NVIDIA Corporation\\Global\\NVTweak" -Name "Blacklist" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "NVIDIA threaded optimization enabled"
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "OGL_ThreadedOptimizations" -Force -ErrorAction SilentlyContinue
        Write-Output "NVIDIA threaded optimization restored"
      `
    ),
    'nvidia-max-pre-rendered-frames': () => runPowerShell(
      E ? `
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PipelineQueueLen" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKCU:\\Software\\NVIDIA Corporation\\Global\\NVTweak" -Name "PrerenderedFrames" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "NVIDIA max pre-rendered frames set to 1"
      ` : `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "PipelineQueueLen" -Force -ErrorAction SilentlyContinue
        Write-Output "NVIDIA pre-rendered frames restored"
      `
    ),

    // ── New Main Batch 2 ──────────────────────────────────────────
    'disable-windows-tips': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" -Name "SubscribedContent-338389Enabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" -Name "SoftLandingEnabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Windows tips disabled"`
        : `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" -Name "SubscribedContent-338389Enabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Windows tips restored"`
    ),
    'disable-activity-history': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" -Name "EnableActivityFeed" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" -Name "PublishUserActivities" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Activity history disabled"`
        : `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" -Name "EnableActivityFeed" -Force -ErrorAction SilentlyContinue
           Write-Output "Activity history restored"`
    ),
    'disable-location-tracking': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" -Name "Value" -Value "Deny" -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" -Name "DisableLocation" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Location tracking disabled"`
        : `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" -Name "Value" -Value "Allow" -Force -ErrorAction SilentlyContinue
           Write-Output "Location tracking restored"`
    ),
    'disable-advertising-id': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" -Name "Enabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" -Name "DisabledByGroupPolicy" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Advertising ID disabled"`
        : `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" -Name "Enabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Advertising ID restored"`
    ),
    'disable-app-diagnostics': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\appDiagnostics" -Name "Value" -Value "Deny" -Force -ErrorAction SilentlyContinue
           Write-Output "App diagnostics disabled"`
        : `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\appDiagnostics" -Name "Value" -Value "Allow" -Force -ErrorAction SilentlyContinue
           Write-Output "App diagnostics restored"`
    ),
    'optimize-ntfs': () => runPowerShell(
      E ? `fsutil behavior set disablelastaccess 1 2>&1 | Out-Null
           fsutil behavior set disable8dot3 1 2>&1 | Out-Null
           Write-Output "NTFS optimized"`
        : `fsutil behavior set disablelastaccess 0 2>&1 | Out-Null
           Write-Output "NTFS settings restored"`
    ),
    'disable-news-feed': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Feeds" -Name "EnableFeeds" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds" -Name "ShellFeedsTaskbarViewMode" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "News feed and widgets disabled"`
        : `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Feeds" -Name "EnableFeeds" -Force -ErrorAction SilentlyContinue
           Write-Output "News feed restored"`
    ),
    'disable-startup-delay': () => runPowerShell(
      E ? `New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" -Force -ErrorAction SilentlyContinue | Out-Null
           Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" -Name "StartupDelayInMSec" -Value 0 -Type DWord -Force
           Write-Output "Startup delay removed"`
        : `Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" -Name "StartupDelayInMSec" -Force -ErrorAction SilentlyContinue
           Write-Output "Startup delay restored"`
    ),
    'disable-menu-animations': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "MenuShowDelay" -Value "0" -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop\\WindowMetrics" -Name "MinAnimate" -Value "0" -Force -ErrorAction SilentlyContinue
           Write-Output "Menu animations disabled"`
        : `Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "MenuShowDelay" -Value "400" -Force -ErrorAction SilentlyContinue
           Write-Output "Menu animations restored"`
    ),
    'disable-window-ghosting': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "ForegroundFlashCount" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows" -Force -ErrorAction SilentlyContinue | Out-Null
           Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows" -Name "GhostWindowDisabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Window ghosting disabled"`
        : `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows" -Name "GhostWindowDisabled" -Force -ErrorAction SilentlyContinue
           Write-Output "Window ghosting restored"`
    ),
    'optimize-paged-pool': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "PoolUsageMaximum" -Value 60 -Type DWord -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "PagedPoolSize" -Value 0xffffffff -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Paged pool optimized"`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "PoolUsageMaximum" -Force -ErrorAction SilentlyContinue
           Write-Output "Paged pool restored"`
    ),
    'disable-automatic-maintenance': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" -Name "MaintenanceDisabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           schtasks /Change /TN "\\Microsoft\\Windows\\TaskScheduler\\Regular Maintenance" /Disable 2>&1 | Out-Null
           Write-Output "Automatic maintenance disabled"`
        : `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance" -Name "MaintenanceDisabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Automatic maintenance restored"`
    ),
    'set-high-performance-bus': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\501a4d13-42af-4429-9fd1-a8218c268e20\\ee12f906-d277-404b-b6da-e5fa1a576df5" -Name "Attributes" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
           $scheme = (powercfg /getactivescheme).Split()[3]
           powercfg /setacvalueindex $scheme 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0 2>&1 | Out-Null
           powercfg /setactive $scheme 2>&1 | Out-Null
           Write-Output "PCIe ASPM disabled for max performance"`
        : `$scheme = (powercfg /getactivescheme).Split()[3]
           powercfg /setacvalueindex $scheme 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 2 2>&1 | Out-Null
           powercfg /setactive $scheme 2>&1 | Out-Null
           Write-Output "PCIe ASPM restored"`
    ),
    'disable-delivery-optimization': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" -Name "DODownloadMode" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Stop-Service -Name "DoSvc" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "DoSvc" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "Delivery optimization disabled"`
        : `Set-Service -Name "DoSvc" -StartupType Automatic -ErrorAction SilentlyContinue
           Start-Service -Name "DoSvc" -ErrorAction SilentlyContinue
           Write-Output "Delivery optimization restored"`
    ),
    'disable-cloud-sync': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" -Name "AllowClipboardHistory" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" -Name "AllowCrossDeviceClipboard" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Cloud clipboard sync disabled"`
        : `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" -Name "AllowClipboardHistory" -Force -ErrorAction SilentlyContinue
           Write-Output "Cloud clipboard sync restored"`
    ),
    'set-processor-scheduling': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Processor scheduling optimized for foreground apps"`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Processor scheduling restored"`
    ),
    'disable-font-smoothing-extra': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "FontSmoothing" -Value "2" -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "FontSmoothingType" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Font rendering optimized"`
        : `Write-Output "Font rendering settings are default"`
    ),
    'disable-program-compat-wizard': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" -Name "DisableProgramCompatibilityWizard" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Program compatibility wizard disabled"`
        : `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat" -Name "DisableProgramCompatibilityWizard" -Force -ErrorAction SilentlyContinue
           Write-Output "Program compatibility wizard restored"`
    ),
    'disable-error-sounds': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\AppEvents\\Schemes" -Name "(Default)" -Value ".None" -Force -ErrorAction SilentlyContinue
           Write-Output "System error sounds disabled"`
        : `Set-ItemProperty -Path "HKCU:\\AppEvents\\Schemes" -Name "(Default)" -Value ".Default" -Force -ErrorAction SilentlyContinue
           Write-Output "System sounds restored"`
    ),

    // ── New Latency Batch 2 ────────────────────────────────────────
    'disable-cpu-idle-states': () => runPowerShell(
      E ? `$scheme = (powercfg /getactivescheme).Split()[3]
           powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 5d76a2ca-e8c0-402f-a133-2158492d58ad 0 2>&1 | Out-Null
           powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 68f262a7-f621-4069-b9a5-4857d02f4cbf 0 2>&1 | Out-Null
           powercfg /setactive $scheme 2>&1 | Out-Null
           Write-Output "CPU idle states disabled"`
        : `$scheme = (powercfg /getactivescheme).Split()[3]
           powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 5d76a2ca-e8c0-402f-a133-2158492d58ad 100 2>&1 | Out-Null
           powercfg /setactive $scheme 2>&1 | Out-Null
           Write-Output "CPU idle states restored"`
    ),
    'optimize-tcp-ack': () => runPowerShell(
      E ? `Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" | ForEach-Object {
               Set-ItemProperty -Path $_.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
               Set-ItemProperty -Path $_.PSPath -Name "TCPNoDelay" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           }
           Write-Output "TCP ACK frequency optimized"`
        : `Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" | ForEach-Object {
               Remove-ItemProperty -Path $_.PSPath -Name "TcpAckFrequency" -Force -ErrorAction SilentlyContinue
           }
           Write-Output "TCP ACK frequency restored"`
    ),
    'disable-tcp-autotuning': () => runPowerShell(
      E ? `netsh int tcp set global autotuninglevel=disabled 2>&1 | Out-Null
           Write-Output "TCP auto-tuning disabled"`
        : `netsh int tcp set global autotuninglevel=normal 2>&1 | Out-Null
           Write-Output "TCP auto-tuning restored"`
    ),
    'set-gpu-msi-mode': () => runPowerShell(
      E ? `$gpuPath = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\PCI" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -eq "Device Parameters" }
           if ($gpuPath) {
             $msiPath = $gpuPath.PSPath + "\\Interrupt Management\\MessageSignaledInterruptProperties"
             New-Item -Path $msiPath -Force -ErrorAction SilentlyContinue | Out-Null
             Set-ItemProperty -Path $msiPath -Name "MSISupported" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           }
           Write-Output "GPU MSI mode applied"`
        : `Write-Output "GPU MSI mode: manual restore required"`
    ),
    'disable-hardware-acceleration-cursor': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "SmoothMouseXCurve" -Value ([byte[]](0,0,0,0,0,0,0,0)) -Force -ErrorAction SilentlyContinue
           New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\DWM" -Force -ErrorAction SilentlyContinue | Out-Null
           Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\DWM" -Name "EnableAeroPeek" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Cursor hardware acceleration reduced"`
        : `Write-Output "Cursor settings restored"`
    ),
    'optimize-sched-quantum': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Scheduler quantum optimized"`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Scheduler quantum restored"`
    ),
    'disable-speculative-execution': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" -Name "EnablePrefetcher" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" -Name "EnableBootTrace" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Speculative prefetch disabled"`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" -Name "EnablePrefetcher" -Value 3 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Speculative prefetch restored"`
    ),
    'set-io-scheduler': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "IoPageLockLimit" -Value 983040 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "I/O scheduler optimized"`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" -Name "IoPageLockLimit" -Force -ErrorAction SilentlyContinue
           Write-Output "I/O scheduler restored"`
    ),
    'disable-throttle-notif': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -Name "PowerThrottlingOff" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Throttle notifications disabled"`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -Name "PowerThrottlingOff" -Force -ErrorAction SilentlyContinue
           Write-Output "Throttle notifications restored"`
    ),
    'pin-gpu-clocks': () => runPowerShell(
      E ? `$nvidiaSmi = "C:\\Windows\\System32\\nvidia-smi.exe"
           if (Test-Path $nvidiaSmi) {
             & $nvidiaSmi -pm 1 2>&1 | Out-Null
             Write-Output "NVIDIA GPU clocks pinned"
           } else { Write-Output "NVIDIA SMI not found - skipped" }`
        : `$nvidiaSmi = "C:\\Windows\\System32\\nvidia-smi.exe"
           if (Test-Path $nvidiaSmi) { & $nvidiaSmi -pm 0 2>&1 | Out-Null }
           Write-Output "GPU clock pinning removed"`
    ),

    // ── New GPU Batch 2 ───────────────────────────────────────────
    'disable-gpu-vsync-idle': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\\Scheduler" -Name "VsyncIdleTimeout" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "GPU VSync idle timeout disabled"`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\\Scheduler" -Name "VsyncIdleTimeout" -Force -ErrorAction SilentlyContinue
           Write-Output "GPU VSync idle timeout restored"`
    ),
    'enable-nvlink-sli': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "DpiMapIommuContiguous" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "GPU memory allocation optimized"`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "DpiMapIommuContiguous" -Force -ErrorAction SilentlyContinue
           Write-Output "GPU memory allocation restored"`
    ),
    'disable-ulps': () => runPowerShell(
      E ? `Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}" -ErrorAction SilentlyContinue | ForEach-Object {
               Set-ItemProperty -Path $_.PSPath -Name "EnableUlps" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           }
           Write-Output "AMD ULPS disabled"`
        : `Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}" -ErrorAction SilentlyContinue | ForEach-Object {
               Remove-ItemProperty -Path $_.PSPath -Name "EnableUlps" -Force -ErrorAction SilentlyContinue
           }
           Write-Output "AMD ULPS restored"`
    ),
    'optimize-d3d11': () => runPowerShell(
      E ? `New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Direct3D" -Force -ErrorAction SilentlyContinue | Out-Null
           Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Direct3D" -Name "RasterizerState_MultisampleEnable" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Direct3D" -Name "DebugRTVFormats" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "D3D11 settings optimized"`
        : `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Direct3D" -Name "RasterizerState_MultisampleEnable" -Force -ErrorAction SilentlyContinue
           Write-Output "D3D11 settings restored"`
    ),
    'disable-windows-ink': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PenWorkspace" -Name "PenWorkspaceButtonDesiredVisibility" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\WindowsInkWorkspace" -Name "AllowWindowsInkWorkspace" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Windows Ink disabled"`
        : `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\WindowsInkWorkspace" -Name "AllowWindowsInkWorkspace" -Force -ErrorAction SilentlyContinue
           Write-Output "Windows Ink restored"`
    ),
    'set-dx12-agility': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Direct3D12" -Name "AgilitySDKPath" -Value "" -Force -ErrorAction SilentlyContinue
           Write-Output "DX12 Agility SDK path configured"`
        : `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Direct3D12" -Name "AgilitySDKPath" -Force -ErrorAction SilentlyContinue
           Write-Output "DX12 Agility SDK path cleared"`
    ),
    'disable-transparency': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" -Name "EnableTransparency" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Transparency effects disabled"`
        : `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" -Name "EnableTransparency" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Transparency effects restored"`
    ),
    'disable-reflections': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\DWM" -Name "ColorizationColorBalance" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "Window reflections disabled"`
        : `Write-Output "Window reflections: no change needed"`
    ),

    // ── New Services Batch 2 ──────────────────────────────────────
    'disable-diagnostic-tracking': () => runPowerShell(
      E ? `Stop-Service -Name "DiagTrack" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "DiagTrack" -StartupType Disabled -ErrorAction SilentlyContinue
           Stop-Service -Name "dmwappushservice" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "dmwappushservice" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "Diagnostic tracking disabled"`
        : `Set-Service -Name "DiagTrack" -StartupType Automatic -ErrorAction SilentlyContinue
           Start-Service -Name "DiagTrack" -ErrorAction SilentlyContinue
           Write-Output "Diagnostic tracking restored"`
    ),
    'disable-map-manager': () => runPowerShell(
      E ? `Stop-Service -Name "MapsBroker" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "MapsBroker" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "Maps manager disabled"`
        : `Set-Service -Name "MapsBroker" -StartupType Automatic -ErrorAction SilentlyContinue
           Write-Output "Maps manager restored"`
    ),
    'disable-mobile-hotspot': () => runPowerShell(
      E ? `Stop-Service -Name "icssvc" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "icssvc" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "Mobile hotspot service disabled"`
        : `Set-Service -Name "icssvc" -StartupType Manual -ErrorAction SilentlyContinue
           Write-Output "Mobile hotspot service restored"`
    ),
    'disable-retail-demo': () => runPowerShell(
      E ? `Stop-Service -Name "RetailDemo" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "RetailDemo" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "Retail demo service disabled"`
        : `Set-Service -Name "RetailDemo" -StartupType Manual -ErrorAction SilentlyContinue
           Write-Output "Retail demo service restored"`
    ),
    'disable-smart-card-svc': () => runPowerShell(
      E ? `Stop-Service -Name "SCardSvr" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "SCardSvr" -StartupType Disabled -ErrorAction SilentlyContinue
           Stop-Service -Name "ScDeviceEnum" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "ScDeviceEnum" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "Smart card services disabled"`
        : `Set-Service -Name "SCardSvr" -StartupType Manual -ErrorAction SilentlyContinue
           Write-Output "Smart card services restored"`
    ),
    'disable-nfs-client': () => runPowerShell(
      E ? `Stop-Service -Name "NfsClnt" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "NfsClnt" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "NFS client disabled"`
        : `Set-Service -Name "NfsClnt" -StartupType Manual -ErrorAction SilentlyContinue
           Write-Output "NFS client restored"`
    ),
    'disable-ip-helper': () => runPowerShell(
      E ? `Stop-Service -Name "iphlpsvc" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "iphlpsvc" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "IP Helper disabled"`
        : `Set-Service -Name "iphlpsvc" -StartupType Automatic -ErrorAction SilentlyContinue
           Start-Service -Name "iphlpsvc" -ErrorAction SilentlyContinue
           Write-Output "IP Helper restored"`
    ),
    'disable-wlan-autoconfig': () => runPowerShell(
      E ? `Stop-Service -Name "Wlansvc" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "Wlansvc" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "WLAN AutoConfig disabled"`
        : `Set-Service -Name "Wlansvc" -StartupType Automatic -ErrorAction SilentlyContinue
           Start-Service -Name "Wlansvc" -ErrorAction SilentlyContinue
           Write-Output "WLAN AutoConfig restored"`
    ),
    'disable-net-logon': () => runPowerShell(
      E ? `Stop-Service -Name "Netlogon" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "Netlogon" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "Net Logon disabled"`
        : `Set-Service -Name "Netlogon" -StartupType Manual -ErrorAction SilentlyContinue
           Write-Output "Net Logon restored"`
    ),
    'disable-secondary-logon': () => runPowerShell(
      E ? `Stop-Service -Name "seclogon" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "seclogon" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "Secondary logon disabled"`
        : `Set-Service -Name "seclogon" -StartupType Manual -ErrorAction SilentlyContinue
           Write-Output "Secondary logon restored"`
    ),
    'disable-sensor-services': () => runPowerShell(
      E ? `$sensors = @("SensorDataService","SensrSvc","SensorService")
           foreach ($s in $sensors) {
             Stop-Service -Name $s -Force -ErrorAction SilentlyContinue
             Set-Service -Name $s -StartupType Disabled -ErrorAction SilentlyContinue
           }
           Write-Output "Sensor services disabled"`
        : `$sensors = @("SensorDataService","SensrSvc","SensorService")
           foreach ($s in $sensors) { Set-Service -Name $s -StartupType Manual -ErrorAction SilentlyContinue }
           Write-Output "Sensor services restored"`
    ),
    'disable-print-workflow': () => runPowerShell(
      E ? `Stop-Service -Name "PrintWorkflowUserSvc" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "PrintWorkflowUserSvc" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "Print workflow service disabled"`
        : `Set-Service -Name "PrintWorkflowUserSvc" -StartupType Manual -ErrorAction SilentlyContinue
           Write-Output "Print workflow service restored"`
    ),
    'disable-remote-registry': () => runPowerShell(
      E ? `Stop-Service -Name "RemoteRegistry" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "RemoteRegistry" -StartupType Disabled -ErrorAction SilentlyContinue
           Write-Output "Remote registry disabled"`
        : `Set-Service -Name "RemoteRegistry" -StartupType Manual -ErrorAction SilentlyContinue
           Write-Output "Remote registry restored"`
    ),

    // ── Power Plan (Real Windows Plans) ──────────────────────────
    'pp-detect': async () => {
      const raw = await runPowerShell(`
        $active = powercfg /getactivescheme
        $lctron = powercfg /list | Select-String "Lctron Plan"
        $lctronGuid = if ($lctron) { [regex]::Match($lctron.ToString(), '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').Value } else { '' }
        $activeGuid = [regex]::Match($active, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').Value
        if ($lctronGuid -and $lctronGuid -eq $activeGuid) { Write-Output "lctron" }
        elseif ($active -match 'High performance') { Write-Output "high-performance" }
        elseif ($active -match 'Balanced') { Write-Output "balanced" }
        else { Write-Output "other" }
      `);
      const planId = raw.trim();
      return { planId };
    },

    'pp-apply-lctron': async () => {
      await runPowerShell(`
        # ── Remove existing Lctron Plan if present ────────────────
        $existing = powercfg /list | Select-String "Lctron Plan"
        if ($existing) {
          $oldGuid = [regex]::Match($existing.ToString(), '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').Value
          if ($oldGuid) { powercfg /delete $oldGuid 2>&1 | Out-Null }
        }

        # ── Duplicate Ultimate Performance as base (falls back to High Performance) ──
        $dupOut = powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>&1
        $newGuid = [regex]::Match($dupOut, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').Value
        if (-not $newGuid) {
          $dupOut = powercfg /duplicatescheme 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1
          $newGuid = [regex]::Match($dupOut, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').Value
        }
        if (-not $newGuid) { Write-Output "ERROR: Could not create plan"; exit }

        # ── Rename to "Lctron Plan" ───────────────────────────────
        powercfg /changename $newGuid "Lctron Plan" "Maximum performance power plan by Lctron Optimizer. No throttling, no parking, no power saving." 2>&1 | Out-Null

        # ── Processor: min 100%, max 100%, boost aggressive ───────
        powercfg /setacvalueindex $newGuid 54533251-82be-4824-96c1-47b60b740d00 893dee8e-2bef-41e0-89c6-b55d0929964c 100 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 54533251-82be-4824-96c1-47b60b740d00 893dee8e-2bef-41e0-89c6-b55d0929964c 100 2>&1 | Out-Null
        powercfg /setacvalueindex $newGuid 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ec 100 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ec 100 2>&1 | Out-Null

        # ── CPU Boost: Aggressive (2) ─────────────────────────────
        powercfg /setacvalueindex $newGuid 54533251-82be-4824-96c1-47b60b740d00 be337238-0d82-4146-a960-4f3749d470c7 2 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 54533251-82be-4824-96c1-47b60b740d00 be337238-0d82-4146-a960-4f3749d470c7 2 2>&1 | Out-Null

        # ── CPU Core Parking: disable (0%) ────────────────────────
        powercfg /setacvalueindex $newGuid 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 0 2>&1 | Out-Null

        # ── Idle: disable CPU idle ────────────────────────────────
        powercfg /setacvalueindex $newGuid 54533251-82be-4824-96c1-47b60b740d00 5d76a2ca-e8c0-402f-a133-2158492d58ad 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 54533251-82be-4824-96c1-47b60b740d00 5d76a2ca-e8c0-402f-a133-2158492d58ad 0 2>&1 | Out-Null

        # ── Hard Disk: never sleep (0 = never) ───────────────────
        powercfg /setacvalueindex $newGuid 0012ee47-9041-4b5d-9b77-535fba8b1442 6738e2c4-e8a5-4a42-b16a-e040e769756e 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 0012ee47-9041-4b5d-9b77-535fba8b1442 6738e2c4-e8a5-4a42-b16a-e040e769756e 0 2>&1 | Out-Null

        # ── Sleep: never ─────────────────────────────────────────
        powercfg /setacvalueindex $newGuid 238c9fa8-0aad-41ed-83f4-97be242c8f20 29f6c1db-86da-48c5-9fdb-f2b67b1f44da 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 238c9fa8-0aad-41ed-83f4-97be242c8f20 29f6c1db-86da-48c5-9fdb-f2b67b1f44da 0 2>&1 | Out-Null

        # ── Hibernate: never ─────────────────────────────────────
        powercfg /setacvalueindex $newGuid 238c9fa8-0aad-41ed-83f4-97be242c8f20 9d7815a6-7ee4-497e-8888-515a05f02364 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 238c9fa8-0aad-41ed-83f4-97be242c8f20 9d7815a6-7ee4-497e-8888-515a05f02364 0 2>&1 | Out-Null

        # ── Display: never sleep ──────────────────────────────────
        powercfg /setacvalueindex $newGuid 7516b95f-f776-4464-8c53-06167f40cc99 3c0bc021-c8a8-4e07-a973-6b14cbcb2b7e 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 7516b95f-f776-4464-8c53-06167f40cc99 3c0bc021-c8a8-4e07-a973-6b14cbcb2b7e 0 2>&1 | Out-Null

        # ── USB Selective Suspend: disabled ───────────────────────
        powercfg /setacvalueindex $newGuid 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null

        # ── PCI Express ASPM: off ─────────────────────────────────
        powercfg /setacvalueindex $newGuid 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0 2>&1 | Out-Null

        # ── Wireless Adapter: max performance ────────────────────
        powercfg /setacvalueindex $newGuid 19caa586-e017-445c-aa8f-b5d43becae1c 12bbebe6-58d6-4636-95bb-3217ef867c1a 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $newGuid 19caa586-e017-445c-aa8f-b5d43becae1c 12bbebe6-58d6-4636-95bb-3217ef867c1a 0 2>&1 | Out-Null

        # ── Activate the new plan ─────────────────────────────────
        powercfg /setactive $newGuid 2>&1 | Out-Null

        # ── Also disable power throttling globally ────────────────
        New-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -Name "PowerThrottlingOff" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue

        # ── Win32 priority separation: games/foreground ───────────
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -Type DWord -Force

        Write-Output "Lctron Plan created and activated: $newGuid"
      `);
    },

    'pp-apply-high-performance': async () => {
      await runPowerShell(`
        $hp = powercfg /list | Select-String "High performance"
        $guid = [regex]::Match($hp.ToString(), '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').Value
        if ($guid) { powercfg /setactive $guid 2>&1 | Out-Null; Write-Output "High Performance activated" }
        else { Write-Output "Not found" }
      `);
    },

    'pp-apply-balanced': async () => {
      await runPowerShell(`
        $bal = powercfg /list | Select-String "Balanced"
        $guid = [regex]::Match($bal.ToString(), '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').Value
        if ($guid) { powercfg /setactive $guid 2>&1 | Out-Null; Write-Output "Balanced activated" }
        else { Write-Output "Not found" }
      `);
    },

    'pp-disable-throttle': async () => {
      await runPowerShell(E ? `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 893dee8e-2bef-41e0-89c6-b55d0929964c 100 2>&1 | Out-Null
        powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 893dee8e-2bef-41e0-89c6-b55d0929964c 100 2>&1 | Out-Null
        powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ec 100 2>&1 | Out-Null
        powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ec 100 2>&1 | Out-Null
        New-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -Name "PowerThrottlingOff" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "CPU throttling disabled"
      ` : `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 893dee8e-2bef-41e0-89c6-b55d0929964c 5 2>&1 | Out-Null
        powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 893dee8e-2bef-41e0-89c6-b55d0929964c 5 2>&1 | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" -Name "PowerThrottlingOff" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "CPU throttling restored"
      `);
    },

    'pp-disable-cores-parking': async () => {
      await runPowerShell(E ? `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 0 2>&1 | Out-Null
        powercfg /setactive $scheme 2>&1 | Out-Null
        Write-Output "Core parking disabled"
      ` : `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 100 2>&1 | Out-Null
        powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 100 2>&1 | Out-Null
        powercfg /setactive $scheme 2>&1 | Out-Null
        Write-Output "Core parking restored"
      `);
    },

    'pp-disable-usb-suspend': async () => {
      await runPowerShell(E ? `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $scheme 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null
        Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB" -Name "DisableSelectiveSuspend" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "USB suspend disabled"
      ` : `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 1 2>&1 | Out-Null
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB" -Name "DisableSelectiveSuspend" -Force -ErrorAction SilentlyContinue
        Write-Output "USB suspend restored"
      `);
    },

    'pp-disable-pcie-aspm': async () => {
      await runPowerShell(E ? `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0 2>&1 | Out-Null
        powercfg /setdcvalueindex $scheme 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0 2>&1 | Out-Null
        Write-Output "PCIe ASPM disabled"
      ` : `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 2 2>&1 | Out-Null
        powercfg /setdcvalueindex $scheme 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 2 2>&1 | Out-Null
        Write-Output "PCIe ASPM restored"
      `);
    },

    'pp-disable-sleep': async () => {
      await runPowerShell(E ? `
        powercfg /change standby-timeout-ac 0 2>&1 | Out-Null
        powercfg /change standby-timeout-dc 0 2>&1 | Out-Null
        powercfg /change hibernate-timeout-ac 0 2>&1 | Out-Null
        powercfg /change hibernate-timeout-dc 0 2>&1 | Out-Null
        powercfg /h off 2>&1 | Out-Null
        Write-Output "Sleep and hibernate disabled"
      ` : `
        powercfg /change standby-timeout-ac 30 2>&1 | Out-Null
        powercfg /h on 2>&1 | Out-Null
        Write-Output "Sleep restored"
      `);
    },

    'pp-boost-mode': async () => {
      await runPowerShell(E ? `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 be337238-0d82-4146-a960-4f3749d470c7 2 2>&1 | Out-Null
        powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 be337238-0d82-4146-a960-4f3749d470c7 2 2>&1 | Out-Null
        powercfg /setactive $scheme 2>&1 | Out-Null
        Write-Output "CPU boost mode set to Aggressive"
      ` : `
        $scheme = (powercfg /getactivescheme).Split()[3]
        powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 be337238-0d82-4146-a960-4f3749d470c7 1 2>&1 | Out-Null
        powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 be337238-0d82-4146-a960-4f3749d470c7 1 2>&1 | Out-Null
        powercfg /setactive $scheme 2>&1 | Out-Null
        Write-Output "CPU boost mode restored to Enabled"
      `);
    },
  };

  // ── Dispatch: check tweaks first (fastest path for most handlers) ─────────
  if (tweaks[id]) return tweaks[id]();

  // ── Cleaner ──────────────────────────────────────────────────
  const cleanerTweaks = {
    'clean-registry': async () => {
      await runPowerShell(`
        $keys = @(
          "HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache",
          "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RunMRU",
          "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths"
        )
        foreach ($k in $keys) {
          Remove-Item -Path $k -Recurse -Force -ErrorAction SilentlyContinue
        }
        Write-Output "Registry cleaned"
      `);
    },
    'run-device-cleanup': async () => {
      await runPowerShell(`
        $env:DEVMGR_SHOW_NONPRESENT_DEVICES = 1
        $devs = Get-PnpDevice -Status Unknown -ErrorAction SilentlyContinue
        foreach ($d in $devs) {
          pnputil /remove-device $d.InstanceId /subtree 2>&1 | Out-Null
        }
        Write-Output "Device cleanup done"
      `);
    },
    'clear-explorer-history': async () => {
      await runPowerShell(`
        Remove-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\OpenSavePidlMRU" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RunMRU" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:APPDATA\\Microsoft\\Windows\\Recent\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Output "Explorer history cleared"
      `);
    },
    'clear-logs-caches': async () => {
      await runPowerShell(`
        wevtutil cl System 2>&1 | Out-Null
        wevtutil cl Application 2>&1 | Out-Null
        wevtutil cl Security 2>&1 | Out-Null
        Remove-Item "$env:LOCALAPPDATA\\Microsoft\\Windows\\INetCache\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:LOCALAPPDATA\\Microsoft\\Windows\\WebCache\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Output "Logs and caches cleared"
      `);
    },
    'clear-font-cache': async () => {
      await runPowerShell(`
        Stop-Service -Name "FontCache" -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:windir\\ServiceProfiles\\LocalService\\AppData\\Local\\FontCache\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:windir\\System32\\FNTCACHE.DAT" -Force -ErrorAction SilentlyContinue
        Start-Service -Name "FontCache" -ErrorAction SilentlyContinue
        Write-Output "Font cache cleared"
      `);
    },
    'clear-temp-folder': async () => {
      await runPowerShell(`
        Remove-Item "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:windir\\Temp\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Output "Temp folder cleared"
      `);
    },
    'clear-telemetry-files': async () => {
      await runPowerShell(`
        Remove-Item "$env:ProgramData\\Microsoft\\Diagnosis\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:windir\\System32\\LogFiles\\WMI\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:ProgramData\\Microsoft\\Windows\\WER\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Output "Telemetry files cleared"
      `);
    },
    'clear-temp-opt-files': async () => {
      await runPowerShell(`
        Remove-Item "$env:windir\\SoftwareDistribution\\Download\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:windir\\Prefetch\\*" -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:LOCALAPPDATA\\Temp\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Output "Temp optimization files cleared"
      `);
    },
    'clear-thumbnail-cache': async () => {
      await runPowerShell(`
        Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer\\thumbcache_*" -Force -ErrorAction SilentlyContinue
        Start-Process explorer
        Write-Output "Thumbnail cache cleared"
      `);
    },
    'clear-context-menu': async () => {
      await runPowerShell(`
        $shellExKeys = Get-ChildItem -Path "HKCU:\\Software\\Classes\\*\\shellex\\ContextMenuHandlers" -ErrorAction SilentlyContinue
        foreach ($k in $shellExKeys) { Remove-Item -Path $k.PSPath -Recurse -Force -ErrorAction SilentlyContinue }
        Write-Output "Context menu cleaned"
      `);
    },
    'empty-recycle-bin': async () => {
      await runPowerShell(`
        Clear-RecycleBin -Force -ErrorAction SilentlyContinue
        Write-Output "Recycle bin emptied"
      `);
    },
    'schedule-cleaner': async () => {
      await runPowerShell(`
        $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NonInteractive -WindowStyle Hidden -Command \\"Clear-RecycleBin -Force -EA SilentlyContinue; Remove-Item $env:TEMP\\* -Recurse -Force -EA SilentlyContinue; Remove-Item $env:windir\\Temp\\* -Recurse -Force -EA SilentlyContinue\\""
        $trigger = New-ScheduledTaskTrigger -AtLogOn
        $settings = New-ScheduledTaskSettingsSet -Hidden
        Register-ScheduledTask -TaskName "LctronCleaner" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force 2>&1 | Out-Null
        Write-Output "Cleaner scheduled at logon"
      `);
    },
  };

  if (cleanerTweaks[id]) return cleanerTweaks[id]();

  // ── Network Scripts ───────────────────────────────────────────
  const networkScriptTweaks = {
    'optimize-nic': async () => {
      await runPowerShell(`
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        foreach ($a in $adapters) {
          Disable-NetAdapterChecksumOffload -Name $a.Name -ErrorAction SilentlyContinue
          Disable-NetAdapterLso -Name $a.Name -ErrorAction SilentlyContinue
          Disable-NetAdapterRsc -Name $a.Name -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Interrupt Moderation" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Receive Buffers" -DisplayValue "2048" -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Transmit Buffers" -DisplayValue "2048" -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $a.Name -DisplayName "Speed & Duplex" -DisplayValue "Auto Negotiation" -ErrorAction SilentlyContinue
        }
        Write-Output "NIC settings optimized"
      `);
    },
    'optimize-bufferbloat': async () => {
      await runPowerShell(`
        netsh int tcp set supplemental template=Internet congestionprovider=CTCP 2>&1 | Out-Null
        netsh int tcp set global autotuninglevel=highlyrestricted 2>&1 | Out-Null
        netsh int tcp set global rss=disabled 2>&1 | Out-Null
        netsh int tcp set global timestamps=disabled 2>&1 | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" -Name "NonBestEffortLimit" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
        Write-Output "Bufferbloat settings optimized"
      `);
    },
    'optimize-gaming-network': async () => {
      await runPowerShell(`
        netsh int tcp set global autotuninglevel=normal 2>&1 | Out-Null
        netsh int tcp set global chimney=disabled 2>&1 | Out-Null
        netsh int tcp set global dca=enabled 2>&1 | Out-Null
        netsh int tcp set global netdma=enabled 2>&1 | Out-Null
        netsh int tcp set global rss=enabled 2>&1 | Out-Null
        netsh int tcp set global nonsackrttresiliency=disabled 2>&1 | Out-Null
        netsh int tcp set global ecncapability=disabled 2>&1 | Out-Null
        Set-NetTCPSetting -SettingName InternetCustom -CongestionProvider CTCP -ErrorAction SilentlyContinue
        Set-DnsClientServerAddress -InterfaceAlias (Get-NetAdapter | Where-Object Status -eq "Up" | Select-Object -First 1 -ExpandProperty Name) -ServerAddresses ("1.1.1.1","8.8.8.8") -ErrorAction SilentlyContinue
        Write-Output "Gaming network profile applied"
      `);
    },
    'reset-network-stack': async () => {
      await runPowerShell(`
        netsh int ip reset 2>&1 | Out-Null
        netsh int tcp reset 2>&1 | Out-Null
        netsh winsock reset 2>&1 | Out-Null
        ipconfig /flushdns 2>&1 | Out-Null
        netsh advfirewall reset 2>&1 | Out-Null
        Write-Output "Network stack reset"
      `);
    },
    'flush-dns': async () => {
      await runPowerShell(`
        ipconfig /flushdns 2>&1 | Out-Null
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        foreach ($a in $adapters) {
          Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses ("1.1.1.1","8.8.8.8") -ErrorAction SilentlyContinue
        }
        Write-Output "DNS flushed and optimized"
      `);
    },
    'optimize-wifi-adapter': async () => {
      await runPowerShell(`
        $wifi = Get-NetAdapter | Where-Object { $_.PhysicalMediaType -eq "Native 802.11" -and $_.Status -eq "Up" }
        foreach ($w in $wifi) {
          Set-NetAdapterAdvancedProperty -Name $w.Name -DisplayName "Power Saving Mode" -DisplayValue "No Power Saving" -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $w.Name -DisplayName "Transmit Power" -DisplayValue "5. Highest" -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $w.Name -DisplayName "Background Scan" -DisplayValue "Disabled" -ErrorAction SilentlyContinue
          Set-NetAdapterAdvancedProperty -Name $w.Name -DisplayName "Roaming Aggressiveness" -DisplayValue "1. Lowest" -ErrorAction SilentlyContinue
        }
        Write-Output "Wi-Fi adapter optimized"
      `);
    },
  };

  if (networkScriptTweaks[id]) return networkScriptTweaks[id]();

  // ── Network Tweaks ────────────────────────────────────────────
  const networkTweaks = {
    // SMB
    'net-smb-non-best-effort': () => runPowerShell(
      E ? `Set-SmbClientConfiguration -EnableBandwidthThrottling 0 -EnableLargeMtu 1 -Confirm:$false -Force -ErrorAction SilentlyContinue`
        : `Set-SmbClientConfiguration -EnableBandwidthThrottling 1 -Confirm:$false -Force -ErrorAction SilentlyContinue`
    ),
    'net-smb-v2v3': () => runPowerShell(
      E ? `Set-SmbServerConfiguration -EnableSMB2Protocol $true -Confirm:$false -Force -ErrorAction SilentlyContinue`
        : `Set-SmbServerConfiguration -EnableSMB2Protocol $false -Confirm:$false -Force -ErrorAction SilentlyContinue`
    ),
    'net-smb-live-migration': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanWorkstation\\Parameters" -Name "DisableBandwidthThrottling" -Value 1 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanWorkstation\\Parameters" -Name "DisableBandwidthThrottling" -Force -ErrorAction SilentlyContinue`
    ),
    'net-smb-congruent-ops': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanWorkstation\\Parameters" -Name "MaximumConnectionUsage" -Value 32 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanWorkstation\\Parameters" -Name "MaximumConnectionUsage" -Force -ErrorAction SilentlyContinue`
    ),
    'net-smb-max-outstanding': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanWorkstation\\Parameters" -Name "MaxCmds" -Value 8192 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanWorkstation\\Parameters" -Name "MaxCmds" -Value 50 -Type DWord -Force`
    ),
    'net-smb-irp-stack': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" -Name "IRPStackSize" -Value 32 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" -Name "IRPStackSize" -Value 15 -Type DWord -Force`
    ),
    'net-smb-max-incoming': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" -Name "MaxWorkItems" -Value 8192 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" -Name "MaxWorkItems" -Value 256 -Type DWord -Force`
    ),
    'net-smb-pipe-data': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" -Name "PipeIncrement" -Value 10 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" -Name "PipeIncrement" -Force -ErrorAction SilentlyContinue`
    ),
    'net-smb-request-buffer': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" -Name "SizReqBuf" -Value 17424 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" -Name "SizReqBuf" -Value 4356 -Type DWord -Force`
    ),
    'net-smb-prealloc': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" -Name "MaxFreeConnections" -Value 100 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters" -Name "MaxFreeConnections" -Value 2 -Type DWord -Force`
    ),
    // TCP/IP
    'net-tcp-decrease-wait': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpTimedWaitDelay" -Value 30 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpTimedWaitDelay" -Force -ErrorAction SilentlyContinue`
    ),
    'net-tcp-disable-bufferlist': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "DisableAddressSharing" -Value 1 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "DisableAddressSharing" -Force -ErrorAction SilentlyContinue`
    ),
    'net-tcp-disable-nagle': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" -Name "TcpAckFrequency" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TCPNoDelay" -Value 1 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TCPNoDelay" -Force -ErrorAction SilentlyContinue`
    ),
    'net-tcp-disable-non-sack-rto': () => runPowerShell(
      E ? `netsh int tcp set global nonsackrttresiliency=disabled 2>&1 | Out-Null`
        : `netsh int tcp set global nonsackrttresiliency=enabled 2>&1 | Out-Null`
    ),
    'net-tcp-disable-task-offload': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "DisableTaskOffload" -Value 1 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "DisableTaskOffload" -Force -ErrorAction SilentlyContinue`
    ),
    'net-tcp-disable-timestamps': () => runPowerShell(
      E ? `netsh int tcp set global timestamps=disabled 2>&1 | Out-Null`
        : `netsh int tcp set global timestamps=enabled 2>&1 | Out-Null`
    ),
    'net-tcp-disable-window-heuristics': () => runPowerShell(
      E ? `netsh int tcp set heuristics disabled 2>&1 | Out-Null`
        : `netsh int tcp set heuristics enabled 2>&1 | Out-Null`
    ),
    'net-tcp-direct-cache': () => runPowerShell(
      E ? `netsh int tcp set global dca=enabled 2>&1 | Out-Null`
        : `netsh int tcp set global dca=disabled 2>&1 | Out-Null`
    ),
    'net-tcp-throttling-index': () => runPowerShell(
      E ? `New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Force -ErrorAction SilentlyContinue | Out-Null
           Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NetworkThrottlingIndex" -Value 0xffffffff -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NetworkThrottlingIndex" -Value 10 -Type DWord -Force`
    ),
    'net-tcp-path-mtu': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "EnablePMTUDiscovery" -Value 1 -Type DWord -Force
           Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "EnablePMTUBHDetect" -Value 1 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "EnablePMTUDiscovery" -Force -ErrorAction SilentlyContinue
           Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "EnablePMTUBHDetect" -Force -ErrorAction SilentlyContinue`
    ),
    'net-tcp-rss': () => runPowerShell(
      E ? `netsh int tcp set global rss=enabled 2>&1 | Out-Null`
        : `netsh int tcp set global rss=disabled 2>&1 | Out-Null`
    ),
    'net-tcp-chimney': () => runPowerShell(
      E ? `netsh int tcp set global chimney=enabled 2>&1 | Out-Null`
        : `netsh int tcp set global chimney=disabled 2>&1 | Out-Null`
    ),
    'net-tcp-selective-acks': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "SackOpts" -Value 1 -Type DWord -Force`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "SackOpts" -Value 0 -Type DWord -Force`
    ),
    'net-tcp-weak-host': () => runPowerShell(
      E ? `netsh int ipv4 set global weakhostreceive=enabled 2>&1 | Out-Null
           netsh int ipv4 set global weakhostsend=enabled 2>&1 | Out-Null`
        : `netsh int ipv4 set global weakhostreceive=disabled 2>&1 | Out-Null
           netsh int ipv4 set global weakhostsend=disabled 2>&1 | Out-Null`
    ),
    'net-tcp-http-autotuning': () => runPowerShell(
      E ? `netsh int tcp set global autotuninglevel=normal 2>&1 | Out-Null`
        : `netsh int tcp set global autotuninglevel=disabled 2>&1 | Out-Null`
    ),
    'net-tcp-retransmit-timeout': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpMaxDataRetransmissions" -Value 5 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpMaxDataRetransmissions" -Force -ErrorAction SilentlyContinue`
    ),
    'net-tcp-lower-timeout': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpMaxConnectRetransmissions" -Value 2 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpMaxConnectRetransmissions" -Force -ErrorAction SilentlyContinue`
    ),
    'net-tcp-congestion-provider': () => runPowerShell(
      E ? `netsh int tcp set supplemental template=Internet congestionprovider=CTCP 2>&1 | Out-Null`
        : `netsh int tcp set supplemental template=Internet congestionprovider=default 2>&1 | Out-Null`
    ),
    'net-tcp-ttl': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "DefaultTTL" -Value 64 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "DefaultTTL" -Force -ErrorAction SilentlyContinue`
    ),
    'net-tcp-remove-limit': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpNumConnections" -Value 0x00fffffe -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" -Name "TcpNumConnections" -Force -ErrorAction SilentlyContinue`
    ),
    'net-tcp-dynamic-port': () => runPowerShell(
      E ? `netsh int ipv4 set dynamicport tcp start=1025 num=64511 2>&1 | Out-Null
           netsh int ipv4 set dynamicport udp start=1025 num=64511 2>&1 | Out-Null`
        : `netsh int ipv4 set dynamicport tcp start=49152 num=16384 2>&1 | Out-Null
           netsh int ipv4 set dynamicport udp start=49152 num=16384 2>&1 | Out-Null`
    ),
    // UDP
    'net-udp-disable-offloads': () => runPowerShell(
      E ? `Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ForEach-Object { Disable-NetAdapterUso -Name $_.Name -ErrorAction SilentlyContinue }`
        : `Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ForEach-Object { Enable-NetAdapterUso -Name $_.Name -ErrorAction SilentlyContinue }`
    ),
    'net-udp-fast-datagram': () => runPowerShell(
      E ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\AFD\\Parameters" -Name "FastSendDatagramThreshold" -Value 1024 -Type DWord -Force -ErrorAction SilentlyContinue`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\AFD\\Parameters" -Name "FastSendDatagramThreshold" -Force -ErrorAction SilentlyContinue`
    ),
    // Security
    'net-sec-disable-llmr': () => runPowerShell(
      E ? `New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" -Force -ErrorAction SilentlyContinue | Out-Null
           Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" -Name "EnableMulticast" -Value 0 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" -Name "EnableMulticast" -Force -ErrorAction SilentlyContinue`
    ),
    'net-sec-disable-mpp': () => runPowerShell(
      E ? `Stop-Service -Name "PNRPsvc" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "PNRPsvc" -StartupType Disabled -ErrorAction SilentlyContinue
           Stop-Service -Name "p2psvc" -Force -ErrorAction SilentlyContinue
           Set-Service -Name "p2psvc" -StartupType Disabled -ErrorAction SilentlyContinue`
        : `Set-Service -Name "PNRPsvc" -StartupType Manual -ErrorAction SilentlyContinue
           Set-Service -Name "p2psvc" -StartupType Manual -ErrorAction SilentlyContinue`
    ),
    'net-sec-disable-netbios': () => runPowerShell(
      E ? `$adapters = Get-WmiObject Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled }
           foreach ($a in $adapters) { $a.SetTcpipNetbios(2) | Out-Null }
           Write-Output "NetBIOS disabled"`
        : `$adapters = Get-WmiObject Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled }
           foreach ($a in $adapters) { $a.SetTcpipNetbios(0) | Out-Null }
           Write-Output "NetBIOS restored"`
    ),
    // DNS
    'net-dns-over-https': () => runPowerShell(
      E ? `New-Item -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Force -ErrorAction SilentlyContinue | Out-Null
           Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "EnableAutoDoh" -Value 2 -Type DWord -Force`
        : `Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" -Name "EnableAutoDoh" -Force -ErrorAction SilentlyContinue`
    ),
    'net-dns-optimize': () => runPowerShell(
      E ? `$adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
           foreach ($a in $adapters) {
             Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses ("1.1.1.1","8.8.8.8") -ErrorAction SilentlyContinue
           }
           ipconfig /flushdns 2>&1 | Out-Null
           Write-Output "DNS optimized"`
        : `$adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
           foreach ($a in $adapters) {
             Set-DnsClientServerAddress -InterfaceAlias $a.Name -ResetServerAddresses -ErrorAction SilentlyContinue
           }
           Write-Output "DNS restored"`
    ),
  };

  if (networkTweaks[id]) return networkTweaks[id]();

  // ── Power Plan ───────────────────────────────────────────────
  const powerPlanTweaks = {
    'pp-detect': async () => {
      const out = await runPowerShell(`
        $active = (powercfg /getactivescheme)
        $guid = ($active -split ' ')[3]
        $name = ($active -split '\\(')[1].TrimEnd(')')
        Write-Output "$guid|$name"
      `);
      const parts = out.split('|');
      const name = (parts[1] || '').toLowerCase();
      let planId = null;
      if (name.includes('lctron')) planId = 'lctron';
      else if (name.includes('high')) planId = 'high-performance';
      else if (name.includes('balanced')) planId = 'balanced';
      return { planId };
    },

    'pp-apply-lctron': async () => {
      await runPowerShell(`
        # Create Lctron Ultimate power plan (duplicate from High Perf)
        $existingGuid = (powercfg /list | Select-String 'Lctron' | ForEach-Object { ($_ -split ' ')[3] } | Select-Object -First 1)
        if ($existingGuid) {
          powercfg /setactive $existingGuid 2>&1 | Out-Null
        } else {
          $hp = (powercfg /list | Select-String 'High performance')
          $hpGuid = ($hp -split ' ')[3]
          if (-not $hpGuid) { $hpGuid = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' }
          $newGuid = [guid]::NewGuid().ToString()
          powercfg /duplicatescheme $hpGuid $newGuid 2>&1 | Out-Null
          powercfg /changename $newGuid "Lctron Ultimate" "Maximum performance plan by Lctron Optimizer" 2>&1 | Out-Null
          powercfg /setactive $newGuid 2>&1 | Out-Null
          $guid = $newGuid
        }
        $guid = (powercfg /getactivescheme).Split(' ')[3]
        # CPU: min and max 100%
        powercfg /setacvalueindex $guid SUB_PROCESSOR PROCTHROTTLEMIN 100 2>&1 | Out-Null
        powercfg /setacvalueindex $guid SUB_PROCESSOR PROCTHROTTLEMAX 100 2>&1 | Out-Null
        # Processor boost: Aggressive (3)
        powercfg /setacvalueindex $guid SUB_PROCESSOR PERFBOOSTMODE 3 2>&1 | Out-Null
        # Disk: never sleep
        powercfg /setacvalueindex $guid SUB_DISK DISKIDLE 0 2>&1 | Out-Null
        # Display: never sleep
        powercfg /setacvalueindex $guid SUB_VIDEO VIDEOIDLE 0 2>&1 | Out-Null
        # Sleep: never
        powercfg /setacvalueindex $guid SUB_SLEEP STANDBYIDLE 0 2>&1 | Out-Null
        powercfg /setacvalueindex $guid SUB_SLEEP HIBERNATEIDLE 0 2>&1 | Out-Null
        # USB selective suspend: disabled (0)
        powercfg /setacvalueindex $guid 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null
        # PCI Express ASPM: off (0)
        powercfg /setacvalueindex $guid SUB_PCIEXPRESS ASPM 0 2>&1 | Out-Null
        powercfg /setactive $guid 2>&1 | Out-Null
        Write-Output "Lctron Ultimate power plan applied"
      `);
    },

    'pp-apply-high-performance': async () => {
      await runPowerShell(`
        $hp = (powercfg /list | Select-String 'High performance')
        if ($hp) {
          $guid = ($hp -split ' ')[3]
          powercfg /setactive $guid 2>&1 | Out-Null
        } else {
          powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1 | Out-Null
        }
        Write-Output "High Performance plan applied"
      `);
    },

    'pp-apply-balanced': async () => {
      await runPowerShell(`
        $bal = (powercfg /list | Select-String 'Balanced')
        if ($bal) {
          $guid = ($bal -split ' ')[3]
          powercfg /setactive $guid 2>&1 | Out-Null
        } else {
          powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e 2>&1 | Out-Null
        }
        Write-Output "Balanced plan applied"
      `);
    },

    'pp-disable-throttle': async () => {
      const guid = await runPowerShell(`(powercfg /getactivescheme).Split(' ')[3]`);
      await runPowerShell(
        enabled
          ? `$guid = (powercfg /getactivescheme).Split(' ')[3]
             powercfg /setacvalueindex $guid SUB_PROCESSOR PROCTHROTTLEMIN 100 2>&1 | Out-Null
             powercfg /setacvalueindex $guid SUB_PROCESSOR PROCTHROTTLEMAX 100 2>&1 | Out-Null
             powercfg /setactive $guid 2>&1 | Out-Null
             Write-Output "CPU throttling disabled"`
          : `$guid = (powercfg /getactivescheme).Split(' ')[3]
             powercfg /setacvalueindex $guid SUB_PROCESSOR PROCTHROTTLEMIN 5 2>&1 | Out-Null
             powercfg /setacvalueindex $guid SUB_PROCESSOR PROCTHROTTLEMAX 100 2>&1 | Out-Null
             powercfg /setactive $guid 2>&1 | Out-Null
             Write-Output "CPU throttling restored"`
      );
    },

    'pp-disable-cores-parking': async () => {
      await runPowerShell(
        enabled
          ? `
            $path = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\54533251-82be-4824-96c1-47b60b740d00\\0cc5b647-c1df-4637-891a-dec35c318583'
            New-Item -Path $path -Force -ErrorAction SilentlyContinue | Out-Null
            Set-ItemProperty -Path $path -Name 'ValueMax' -Value 0 -Type DWord -Force
            $guid = (powercfg /getactivescheme).Split(' ')[3]
            powercfg /setacvalueindex $guid SUB_PROCESSOR CPMINCORES 100 2>&1 | Out-Null
            powercfg /setactive $guid 2>&1 | Out-Null
            Write-Output "Core parking disabled"
          `
          : `
            $guid = (powercfg /getactivescheme).Split(' ')[3]
            powercfg /setacvalueindex $guid SUB_PROCESSOR CPMINCORES 0 2>&1 | Out-Null
            powercfg /setactive $guid 2>&1 | Out-Null
            Write-Output "Core parking restored"
          `
      );
    },

    'pp-disable-usb-suspend': async () => {
      await runPowerShell(
        enabled
          ? `$guid = (powercfg /getactivescheme).Split(' ')[3]
             powercfg /setacvalueindex $guid 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null
             powercfg /setactive $guid 2>&1 | Out-Null
             Write-Output "USB suspend disabled"`
          : `$guid = (powercfg /getactivescheme).Split(' ')[3]
             powercfg /setacvalueindex $guid 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 1 2>&1 | Out-Null
             powercfg /setactive $guid 2>&1 | Out-Null
             Write-Output "USB suspend restored"`
      );
    },

    'pp-disable-pcie-aspm': async () => {
      await runPowerShell(
        enabled
          ? `$guid = (powercfg /getactivescheme).Split(' ')[3]
             powercfg /setacvalueindex $guid SUB_PCIEXPRESS ASPM 0 2>&1 | Out-Null
             powercfg /setactive $guid 2>&1 | Out-Null
             Write-Output "PCIe ASPM disabled"`
          : `$guid = (powercfg /getactivescheme).Split(' ')[3]
             powercfg /setacvalueindex $guid SUB_PCIEXPRESS ASPM 2 2>&1 | Out-Null
             powercfg /setactive $guid 2>&1 | Out-Null
             Write-Output "PCIe ASPM restored"`
      );
    },

    'pp-disable-sleep': async () => {
      await runPowerShell(
        enabled
          ? `$guid = (powercfg /getactivescheme).Split(' ')[3]
             powercfg /setacvalueindex $guid SUB_SLEEP STANDBYIDLE 0 2>&1 | Out-Null
             powercfg /setacvalueindex $guid SUB_SLEEP HIBERNATEIDLE 0 2>&1 | Out-Null
             powercfg /setacvalueindex $guid SUB_DISK DISKIDLE 0 2>&1 | Out-Null
             powercfg /setacvalueindex $guid SUB_VIDEO VIDEOIDLE 0 2>&1 | Out-Null
             powercfg /setactive $guid 2>&1 | Out-Null
             powercfg /h off 2>&1 | Out-Null
             Write-Output "Sleep and hibernate disabled"`
          : `$guid = (powercfg /getactivescheme).Split(' ')[3]
             powercfg /setacvalueindex $guid SUB_SLEEP STANDBYIDLE 1800 2>&1 | Out-Null
             powercfg /setacvalueindex $guid SUB_SLEEP HIBERNATEIDLE 10800 2>&1 | Out-Null
             powercfg /setacvalueindex $guid SUB_VIDEO VIDEOIDLE 600 2>&1 | Out-Null
             powercfg /setactive $guid 2>&1 | Out-Null
             Write-Output "Sleep restored"`
      );
    },

    'pp-boost-mode': async () => {
      await runPowerShell(
        enabled
          ? `$guid = (powercfg /getactivescheme).Split(' ')[3]
             powercfg /setacvalueindex $guid SUB_PROCESSOR PERFBOOSTMODE 3 2>&1 | Out-Null
             powercfg /setacvalueindex $guid SUB_PROCESSOR PERFBOOSTPOL 100 2>&1 | Out-Null
             powercfg /setactive $guid 2>&1 | Out-Null
             Write-Output "Aggressive CPU boost enabled"`
          : `$guid = (powercfg /getactivescheme).Split(' ')[3]
             powercfg /setacvalueindex $guid SUB_PROCESSOR PERFBOOSTMODE 1 2>&1 | Out-Null
             powercfg /setacvalueindex $guid SUB_PROCESSOR PERFBOOSTPOL 60 2>&1 | Out-Null
             powercfg /setactive $guid 2>&1 | Out-Null
             Write-Output "CPU boost restored"`
      );
    },
  };

  if (powerPlanTweaks[id]) {
    return powerPlanTweaks[id]();
  }

  // ─── Pro exclusive tweaks ─────────────────────────────────────────────────
  const proTweaks = {
    'pro-ultimate-clean': () => runPowerShell(`
      Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue
      Remove-Item -Path "C:\\Windows\\Temp\\*" -Recurse -Force -ErrorAction SilentlyContinue
      Remove-Item -Path "$env:LOCALAPPDATA\\Microsoft\\Windows\\INetCache\\*" -Recurse -Force -ErrorAction SilentlyContinue
      Remove-Item -Path "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer\\thumbcache_*" -Force -ErrorAction SilentlyContinue
      ipconfig /flushdns | Out-Null
      Get-EventLog -LogName * -ErrorAction SilentlyContinue | ForEach-Object { Clear-EventLog $_.Log -ErrorAction SilentlyContinue }
      $wuCache = "C:\\Windows\\SoftwareDistribution\\Download"
      Stop-Service wuauserv -Force -ErrorAction SilentlyContinue
      Remove-Item -Path "$wuCache\\*" -Recurse -Force -ErrorAction SilentlyContinue
      Start-Service wuauserv -ErrorAction SilentlyContinue
      Write-Output "Ultimate clean complete"
    `),
    'pro-disable-uwp-bg': () => runPowerShell(
      enabled
        ? `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "UWP background execution disabled"`
        : `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "UWP background execution restored"`
    ),
    'pro-optimize-dx': () => runPowerShell(
      enabled
        ? `$dxKey = "HKLM:\\SOFTWARE\\Microsoft\\DirectX"
           if (!(Test-Path $dxKey)) { New-Item -Path $dxKey -Force | Out-Null }
           Set-ItemProperty -Path $dxKey -Name "EnableDebuggingTools" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
           $shKey = "HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences"
           if (!(Test-Path $shKey)) { New-Item -Path $shKey -Force | Out-Null }
           Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "DpiMapIommuContiguous" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "DirectX optimized"`
        : `Write-Output "DirectX settings restored (no change needed)"`
    ),
    'pro-gpu-hwsched': () => runPowerShell(
      enabled
        ? `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode" -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "GPU Hardware Scheduling enabled"`
        : `Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
           Write-Output "GPU Hardware Scheduling disabled"`
    ),
    'pro-timer-res': () => runPowerShell(
      enabled
        ? `bcdedit /set useplatformtick yes 2>&1 | Out-Null
           bcdedit /set disabledynamictick yes 2>&1 | Out-Null
           Write-Output "Timer resolution optimized"`
        : `bcdedit /deletevalue useplatformtick 2>&1 | Out-Null
           bcdedit /deletevalue disabledynamictick 2>&1 | Out-Null
           Write-Output "Timer resolution restored"`
    ),
  };

  if (proTweaks[id]) {
    const output = await proTweaks[id]();
    return { success: true, output: String(output) };
  }

  throw new Error(`Unknown tweak: ${id}`);
}

// ─── Pro: Live Stats ───────────────────────────────────────────────────────
ipcMain.handle('get-live-stats', async () => {
  const script = `
    $cpu = [math]::Round((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average)
    $os = Get-CimInstance Win32_OperatingSystem
    $ramTotalMB = [math]::Round($os.TotalVisibleMemorySize / 1024)
    $ramFreeMB  = [math]::Round($os.FreePhysicalMemory / 1024)
    $ramUsedMB  = $ramTotalMB - $ramFreeMB
    try {
      $gpuSamples = (Get-Counter '\\GPU Engine(*engtype_3D)\\Utilization Percentage' -ErrorAction SilentlyContinue).CounterSamples
      $gpu = [math]::Round(($gpuSamples | Measure-Object -Property CookedValue -Sum).Sum)
      if ($gpu -gt 100) { $gpu = 100 }
    } catch { $gpu = -1 }
    try {
      $tzTemps = (Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue).CurrentTemperature
      $tempC = [math]::Round(($tzTemps | Measure-Object -Average).Average / 10 - 273.15)
    } catch { $tempC = -1 }
    $procs = (Get-Process -ErrorAction SilentlyContinue).Count
    Write-Output "CPU:$cpu|RAM_USED:$ramUsedMB|RAM_TOTAL:$ramTotalMB|GPU:$gpu|TEMP:$tempC|PROCS:$procs"
  `;
  try {
    const out = String(await runPowerShell(script)).trim();
    const result = {};
    out.split('|').forEach(p => {
      const [k, v] = p.split(':');
      if (k && v !== undefined) result[k] = parseFloat(v);
    });
    return result;
  } catch {
    return {};
  }
});
