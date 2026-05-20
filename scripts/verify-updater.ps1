param(
  [switch]$RequirePublished
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$releaseDir = Join-Path $root 'release'
$latestPath = Join-Path $releaseDir 'latest.yml'
$appUpdatePath = Join-Path $releaseDir 'win-unpacked\resources\app-update.yml'

function Get-YamlScalar([string]$Text, [string]$Name) {
  $line = ($Text -split "`n" | Where-Object { $_ -match "^$([regex]::Escape($Name)):\s*" } | Select-Object -First 1)
  if (-not $line) { return $null }
  return ($line -replace "^$([regex]::Escape($Name)):\s*", '').Trim().Trim("'").Trim('"')
}

if (-not (Test-Path $latestPath)) {
  throw "Missing updater metadata: $latestPath"
}
if (-not (Test-Path $appUpdatePath)) {
  throw "Missing packaged updater config: $appUpdatePath"
}

$latest = Get-Content $latestPath -Raw
$appUpdate = Get-Content $appUpdatePath -Raw
$package = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json

$version = Get-YamlScalar $latest 'version'
$installerName = Get-YamlScalar $latest 'path'
$sha512 = Get-YamlScalar $latest 'sha512'

if (-not $version) { throw 'latest.yml does not contain version.' }
if (-not $installerName) { throw 'latest.yml does not contain path.' }
if (-not $sha512) { throw 'latest.yml does not contain sha512.' }
if ($version -ne $package.version) {
  throw "latest.yml version $version does not match package.json version $($package.version)."
}

$installerPath = Join-Path $releaseDir $installerName
$blockMapPath = Join-Path $releaseDir "$installerName.blockmap"
if (-not (Test-Path $installerPath)) {
  throw "latest.yml points to a missing installer: $installerPath"
}
if (-not (Test-Path $blockMapPath)) {
  throw "Missing installer blockmap: $blockMapPath"
}

$provider = Get-YamlScalar $appUpdate 'provider'
$owner = Get-YamlScalar $appUpdate 'owner'
$repo = Get-YamlScalar $appUpdate 'repo'
if ($provider -ne 'github') { throw "app-update.yml provider must be github, found '$provider'." }
if (-not $owner -or -not $repo) { throw 'app-update.yml must contain owner and repo.' }

Write-Host '[verify-updater] local updater metadata OK'
Write-Host "Installer: $installerName"
Write-Host "Provider: $provider/$owner/$repo"

$api = "https://api.github.com/repos/$owner/$repo/releases/latest"
try {
  $release = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'StepForge updater verifier' }
  $assetNames = @($release.assets | ForEach-Object { $_.name })
  $missingAssets = @()
  foreach ($required in @('latest.yml', $installerName, "$installerName.blockmap")) {
    if ($assetNames -notcontains $required) {
      $missingAssets += $required
    }
  }
  if ($missingAssets.Count -gt 0) {
    $message = "Published release '$($release.tag_name)' does not contain current version $version assets: $($missingAssets -join ', ')."
    if (-not $RequirePublished) {
      Write-Warning "$message This is expected before publishing v$version."
      exit 0
    }
    throw $message
  }
  Write-Host "[verify-updater] published release OK: $($release.tag_name)"
}
catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 404 -and -not $RequirePublished) {
    Write-Warning 'No published GitHub release exists yet. This is expected before the first release; run again after npm run release.'
    exit 0
  }
  throw
}