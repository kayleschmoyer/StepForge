$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Push-Location $root
try {
  Write-Host '[verify-release] typecheck'
  npm run typecheck

  Write-Host '[verify-release] build'
  npm run build

  Write-Host '[verify-release] package'
  npm run dist

  Write-Host '[verify-release] updater metadata'
  npm run verify:updater

  $latest = Get-Content (Join-Path $root 'release\latest.yml') -Raw
  $installerName = (($latest -split "`n" | Where-Object { $_ -match '^path:\s*' } | Select-Object -First 1) -replace '^path:\s*', '').Trim()
  $installer = Join-Path $root "release\$installerName"
  $exe = Join-Path $root 'release\win-unpacked\StepForge.exe'
  $windowScript = Join-Path $root 'release\win-unpacked\resources\scripts\enum-windows.ps1'
  $captureScript = Join-Path $root 'release\win-unpacked\resources\scripts\capture-window.ps1'

  foreach ($path in @($installer, $exe, $windowScript, $captureScript)) {
    if (-not (Test-Path $path)) {
      throw "Missing release artifact: $path"
    }
  }

  Write-Host '[verify-release] packaged launch smoke test'
  $screenshot = Join-Path $root 'packaged-check.png'
  $outLog = Join-Path $root 'out.log'
  $errLog = Join-Path $root 'err.log'
  $tempUserData = Join-Path $root 'smoke-user-data-release'
  Remove-Item $screenshot, $outLog, $errLog -Force -ErrorAction SilentlyContinue
  Remove-Item $tempUserData -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $tempUserData -Force | Out-Null

  $env:STEPFORGE_SCREENSHOT = $screenshot
  $env:STEPFORGE_SCREENSHOT_DELAY = '3000'
  $env:ELECTRON_ENABLE_LOGGING = '1'
  $process = Start-Process -FilePath $exe -ArgumentList @('--user-data-dir=' + $tempUserData) -RedirectStandardOutput $outLog -RedirectStandardError $errLog -NoNewWindow -PassThru
  Wait-Process -Id $process.Id -Timeout 12 -ErrorAction SilentlyContinue
  if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }

  if (-not (Test-Path $screenshot)) {
    throw 'Packaged launch smoke test did not create screenshot.'
  }

  $screenshotInfo = Get-Item $screenshot
  if ($screenshotInfo.Length -lt 10000) {
    throw "Packaged launch screenshot is unexpectedly small: $($screenshotInfo.Length) bytes"
  }

  Write-Host '[verify-release] success'
  Write-Host "Installer: $installer"
  Write-Host "Screenshot: $screenshot ($($screenshotInfo.Length) bytes)"
}
finally {
  Pop-Location
}
