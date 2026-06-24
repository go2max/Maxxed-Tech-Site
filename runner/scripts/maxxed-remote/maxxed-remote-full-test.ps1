[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path $_ -PathType Leaf })]
    [string]$ApkPath,

    [string]$DeviceSerial,

    [ValidatePattern('^(?:\d{1,3}\.){3}\d{1,3}$')]
    [string]$TvIp,

    [ValidateSet('Auto', 'SamsungTizen', 'LgWebOs', 'Roku', 'VizioSmartCast', 'AndroidTv', 'FireTv', 'HisenseVidaa')]
    [string]$TvPlatform = 'Auto',

    [string]$TvMacAddress,

    [switch]$HardwareObserved,
    [switch]$KeepInstalled,
    [switch]$SkipInstall,

    [string]$OutputDirectory = (Join-Path (Get-Location).Path ("maxxed-remote-test-" + (Get-Date -Format 'yyyyMMdd-HHmmss')))
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$PackageId = 'com.maxxedtechnicalsystems.maxxedremote'
$LaunchComponent = "$PackageId/.MainActivity"
$script:Results = [System.Collections.Generic.List[object]]::new()
$script:AdbPrefix = @()
$script:EvidenceIndex = 0
$sha256 = $null
$apkBytes = $null

function Add-Result {
    param(
        [string]$Id,
        [ValidateSet('pass', 'fail', 'blocked', 'manual-review', 'skipped')]
        [string]$Status,
        [string]$Message,
        [hashtable]$Details = @{}
    )

    $script:Results.Add([ordered]@{
        id = $Id
        status = $Status
        message = $Message
        details = $Details
        completedAt = (Get-Date).ToUniversalTime().ToString('o')
    })
    $color = switch ($Status) {
        'pass' { 'Green' }
        'fail' { 'Red' }
        'blocked' { 'Yellow' }
        'manual-review' { 'Cyan' }
        default { 'Gray' }
    }
    Write-Host ("[{0}] {1}: {2}" -f $Status.ToUpperInvariant(), $Id, $Message) -ForegroundColor $color
}

function Invoke-Adb {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments,
        [switch]$AllowFailure
    )

    $allArguments = @($script:AdbPrefix) + $Arguments
    $output = & adb @allArguments 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0 -and -not $AllowFailure) {
        throw "adb $($Arguments -join ' ') failed: $output"
    }
    return $output.Trim()
}

function Save-Screenshot {
    param([string]$Name)

    $script:EvidenceIndex++
    $safeName = $Name -replace '[^A-Za-z0-9_.-]', '-'
    $path = Join-Path $OutputDirectory ("{0:D2}-{1}.png" -f $script:EvidenceIndex, $safeName)
    $remotePath = "/sdcard/maxxed-test-$($script:EvidenceIndex).png"
    Invoke-Adb shell screencap -p $remotePath | Out-Null
    $allArguments = @($script:AdbPrefix) + @('pull', $remotePath, $path)
    & adb @allArguments | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not capture screenshot $Name" }
    Invoke-Adb shell rm $remotePath -AllowFailure | Out-Null
    return $path
}

function Get-UiXml {
    Invoke-Adb shell uiautomator dump /sdcard/maxxed-window.xml | Out-Null
    $raw = Invoke-Adb exec-out cat /sdcard/maxxed-window.xml
    return [xml]$raw
}

function Find-UiNode {
    param([string]$ResourceId)

    $xml = Get-UiXml
    return @($xml.SelectNodes("//node[@resource-id='${PackageId}:id/$ResourceId']")) | Select-Object -First 1
}

function Reset-UiScroll {
    for ($i = 0; $i -lt 4; $i++) {
        Invoke-Adb shell input swipe 500 650 500 1650 180 | Out-Null
    }
    Start-Sleep -Milliseconds 250
}

