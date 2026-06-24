[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ApkPath,
    [Parameter(Mandatory = $true)][string]$PackageId,
    [Parameter(Mandatory = $true)][string]$DeviceSerial,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [ValidateSet("Launch", "Inventory")][string]$Mode = "Launch"
)

$ErrorActionPreference = "Stop"
$adb = (Get-Command adb -ErrorAction Stop).Source
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    $output = & $adb -s $DeviceSerial @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "adb_failed: $($output -join ' ')"
    }
    return $output
}

$state = (Invoke-Adb get-state | Select-Object -Last 1).Trim()
if ($state -ne "device") {
    throw "android_device_not_ready"
}

$install = Invoke-Adb install -r $ApkPath
if (($install -join " ") -notmatch "Success") {
    throw "apk_install_failed"
}

Invoke-Adb logcat -c | Out-Null
Invoke-Adb shell am force-stop $PackageId | Out-Null
$launch = Invoke-Adb shell monkey -p $PackageId -c android.intent.category.LAUNCHER 1
Start-Sleep -Seconds 3

$pidText = (Invoke-Adb shell pidof $PackageId | Select-Object -Last 1).Trim()
if (-not $pidText) {
    throw "app_process_not_running"
}

$logcat = Invoke-Adb logcat -d -v threadtime
$logcat | Set-Content -Path (Join-Path $OutputDirectory "logcat.txt") -Encoding utf8
$crashPattern = "FATAL EXCEPTION|AndroidRuntime.*FATAL|Process: $([regex]::Escape($PackageId)).*has died"
if (($logcat -join [Environment]::NewLine) -match $crashPattern) {
    throw "app_crash_detected"
}

$remoteScreenshot = "/sdcard/maxxed-screen.png"
Invoke-Adb shell screencap -p $remoteScreenshot | Out-Null
$screenshotPath = Join-Path $OutputDirectory "screen.png"
Invoke-Adb pull $remoteScreenshot $screenshotPath | Out-Null

if ($Mode -eq "Inventory") {
    $remoteXml = "/sdcard/maxxed-window.xml"
    Invoke-Adb shell uiautomator dump $remoteXml | Out-Null
    $windowPath = Join-Path $OutputDirectory "window.xml"
    Invoke-Adb pull $remoteXml $windowPath | Out-Null
    [xml]$window = Get-Content -Raw -Path $windowPath
    $controls = @($window.SelectNodes("//node[@clickable='true' or @long-clickable='true']") | ForEach-Object {
        [ordered]@{
            text = $_.text
            description = $_.'content-desc'
            resourceId = $_.'resource-id'
            className = $_.class
            enabled = $_.enabled -eq "true"
            bounds = $_.bounds
        }
    })
    $unlabeled = @($controls | Where-Object {
        [string]::IsNullOrWhiteSpace($_.text) -and [string]::IsNullOrWhiteSpace($_.description)
    })
    [ordered]@{
        totalClickable = $controls.Count
        enabledClickable = @($controls | Where-Object { $_.enabled }).Count
        unlabeledClickable = $unlabeled.Count
        controls = $controls
    } | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $OutputDirectory "controls.json") -Encoding utf8
    if ($controls.Count -eq 0) {
        throw "no_clickable_controls_found"
    }
    if ($unlabeled.Count -gt 0) {
        throw "unlabeled_clickable_controls"
    }
}

[ordered]@{
    packageId = $PackageId
    deviceSerial = $DeviceSerial
    processId = $pidText
    mode = $Mode
    status = "pass"
} | ConvertTo-Json -Compress
