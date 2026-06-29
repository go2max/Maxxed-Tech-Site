[CmdletBinding()]
param([string]$DeviceSerial, [string]$BaseUrl)

$ErrorActionPreference = 'Continue'
$failures = [System.Collections.Generic.List[string]]::new()
function Test-Command { param([string]$Name, [switch]$Required)
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { Write-Host "[PASS] $Name -> $($command.Source)" -ForegroundColor Green; return $command }
    $label = if ($Required) { 'FAIL' } else { 'WARN' }
    Write-Host "[$label] $Name not found" -ForegroundColor $(if ($Required) {'Red'} else {'Yellow'})
    if ($Required) { $failures.Add("Missing command: $Name") }
    return $null
}

Test-Command pwsh -Required | Out-Null
$adb = Test-Command adb -Required
Test-Command apkanalyzer -Required | Out-Null
Test-Command apksigner -Required | Out-Null
if (-not $env:MAXXED_RUNNER_TOKEN) { $failures.Add('MAXXED_RUNNER_TOKEN is not set.'); Write-Host '[FAIL] Runner token is not configured.' -ForegroundColor Red } else { Write-Host '[PASS] Runner token is configured (value hidden).' -ForegroundColor Green }
if (-not $env:MAXXED_ALLOWED_SIGNERS_JSON) { Write-Host '[WARN] Approved signer JSON is not configured; APKs will require manual review.' -ForegroundColor Yellow } else { try { $null = $env:MAXXED_ALLOWED_SIGNERS_JSON | ConvertFrom-Json; Write-Host '[PASS] Approved signer JSON parses.' -ForegroundColor Green } catch { $failures.Add('MAXXED_ALLOWED_SIGNERS_JSON is invalid JSON.') } }

if ($adb) {
    $devices = @(& adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\sdevice$' })
    if ($DeviceSerial) { $devices = @($devices | Where-Object { $_ -match "^$([regex]::Escape($DeviceSerial))\s" }) }
    if ($devices.Count -eq 1) { Write-Host "[PASS] Authorized Android device: $($devices[0])" -ForegroundColor Green } else { $failures.Add('Expected exactly one selected authorized Android device.'); Write-Host "[FAIL] Authorized selected devices: $($devices.Count)" -ForegroundColor Red }
}

$manifests = @(Get-ChildItem (Join-Path $PSScriptRoot '..\script-packs') -Filter manifest.json -Recurse)
if ($manifests.Count -eq 6) { Write-Host '[PASS] Six app runner manifests found.' -ForegroundColor Green } else { $failures.Add("Expected 6 manifests; found $($manifests.Count).") }
foreach ($file in $manifests) { try { $manifest = Get-Content -Raw $file.FullName | ConvertFrom-Json; $entry = Join-Path $file.DirectoryName $manifest.entrypoint; if (-not (Test-Path $entry)) { throw "Missing entrypoint $entry" } } catch { $failures.Add($_.Exception.Message) } }

if ($BaseUrl) { try { $response = Invoke-WebRequest -Method GET -Uri $BaseUrl -SkipHttpErrorCheck -TimeoutSec 15; if ($response.StatusCode -in @(200,403)) { Write-Host "[PASS] Admin host reachable ($($response.StatusCode))." -ForegroundColor Green } else { $failures.Add("Admin host returned $($response.StatusCode).") } } catch { $failures.Add("Admin host unreachable: $($_.Exception.Message)") } }

if ($failures.Count) { Write-Host "`nRunner setup failed:" -ForegroundColor Red; $failures | ForEach-Object { Write-Host "- $_" }; exit 1 }
Write-Host "`nRunner setup is ready." -ForegroundColor Green
