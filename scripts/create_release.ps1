param(
    [string]$Token = $env:GH_TOKEN
)

$owner = "Prominr"
$repo  = "Lctron-Optimizer"
$tag   = "v1.7.37"
$name  = "Lctron Optimizer v1.7.37"
$body  = "## Lctron Optimizer v1.7.37`n`n### Changes`n- **Themes Pro-gated**: All themes except Crimson Red (default) now require Premium`n- **Wallpapers Pro-gated**: All animated wallpapers except None now require Premium`n- **Particles Pro-gated**: All particle effects except None now require Premium`n- Free users see lock badges on locked items with a purple notice banner + Upgrade link`n- Clicking any locked appearance option redirects to the Upgrade page`n"
if (-not $Token) {
    Write-Error "GH_TOKEN not set. Pass -Token or set GH_TOKEN env var."
    exit 1
}

$headers = @{
    Authorization = "token $Token"
    Accept        = "application/vnd.github.v3+json"
    "User-Agent"  = "Lctron-Release-Script"
}

# Check if tag/release already exists and delete if so
$existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$tag" `
    -Headers $headers -Method Get -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Deleting existing release $tag..."
    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$($existing.id)" `
        -Headers $headers -Method Delete | Out-Null
}

# Create release
$releaseBody = @{
    tag_name         = $tag
    target_commitish = "master"
    name             = $name
    body             = $body
    draft            = $false
    prerelease       = $false
} | ConvertTo-Json

Write-Host "Creating release $tag..."
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" `
    -Headers $headers -Method Post -Body $releaseBody -ContentType "application/json"

Write-Host "Release created: $($release.html_url)"

$uploadUrl    = $release.upload_url -replace '\{.*\}', ''
$distDir      = Join-Path $PSScriptRoot "..\dist"
$uploadHeaders = $headers.Clone()
$uploadHeaders["Content-Type"] = "application/octet-stream"

# Upload installer (name must match latest.yml exactly)
$setupPath = Join-Path $distDir "Lctron Optimizer Setup.exe"
Write-Host "Uploading installer..."
$r1 = Invoke-RestMethod -Uri "${uploadUrl}?name=Lctron-Optimizer-Setup.exe" `
    -Headers $uploadHeaders -Method Post -InFile $setupPath
Write-Host "Installer: $($r1.browser_download_url)"

# Upload blockmap
$bmPath = Join-Path $distDir "Lctron Optimizer Setup.exe.blockmap"
if (Test-Path $bmPath) {
    Write-Host "Uploading blockmap..."
    $r2 = Invoke-RestMethod -Uri "${uploadUrl}?name=Lctron-Optimizer-Setup.exe.blockmap" `
        -Headers $uploadHeaders -Method Post -InFile $bmPath
    Write-Host "Blockmap: $($r2.browser_download_url)"
}

# Upload latest.yml — this is what electron-updater fetches to detect new versions
$ymlPath = Join-Path $distDir "latest.yml"
Write-Host "Uploading latest.yml..."
$r3 = Invoke-RestMethod -Uri "${uploadUrl}?name=latest.yml" `
    -Headers $uploadHeaders -Method Post -InFile $ymlPath
Write-Host "latest.yml: $($r3.browser_download_url)"

Write-Host "`nDone! Release $tag published at $($release.html_url)"
