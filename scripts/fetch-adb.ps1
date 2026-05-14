#requires -Version 5.1
<#
.SYNOPSIS
  Downloads Google's Android platform-tools and extracts the minimum files
  needed for `adb.exe` to run on Windows into `resources/adb/`.

  This script is idempotent — it skips the download if adb.exe is already
  present unless -Force is supplied.
#>
[CmdletBinding()]
param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$root      = Split-Path -Parent $PSScriptRoot
$destDir   = Join-Path $root 'resources\adb'
$adbExe    = Join-Path $destDir 'adb.exe'
$zipUrl    = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'

if ((Test-Path $adbExe) -and -not $Force) {
  Write-Host "adb.exe already present at $adbExe (use -Force to re-download)."
  exit 0
}

New-Item -ItemType Directory -Force -Path $destDir | Out-Null
$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("platform-tools-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
$zipPath = Join-Path $tmpDir 'platform-tools.zip'

try {
  Write-Host "Downloading $zipUrl ..."
  Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

  Write-Host "Extracting ..."
  Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force

  $needed = @('adb.exe', 'AdbWinApi.dll', 'AdbWinUsbApi.dll')
  foreach ($name in $needed) {
    $src = Join-Path $tmpDir "platform-tools\$name"
    if (-not (Test-Path $src)) {
      throw "Expected file not found in archive: $name"
    }
    Copy-Item -Path $src -Destination (Join-Path $destDir $name) -Force
  }

  Write-Host "Bundled adb -> $destDir"
}
finally {
  try {
    if (Test-Path -LiteralPath $tmpDir) {
      Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  } catch {
    # Best-effort cleanup only.
  }
}
