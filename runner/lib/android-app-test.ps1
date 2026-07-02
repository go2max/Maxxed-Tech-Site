[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ApkPath,
    [Parameter(Mandatory = $true)][string]$Product,
    [Parameter(Mandatory = $true)][string]$PackageId,
    [Parameter(Mandatory = $true)][string]$ScriptId,
    [Parameter(Mandatory = $true)][string]$TestId,
    [string[]]$ExpectedLabels = @(),
    [string[]]$ManualChecks = @(),
    [string]$DeviceSerial,
    [switch]$KeepInstalled,
    [switch]$SkipInstall,
    [ValidateRange(0, 1000)][int]$MonkeyEvents = 80,
    [string]$OutputDirectory = (Join-Path $PWD ("$Product-test-" + (Get-Date -Format 'yyyyMMdd-HHmmss')))
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:Results = [System.Collections.Generic.List[object]]::new()
$script:AdbPrefix = @()
$script:EvidenceIndex = 0
$script:OriginalPermissionStates = @{}
$sha256 = $null
$apkBytes = $null
$originalAutoRotation = $null
$originalUserRotation = $null
$startedAt = (Get-Date).ToUniversalTime()

function Add-Result {
    param([string]$Id, [ValidateSet('pass', 'fail', 'blocked', 'manual-review', 'skipped')][string]$Status, [string]$Message, [hashtable]$Details = @{})
    $script:Results.Add([ordered]@{ id = $Id; status = $Status; message = $Message; details = $Details; completedAt = (Get-Date).ToUniversalTime().ToString('o') })
    Write-Host ("[{0}] {1}: {2}" -f $Status.ToUpperInvariant(), $Id, $Message)
}

function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments, [switch]$AllowFailure)
    $allArguments = @($script:AdbPrefix) + $Arguments
    $output = & adb @allArguments 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0 -and -not $AllowFailure) { throw "adb $($Arguments -join ' ') failed: $output" }
    return $output.Trim()
}

function Assert-AppAlive {
    param([string]$Step)
    $pid = Invoke-Adb shell pidof $PackageId -AllowFailure
    if ([string]::IsNullOrWhiteSpace($pid)) { throw "The app process exited during $Step." }
}

function Save-Screenshot {
    param([string]$Name)
    $script:EvidenceIndex++
    $safeName = $Name -replace '[^A-Za-z0-9_.-]', '-'
    $path = Join-Path $OutputDirectory ("{0:D2}-{1}.png" -f $script:EvidenceIndex, $safeName)
    $remote = "/sdcard/maxxed-admin-$($script:EvidenceIndex).png"
    Invoke-Adb shell screencap -p $remote | Out-Null
    $pullArguments = @($script:AdbPrefix) + @('pull', $remote, $path)
    & adb @pullArguments | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not capture screenshot $Name." }
    Invoke-Adb shell rm $remote -AllowFailure | Out-Null
    return $path
}

function Get-UiDump {
    Invoke-Adb shell uiautomator dump /sdcard/maxxed-admin-window.xml -AllowFailure | Out-Null
    return Invoke-Adb exec-out cat /sdcard/maxxed-admin-window.xml -AllowFailure
}

function Test-CrashLog {
    $log = Invoke-Adb logcat -d -v brief -AllowFailure
    $log | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'logcat.txt')
    $escapedPackage = [regex]::Escape($PackageId)
    $fatal = @($log -split "`n" | Where-Object { $_ -match 'FATAL EXCEPTION|ANR in|Fatal signal' -and ($_ -match $escapedPackage -or $_ -match 'Unity') })
    if ($fatal.Count -gt 0) {
        Add-Result 'crash-scan' 'fail' 'Crash or ANR evidence was found in logcat.' @{ matches = $fatal }
    } else {
        Add-Result 'crash-scan' 'pass' 'No app crash or ANR signature was found in logcat.'
    }
}

function Test-ExpectedLabels {
    if ($ExpectedLabels.Count -eq 0) { return }
    $dump = Get-UiDump
    if ([string]::IsNullOrWhiteSpace($dump)) {
        Add-Result 'screen-contract' 'manual-review' 'The UI hierarchy was unavailable; review the screenshot manually.'
        return
    }
    $found = @($ExpectedLabels | Where-Object { $dump -match [regex]::Escape($_) })
    if ($found.Count -gt 0) {
        Add-Result 'screen-contract' 'pass' 'The expected app UI was visible.' @{ found = $found; expected = $ExpectedLabels }
    } else {
        Add-Result 'screen-contract' 'manual-review' 'Expected text was not exposed through UI Automator. This is normal for some camera and Unity surfaces; inspect the screenshot.' @{ expected = $ExpectedLabels }
    }
}

