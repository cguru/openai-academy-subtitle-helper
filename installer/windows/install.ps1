$ErrorActionPreference = "Stop"

$ToolRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$InstallRoot = Join-Path $env:LOCALAPPDATA "OpenAI-Academy-Subtitle-Helper"
$NativeHostRoot = Join-Path $InstallRoot "native-host"
$ViewerRoot = Join-Path $InstallRoot "viewer"
$ScriptsRoot = Join-Path $InstallRoot "scripts"
$ExtensionRoot = Join-Path $ToolRoot "extension"
$ExtensionManifestPath = Join-Path $ExtensionRoot "manifest.json"
$HostName = "io.github.openai_academy_subtitle_helper"
$ManifestPath = Join-Path $InstallRoot "$HostName.json"
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"

function Find-CommandPath {
    param([Parameter(Mandatory = $true)][string] $Command)

    $found = Get-Command $Command -ErrorAction SilentlyContinue
    if ($found) {
        return $found.Source
    }
    return $null
}

$nodePath = Find-CommandPath "node.exe"
if (-not $nodePath) {
    throw "Node.js was not found in PATH. Install Node.js or use a bundled release build."
}

$codexPath = Find-CommandPath "codex.cmd"
if (-not $codexPath) {
    $codexPath = Find-CommandPath "codex.exe"
}
if (-not $codexPath) {
    $codexCandidates = Get-ChildItem "$env:ProgramFiles\WindowsApps\OpenAI.Codex_*\app\resources\codex.exe" -ErrorAction SilentlyContinue
    if ($codexCandidates) {
        $codexPath = ($codexCandidates | Sort-Object FullName -Descending | Select-Object -First 1).FullName
    }
}
if (-not $codexPath) {
    Write-Warning "Codex CLI was not found. Cached subtitle viewing can still work, but subtitle generation will need Codex later."
} else {
    Write-Host "Found Codex: $codexPath"
}

$extensionManifest = Get-Content -Raw -LiteralPath $ExtensionManifestPath | ConvertFrom-Json
if (-not $extensionManifest.key) {
    throw "Extension manifest is missing a stable key. Cannot compute extension ID for native messaging."
}
$keyBytes = [Convert]::FromBase64String($extensionManifest.key)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$hash = $sha256.ComputeHash($keyBytes)
$hex = -join ($hash[0..15] | ForEach-Object { $_.ToString("x2") })
$extensionIdChars = foreach ($char in $hex.ToCharArray()) {
    [char]([int][char]'a' + [Convert]::ToInt32([string]$char, 16))
}
$ExtensionId = -join $extensionIdChars

New-Item -ItemType Directory -Force -Path $InstallRoot, $NativeHostRoot, $ViewerRoot, $ScriptsRoot | Out-Null
Copy-Item -Recurse -Force (Join-Path $ToolRoot "native-host\src") $NativeHostRoot
Copy-Item -Force (Join-Path $ToolRoot "native-host\package.json") $NativeHostRoot
Copy-Item -Recurse -Force (Join-Path $ToolRoot "viewer\src") $ViewerRoot
Copy-Item -Force (Join-Path $ToolRoot "scripts\oash.ps1") $ScriptsRoot
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $ScriptsRoot "New-AcademyKoreanSubtitle.ps1")

$launcherPath = Join-Path $NativeHostRoot "run-native-host.cmd"
@"
@echo off
"$nodePath" "%~dp0src\host.js"
"@ | Set-Content -LiteralPath $launcherPath -Encoding ASCII

$manifest = @{
    name = $HostName
    description = "OpenAI Academy Subtitle Helper native host"
    path = $launcherPath
    type = "stdio"
    allowed_origins = @(
        "chrome-extension://$ExtensionId/"
    )
}

$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

New-Item -Force -Path $RegistryPath | Out-Null
Set-Item -Path $RegistryPath -Value $ManifestPath

Write-Host ""
Write-Host "Native host registered:"
Write-Host "  $HostName"
Write-Host "Extension ID:"
Write-Host "  $ExtensionId"
Write-Host ""
Write-Host "IMPORTANT:"
Write-Host "1. Open Chrome extensions."
Write-Host "2. Enable Developer mode."
Write-Host "3. Load unpacked extension from:"
Write-Host "   $ExtensionRoot"
Write-Host "4. The native host manifest already allows the stable extension ID above."
Write-Host ""

Start-Process "chrome.exe" "chrome://extensions" -ErrorAction SilentlyContinue
