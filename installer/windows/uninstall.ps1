$ErrorActionPreference = "Stop"

$HostName = "io.github.openai_academy_subtitle_helper"
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
$InstallRoot = Join-Path $env:LOCALAPPDATA "OpenAI-Academy-Subtitle-Helper"

if (Test-Path $RegistryPath) {
    Remove-Item -Recurse -Force $RegistryPath
    Write-Host "Removed native host registry entry."
}

if (Test-Path $InstallRoot) {
    Remove-Item -Recurse -Force $InstallRoot
    Write-Host "Removed $InstallRoot"
}