function Test-PermissionStates {
    $packageDump = Invoke-Adb shell dumpsys package $PackageId -AllowFailure
    $declared = @('android.permission.CAMERA', 'android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION') | Where-Object { $packageDump -match [regex]::Escape($_) }
    if ($declared.Count -eq 0) {
        Add-Result 'permission-states' 'skipped' 'No camera or location runtime permission was declared for this profile.'
        return
    }
    foreach ($permission in $declared) {
        $script:OriginalPermissionStates[$permission] = Invoke-Adb shell pm check-permission $PackageId $permission -AllowFailure
        Invoke-Adb shell pm revoke $PackageId $permission -AllowFailure | Out-Null
    }
    Invoke-Adb shell am force-stop $PackageId | Out-Null
    Invoke-Adb shell monkey -p $PackageId -c android.intent.category.LAUNCHER 1 | Out-Null
    Start-Sleep -Seconds 1
    Assert-AppAlive 'permission-denied launch'
    Save-Screenshot 'permission-denied' | Out-Null
    foreach ($permission in $declared) {
        Invoke-Adb shell pm grant $PackageId $permission -AllowFailure | Out-Null
    }
    Add-Result 'permission-states' 'pass' 'The app remained alive with relevant permissions denied; grant commands were then applied for subsequent checks.' @{ permissions = $declared }
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$resolvedApk = $null

try {
    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) { throw 'adb was not found. Install Android SDK Platform Tools and add adb to PATH.' }
    if (-not (Test-Path $ApkPath -PathType Leaf)) { throw "APK not found: $ApkPath" }
    $resolvedApk = (Resolve-Path $ApkPath).Path
    if ($DeviceSerial) { $script:AdbPrefix = @('-s', $DeviceSerial) }
    if ((Invoke-Adb get-state) -ne 'device') { throw 'The selected Android target is not connected and authorized.' }
    $originalAutoRotation = Invoke-Adb shell settings get system accelerometer_rotation -AllowFailure
    $originalUserRotation = Invoke-Adb shell settings get system user_rotation -AllowFailure
    Add-Result 'device-ready' 'pass' 'ADB target is connected and authorized.' @{ serial = (Invoke-Adb get-serialno) }

    $sha256 = (Get-FileHash -Algorithm SHA256 -Path $resolvedApk).Hash.ToLowerInvariant()
    $apkBytes = (Get-Item $resolvedApk).Length
    Add-Result 'artifact-hash' 'pass' 'APK SHA-256 was calculated.' @{ sha256 = $sha256; bytes = $apkBytes }

    $apkanalyzer = Get-Command apkanalyzer -ErrorAction SilentlyContinue
    if ($apkanalyzer) {
        $actualPackage = (& $apkanalyzer.Source manifest application-id $resolvedApk 2>&1 | Out-String).Trim()
        if ($LASTEXITCODE -ne 0 -or $actualPackage -ne $PackageId) { throw "APK package mismatch. Expected $PackageId; received $actualPackage." }
        $apkMetadata = [ordered]@{
            packageId = $actualPackage
            versionName = (& $apkanalyzer.Source manifest version-name $resolvedApk 2>&1 | Out-String).Trim()
            versionCode = (& $apkanalyzer.Source manifest version-code $resolvedApk 2>&1 | Out-String).Trim()
            minSdk = (& $apkanalyzer.Source manifest min-sdk $resolvedApk 2>&1 | Out-String).Trim()
            targetSdk = (& $apkanalyzer.Source manifest target-sdk $resolvedApk 2>&1 | Out-String).Trim()
        }
        Add-Result 'artifact-package' 'pass' 'APK package and version metadata match the selected app.' $apkMetadata
    } else {
        Add-Result 'artifact-package' 'manual-review' 'apkanalyzer is unavailable; installed-package verification will still run.'
    }

    $apksigner = Get-Command apksigner -ErrorAction SilentlyContinue
    if ($apksigner) {
        $signerOutput = & $apksigner.Source verify --print-certs $resolvedApk 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { throw "APK signature verification failed: $signerOutput" }
        $signerOutput | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'signer.txt')
        $certificate = ([regex]::Match($signerOutput, 'Signer #1 certificate SHA-256 digest:\s*([^\r\n]+)')).Groups[1].Value.Trim().ToLowerInvariant()
        $allowedSigners = @()
        if ($env:MAXXED_ALLOWED_SIGNERS_JSON) {
            try {
                $signerConfig = $env:MAXXED_ALLOWED_SIGNERS_JSON | ConvertFrom-Json
                $allowedSigners = @($signerConfig.$Product | ForEach-Object { ([string]$_).ToLowerInvariant() })
            } catch { throw 'MAXXED_ALLOWED_SIGNERS_JSON is not valid JSON.' }
        }
        if ($allowedSigners.Count -eq 0) {
            Add-Result 'artifact-signer' 'manual-review' 'APK signature is valid, but no approved signer allowlist is configured for this app.' @{ certificateSha256 = $certificate }
        } elseif ($allowedSigners -notcontains $certificate) {
            throw "APK signer $certificate is not approved for $Product."
        } else {
            Add-Result 'artifact-signer' 'pass' 'APK signature and signer identity are approved.' @{ certificateSha256 = $certificate }
        }
    } else {
        Add-Result 'artifact-signer' 'manual-review' 'apksigner is unavailable; signer identity could not be verified before installation.'
    }

    if (-not $SkipInstall) {
        $install = Invoke-Adb install -r -t $resolvedApk
        if ($install -notmatch 'Success') { throw "APK installation did not report success: $install" }
        Add-Result 'install' 'pass' 'APK installed successfully.'
    } else { Add-Result 'install' 'skipped' 'Install was skipped by operator request.' }

    if ((Invoke-Adb shell pm path $PackageId -AllowFailure) -notmatch '^package:') { throw "Expected package $PackageId is not installed." }
    Invoke-Adb logcat -c | Out-Null
    Invoke-Adb shell am force-stop $PackageId | Out-Null
    Invoke-Adb shell monkey -p $PackageId -c android.intent.category.LAUNCHER 1 | Out-Null
    Start-Sleep -Seconds 2
    Assert-AppAlive 'launch'
    Save-Screenshot 'launch' | Out-Null
    Add-Result 'launch' 'pass' 'The launcher activity opened and remained alive.'
    Test-ExpectedLabels

    if ($TestId -notmatch 'launch$') {
        Test-PermissionStates
        Invoke-Adb shell input keyevent KEYCODE_HOME | Out-Null
        Start-Sleep -Milliseconds 600
        Invoke-Adb shell monkey -p $PackageId -c android.intent.category.LAUNCHER 1 | Out-Null
        Start-Sleep -Seconds 1
        Assert-AppAlive 'background and reopen'
        Add-Result 'background-reopen' 'pass' 'The app returned from the background and remained alive.'

        Invoke-Adb shell settings put system accelerometer_rotation 0 -AllowFailure | Out-Null
        Invoke-Adb shell settings put system user_rotation 1 -AllowFailure | Out-Null
        Start-Sleep -Milliseconds 700
        Invoke-Adb shell settings put system user_rotation 0 -AllowFailure | Out-Null
        Assert-AppAlive 'rotation'
        Add-Result 'rotation' 'pass' 'The app remained alive across a controlled orientation change.'

        if ($MonkeyEvents -gt 0 -and $TestId -notmatch 'physical') {
            $monkey = Invoke-Adb shell monkey -p $PackageId --throttle 80 --pct-syskeys 0 --pct-appswitch 0 $MonkeyEvents -AllowFailure
            Start-Sleep -Seconds 1
            Assert-AppAlive 'controlled robustness test'
            Add-Result 'controlled-robustness' 'pass' 'Controlled input events completed without terminating the app.' @{ events = $MonkeyEvents; output = $monkey }
        }
    }

    Save-Screenshot 'final-state' | Out-Null
    if ($ManualChecks.Count -gt 0 -and ($TestId -match 'physical' -or $TestId -match 'full')) {
        Add-Result 'physical-acceptance' 'manual-review' 'Complete the listed checks on real hardware before release approval.' @{ checks = $ManualChecks }
    }
    Test-CrashLog
} catch {
    Add-Result 'runner-error' 'fail' $_.Exception.Message
} finally {
    try {
        if ($originalAutoRotation -match '^[01]$') { Invoke-Adb shell settings put system accelerometer_rotation $originalAutoRotation -AllowFailure | Out-Null }
        if ($originalUserRotation -match '^[0-3]$') { Invoke-Adb shell settings put system user_rotation $originalUserRotation -AllowFailure | Out-Null }
        foreach ($permission in $script:OriginalPermissionStates.Keys) {
            if ($script:OriginalPermissionStates[$permission] -match 'granted') {
                Invoke-Adb shell pm grant $PackageId $permission -AllowFailure | Out-Null
            } else {
                Invoke-Adb shell pm revoke $PackageId $permission -AllowFailure | Out-Null
            }
        }
    } catch { Add-Result 'device-state-restore' 'fail' $_.Exception.Message }
    try {
        Invoke-Adb shell dumpsys meminfo $PackageId -AllowFailure | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'meminfo.txt')
        Invoke-Adb shell dumpsys package $PackageId -AllowFailure | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'package.txt')
    } catch { Add-Result 'evidence-collection' 'fail' $_.Exception.Message }
    if (-not $KeepInstalled -and -not $SkipInstall) { try { Invoke-Adb uninstall $PackageId -AllowFailure | Out-Null } catch {} }
    $statuses = @($script:Results | ForEach-Object { $_.status })
    $overall = if ($statuses -contains 'fail') { 'fail' } elseif ($statuses -contains 'blocked') { 'blocked' } elseif ($statuses -contains 'manual-review') { 'manual-review' } else { 'pass' }
    [ordered]@{
        schemaVersion = 1; scriptId = $ScriptId; testId = $TestId; product = $Product; packageId = $PackageId
        startedAt = $startedAt.ToString('o'); finishedAt = (Get-Date).ToUniversalTime().ToString('o'); overallStatus = $overall
        apk = @{ path = $resolvedApk; sha256 = $sha256; bytes = $apkBytes }; target = @{ serial = $DeviceSerial }; results = @($script:Results)
    } | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'result.json')
    Write-Host "Report: $(Join-Path $OutputDirectory 'result.json')"
    if ($overall -eq 'fail') { exit 1 }
    if ($overall -in @('blocked', 'manual-review')) { exit 2 }
    exit 0
}