function Invoke-UiClick {
    param(
        [string]$ResourceId,
        [int]$ScrollAttempts = 4,
        [switch]$Optional
    )

    for ($attempt = 0; $attempt -le $ScrollAttempts; $attempt++) {
        $node = Find-UiNode $ResourceId
        if ($null -ne $node) {
            $match = [regex]::Match($node.bounds, '^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$')
            if (-not $match.Success) { throw "Invalid bounds for $ResourceId: $($node.bounds)" }
            $x = ([int]$match.Groups[1].Value + [int]$match.Groups[3].Value) / 2
            $y = ([int]$match.Groups[2].Value + [int]$match.Groups[4].Value) / 2
            Invoke-Adb shell input tap ([int]$x) ([int]$y) | Out-Null
            Start-Sleep -Milliseconds 350
            return $true
        }
        if ($attempt -lt $ScrollAttempts) {
            Invoke-Adb shell input swipe 500 1550 500 550 250 | Out-Null
            Start-Sleep -Milliseconds 250
        }
    }

    if ($Optional) { return $false }
    throw "Visible control not found: $ResourceId"
}

function Set-UiText {
    param([string]$ResourceId, [string]$Value)

    if (-not (Invoke-UiClick $ResourceId)) { throw "Could not focus $ResourceId" }
    Invoke-Adb shell input keyevent KEYCODE_MOVE_END | Out-Null
    Invoke-Adb shell input keyevent --longpress KEYCODE_DEL | Out-Null
    $escaped = $Value.Replace(' ', '%s')
    Invoke-Adb shell input text $escaped | Out-Null
}

function Assert-AppAlive {
    param([string]$Step)

    $pid = Invoke-Adb shell pidof $PackageId -AllowFailure
    if ([string]::IsNullOrWhiteSpace($pid)) {
        Add-Result $Step 'fail' 'The app process exited.'
        throw "Maxxed Remote crashed during $Step"
    }
}

function Invoke-ControlSet {
    param([string]$Name, [string[]]$Ids)

    $missing = [System.Collections.Generic.List[string]]::new()
    foreach ($id in $Ids) {
        try {
            if (-not (Invoke-UiClick $id -Optional)) { $missing.Add($id) }
            Assert-AppAlive "$Name-$id"
        } catch {
            $missing.Add($id)
        }
    }

    if ($missing.Count -eq 0) {
        Add-Result $Name 'pass' "All $($Ids.Count) controls were visible, clickable, and left the app running."
    } else {
        Add-Result $Name 'fail' 'One or more expected controls could not be exercised.' @{ missing = @($missing) }
    }
}

function Invoke-StateDependentControl {
    param(
        [string]$ResourceId,
        [string]$ReasonWhenUnavailable,
        [switch]$CloseAfter
    )

    $node = Find-UiNode $ResourceId
    if ($null -eq $node -or $node.enabled -ne 'true') {
        Add-Result "control-$ResourceId" 'skipped' $ReasonWhenUnavailable
        return $false
    }
    Invoke-UiClick $ResourceId | Out-Null
    Assert-AppAlive "control-$ResourceId"
    Add-Result "control-$ResourceId" 'pass' 'Control was visible, enabled, and exercised.'
    if ($CloseAfter) {
        if (Find-UiNode 'editorCancelButton') {
            Invoke-UiClick 'editorCancelButton' | Out-Null
            Add-Result 'control-editorCancelButton' 'pass' 'Editor Cancel was visible, enabled, and exercised.'
        } else {
            Invoke-Adb shell input keyevent KEYCODE_BACK | Out-Null
        }
        Start-Sleep -Milliseconds 300
    }
    return $true
}

$startedAt = (Get-Date).ToUniversalTime()
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$resolvedApk = (Resolve-Path $ApkPath).Path

