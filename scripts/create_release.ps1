param(
    [string]$Token = $env:GH_TOKEN
)

$owner = "Prominr"
$repo  = "Lctron-Optimizer"
$tag   = "v1.7.29"
$name  = "Lctron Optimizer v1.7.29"
$body  = "## Lctron Optimizer v1.7.29`n`n### Changes`n- **Themes Pro-gated**: All themes except Crimson Red (default) now require Premium`n- **Wallpapers Pro-gated**: All animated wallpapers except None now require Premium`n- **Particles Pro-gated**: All particle effects except None now require Premium`n- Free users see lock badges on locked items with a purple notice banner + Upgrade link`n- Clicking any locked appearance option redirects to the Upgrade page`n"
$asset = Join-Path $PSScriptRoot "..\dist\Lctron Optimizer Setup.exe"

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
    target_commitish = "main"
    name             = $name
    body             = $body
    draft            = $false
    prerelease       = $false
} | ConvertTo-Json

Write-Host "Creating release $tag..."
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" `
    -Headers $headers -Method Post -Body $releaseBody -ContentType "application/json"

Write-Host "Release created: $($release.html_url)"

# Upload installer
$uploadUrl = $release.upload_url -replace '\{.*\}', ''
$fileName  = "Lctron-Optimizer-Setup-$tag.exe"
$assetPath = Resolve-Path $asset

$uploadHeaders = $headers.Clone()
$uploadHeaders["Content-Type"] = "application/octet-stream"

Write-Host "Uploading $fileName..."
$result = Invoke-RestMethod -Uri "${uploadUrl}?name=$fileName" `
    -Headers $uploadHeaders -Method Post -InFile $assetPath
Write-Host "Uploaded: $($result.browser_download_url)"

# Also upload blockmap for delta updates
$blockmapPath = "$assetPath.blockmap"
if (Test-Path $blockmapPath) {
    Write-Host "Uploading blockmap..."
    $bm = Invoke-RestMethod -Uri "${uploadUrl}?name=$fileName.blockmap" `
        -Headers $uploadHeaders -Method Post -InFile $blockmapPath
    Write-Host "Blockmap uploaded: $($bm.browser_download_url)"
}

Write-Host "`nDone! Release $tag published."