try {
    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
        throw 'adb was not found. Install Android SDK Platform Tools and add adb to PATH.'
    }
    if ($DeviceSerial) { $script:AdbPrefix = @('-s', $DeviceSerial) }

    $deviceState = Invoke-Adb get-state
    if ($deviceState -ne 'device') { throw "Android target is not ready: $deviceState" }
    Add-Result 'device-ready' 'pass' 'ADB target is connected and authorized.' @{ serial = (Invoke-Adb get-serialno) }

    $sha256 = (Get-FileHash -Algorithm SHA256 -Path $resolvedApk).Hash.ToLowerInvariant()
    $apkBytes = (Get-Item $resolvedApk).Length
    Add-Result 'artifact-hash' 'pass' 'APK hash calculated.' @{ sha256 = $sha256; bytes = $apkBytes }

    $apkanalyzer = Get-Command apkanalyzer -ErrorAction SilentlyContinue
    if ($apkanalyzer) {
        $manifestInfo = & $apkanalyzer.Source manifest application-id $resolvedApk 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0 -or $manifestInfo.Trim() -ne $PackageId) {
            throw "APK package mismatch. Expected $PackageId; received $($manifestInfo.Trim())."
        }
        Add-Result 'artifact-package' 'pass' 'APK package ID matches Maxxed Remote.' @{ packageId = $PackageId }
    } else {
        Add-Result 'artifact-package' 'manual-review' 'apkanalyzer is unavailable; package ID will be verified after installation.'
    }

    if (-not $SkipInstall) {
        $installOutput = Invoke-Adb install -r -t $resolvedApk
        if ($installOutput -notmatch 'Success') { throw "APK install did not report success: $installOutput" }
        Add-Result 'install' 'pass' 'APK installed successfully.'
    } else {
        Add-Result 'install' 'skipped' 'Install was skipped by operator request.'
    }

    $installedPath = Invoke-Adb shell pm path $PackageId -AllowFailure
    if ($installedPath -notmatch '^package:') { throw "Expected package $PackageId is not installed." }
    Add-Result 'installed-package' 'pass' 'Expected Maxxed Remote package is installed.'

    Invoke-Adb logcat -c | Out-Null
    Invoke-Adb shell am force-stop $PackageId | Out-Null
    Invoke-Adb shell am start -W -n $LaunchComponent | Out-Null
    Start-Sleep -Seconds 2
    Assert-AppAlive 'launch'
    Save-Screenshot 'launch' | Out-Null
    Add-Result 'launch' 'pass' 'MainActivity launched and remained alive.'

    Invoke-ControlSet 'help-action' @('helpButton')
    Invoke-Adb shell input keyevent KEYCODE_BACK | Out-Null
    Invoke-ControlSet 'theme-action' @('themeButton')
    Invoke-Adb shell input keyevent KEYCODE_BACK | Out-Null

    Reset-UiScroll
    Invoke-ControlSet 'tabs' @('remoteTabButton', 'mediaTabButton', 'appsTabButton', 'moreTabButton', 'remoteTabButton')
    Reset-UiScroll
    Invoke-UiClick 'remoteTabButton' | Out-Null
    Invoke-ControlSet 'remote-buttons' @(
        'powerOffButton', 'powerOnButton', 'homeButton', 'backButton', 'sourceButton',
        'upButton', 'leftButton', 'okButton', 'rightButton', 'downButton',
        'muteButton', 'volumeUpButton', 'volumeDownButton', 'channelUpButton', 'channelDownButton'
    )

    Reset-UiScroll
    Invoke-UiClick 'mediaTabButton' | Out-Null
    Invoke-ControlSet 'media-buttons' @(
        'rewindButton', 'playPauseButton', 'fastForwardButton', 'menuButton',
        'guideButton', 'infoButton', 'exitButton', 'textInputButton'
    )
    Invoke-Adb shell input keyevent KEYCODE_BACK | Out-Null

    Reset-UiScroll
    Invoke-UiClick 'appsTabButton' | Out-Null
    Invoke-ControlSet 'apps-actions' @('refreshAppsButton', 'restoreHiddenButton', 'addCustomAppButton')
    Invoke-Adb shell input keyevent KEYCODE_BACK | Out-Null
    Invoke-StateDependentControl 'allServicesHeader' 'The All Services group was unavailable.' | Out-Null
    foreach ($id in @('launchServiceButton', 'favoriteServiceButton', 'moveUpButton', 'moveDownButton', 'editCustomButton', 'hideServiceButton')) {
        Invoke-StateDependentControl $id 'No compatible visible service tile exposed this state-dependent control.' -CloseAfter:($id -eq 'editCustomButton') | Out-Null
    }
    Invoke-StateDependentControl 'restoreHiddenButton' 'Restore is disabled because no service is hidden.' | Out-Null

    Reset-UiScroll
    Invoke-UiClick 'moreTabButton' | Out-Null
    Invoke-ControlSet 'number-pad' @(
        'digit0Button', 'digit1Button', 'digit2Button', 'digit3Button', 'digit4Button',
        'digit5Button', 'digit6Button', 'digit7Button', 'digit8Button', 'digit9Button',
        'redButton', 'greenButton', 'yellowButton', 'blueButton', 'stopButton'
    )

    Reset-UiScroll
    Invoke-UiClick 'moreTabButton' | Out-Null
    Invoke-StateDependentControl 'savedTvsSection' 'Saved TVs section was unavailable.' | Out-Null
    foreach ($item in @(
        @{ id = 'addDeviceButton'; close = $true; reason = 'Add TV was unavailable.' },
        @{ id = 'editDeviceButton'; close = $true; reason = 'No selected saved TV is available to edit.' },
        @{ id = 'renameDeviceButton'; close = $true; reason = 'No selected saved TV is available to rename.' },
        @{ id = 'deleteDeviceButton'; close = $true; reason = 'No selected saved TV is available to delete.' },
        @{ id = 'exportButton'; close = $true; reason = 'Export was unavailable.' },
        @{ id = 'importButton'; close = $true; reason = 'Import was unavailable.' }
    )) {
        Invoke-StateDependentControl $item.id $item.reason -CloseAfter:$item.close | Out-Null
    }
    Reset-UiScroll
    Invoke-UiClick 'moreTabButton' | Out-Null
    Invoke-StateDependentControl 'connectionSection' 'Connection settings section was unavailable.' | Out-Null
    foreach ($id in @('themeSystemButton', 'themeLightButton', 'themeDarkButton')) {
        Invoke-StateDependentControl $id 'Theme choice was unavailable.' | Out-Null
    }

    Reset-UiScroll
    Invoke-UiClick 'scanButton' | Out-Null
    Start-Sleep -Seconds 1
    if (Find-UiNode 'cancelScanButton') {
        Invoke-StateDependentControl 'rescanButton' 'Rescan is unavailable while discovery is already running.' | Out-Null
        Invoke-StateDependentControl 'manualAddButton' 'Manual Add was unavailable.' -CloseAfter | Out-Null
        foreach ($id in @('discoveredAddButton', 'discoveredSelectButton')) {
            Invoke-StateDependentControl $id 'No TV was discovered, so the discovery-result action is not applicable.' -CloseAfter:($id -eq 'discoveredAddButton') | Out-Null
        }
        if (Find-UiNode 'cancelScanButton') {
            Invoke-UiClick 'cancelScanButton' | Out-Null
            Add-Result 'discovery-ui' 'pass' 'Discovery sheet opened and cancellation was exercised.'
        } else {
            Add-Result 'discovery-ui' 'pass' 'Discovery sheet opened and a discovered TV selection closed it.'
        }
    } else {
        $permissionXml = Get-UiXml
        if ($permissionXml.OuterXml -match 'permission') {
            Add-Result 'discovery-ui' 'manual-review' 'Android displayed the Nearby Wi-Fi permission prompt; operator choice is required.'
            Invoke-Adb shell input keyevent KEYCODE_BACK | Out-Null
        } else {
            Add-Result 'discovery-ui' 'fail' 'Discovery controls did not become available.'
        }
    }

    if ($TvIp) {
        Reset-UiScroll
        Invoke-UiClick 'moreTabButton' | Out-Null
        Invoke-UiClick 'savedTvsSection' -Optional | Out-Null
        if (-not (Invoke-UiClick 'addDeviceButton' -Optional)) {
            throw 'Saved TVs section could not be opened for the hardware test.'
        }
        Set-UiText 'nicknameInput' 'Admin Test TV'
        Set-UiText 'ipInput' $TvIp
        if ($TvMacAddress) { Set-UiText 'macInput' $TvMacAddress }
        Invoke-UiClick 'editorSaveButton' | Out-Null
        Start-Sleep -Seconds 1
        Invoke-UiClick 'connectButton' | Out-Null
        Start-Sleep -Seconds 5
        Save-Screenshot 'connection-attempt' | Out-Null
        Assert-AppAlive 'connection-attempt'

        if ($HardwareObserved) {
            Add-Result 'physical-tv-connection' 'pass' 'Operator confirmed the real TV pairing/connection behavior.' @{ ip = $TvIp; platform = $TvPlatform }
            Invoke-UiClick 'remoteTabButton' | Out-Null
            Invoke-ControlSet 'physical-tv-commands' @('homeButton', 'upButton', 'okButton', 'backButton', 'volumeUpButton', 'volumeDownButton')
        } else {
            Add-Result 'physical-tv-connection' 'manual-review' 'Connection was attempted. Confirm pairing, on-screen TV response, reconnect, power, and streaming launch on the real television.' @{ ip = $TvIp; platform = $TvPlatform }
        }
    } else {
        Add-Result 'physical-tv-connection' 'blocked' 'No TV IP was supplied. Real pairing, command delivery, wake/power, reconnect, and streaming launch were not claimed.'
    }

    Save-Screenshot 'final-state' | Out-Null
} catch {
    Add-Result 'runner-error' 'fail' $_.Exception.Message
} finally {
    try {
        Invoke-Adb logcat -d | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'logcat.txt')
        Invoke-Adb shell dumpsys meminfo $PackageId -AllowFailure | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'meminfo.txt')
        Invoke-Adb shell dumpsys package $PackageId -AllowFailure | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'package.txt')
    } catch {
        Add-Result 'evidence-collection' 'fail' $_.Exception.Message
    }

    if (-not $KeepInstalled -and -not $SkipInstall) {
        try { Invoke-Adb uninstall $PackageId -AllowFailure | Out-Null } catch { }
    }

    $statuses = @($script:Results | ForEach-Object { $_.status })
    $overall = if ($statuses -contains 'fail') {
        'fail'
    } elseif ($statuses -contains 'blocked') {
        'blocked'
    } elseif ($statuses -contains 'manual-review') {
        'manual-review'
    } else {
        'pass'
    }

    $report = [ordered]@{
        schemaVersion = 1
        scriptId = 'maxxed-remote-full-ux-connection'
        product = 'maxxed-remote'
        packageId = $PackageId
        startedAt = $startedAt.ToString('o')
        finishedAt = (Get-Date).ToUniversalTime().ToString('o')
        overallStatus = $overall
        apk = @{ path = $resolvedApk; sha256 = $sha256; bytes = $apkBytes }
        target = @{ serial = $DeviceSerial; tvIpSupplied = [bool]$TvIp; tvPlatform = $TvPlatform }
        results = @($script:Results)
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'result.json')
    Write-Host "Report: $(Join-Path $OutputDirectory 'result.json')"

    if ($overall -eq 'fail') { exit 1 }
    if ($overall -in @('blocked', 'manual-review')) { exit 2 }
    exit 0
}
