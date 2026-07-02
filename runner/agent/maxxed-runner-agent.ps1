[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$BaseUrl,
    [string]$RunnerId = ("runner-" + $env:COMPUTERNAME.ToLowerInvariant()),
    [string]$RunnerName = $env:COMPUTERNAME,
    [string]$DeviceSerial,
    [string]$RunnerToken = $env:MAXXED_RUNNER_TOKEN,
    [ValidateRange(2, 300)][int]$PollSeconds = 10,
    [string]$WorkDirectory = (Join-Path $env:LOCALAPPDATA 'MaxxedRunner'),
    [switch]$Once
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
$runnerRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

if ([string]::IsNullOrWhiteSpace($RunnerToken)) { throw 'Set MAXXED_RUNNER_TOKEN or pass -RunnerToken.' }
if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) { throw 'PowerShell 7 (pwsh) is required.' }
if (-not (Get-Command adb -ErrorAction SilentlyContinue)) { throw 'Android SDK Platform Tools (adb) are required.' }
New-Item -ItemType Directory -Force -Path $WorkDirectory | Out-Null

function Get-Headers { return @{ Authorization = "Bearer $RunnerToken" } }

function Invoke-JsonApi {
    param([string]$Method, [string]$Path, [object]$Body)
    $parameters = @{ Method=$Method; Uri="$BaseUrl$Path"; Headers=(Get-Headers); SkipHttpErrorCheck=$true }
    if ($null -ne $Body) { $parameters.ContentType='application/json'; $parameters.Body=($Body | ConvertTo-Json -Depth 12 -Compress) }
    $response = Invoke-WebRequest @parameters
    if ($response.StatusCode -eq 204) { return $null }
    $parsed = if ($response.Content) { $response.Content | ConvertFrom-Json } else { $null }
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "API $Method $Path failed ($($response.StatusCode)): $($response.Content)" }
    return $parsed
}

function Send-StepState {
    param([string]$JobId, [string]$StepId, [string]$State, [int]$ExitCode = -999, [object]$Result = $null)
    $body = @{ runnerId=$RunnerId; state=$State }
    if ($ExitCode -ne -999) { $body.exitCode = $ExitCode }
    if ($null -ne $Result) { $body.result = $Result }
    Invoke-JsonApi POST "/api/runner/jobs/$JobId/steps/$StepId" $body | Out-Null
}

function Send-Heartbeat {
    param([string]$JobId)
    Invoke-JsonApi POST '/api/runner/heartbeat' @{ runnerId=$RunnerId; jobId=$JobId } | Out-Null
}

function Send-Evidence {
    param([string]$JobId, [string]$StepId, [string]$Path)
    $extension = [IO.Path]::GetExtension($Path).ToLowerInvariant()
    $contentType = switch ($extension) { '.json' {'application/json'} '.png' {'image/png'} '.jpg' {'image/jpeg'} '.jpeg' {'image/jpeg'} '.txt' {'text/plain'} default {'application/octet-stream'} }
    $headers = Get-Headers
    $headers['x-runner-id'] = $RunnerId
    $headers['x-step-id'] = $StepId
    $headers['x-file-name'] = [IO.Path]::GetFileName($Path)
    $response = Invoke-WebRequest -Method PUT -Uri "$BaseUrl/api/runner/jobs/$JobId/evidence" -Headers $headers -ContentType $contentType -InFile $Path -SkipHttpErrorCheck
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "Evidence upload failed ($($response.StatusCode)): $($response.Content)" }
}

function Get-DeviceSerial {
    if ($DeviceSerial) { return $DeviceSerial }
    $devices = @(& adb devices | Select-Object -Skip 1 | ForEach-Object { if ($_ -match '^([^\s]+)\s+device$') { $Matches[1] } })
    if ($devices.Count -ne 1) { throw 'Connect exactly one authorized Android device or pass -DeviceSerial.' }
    return $devices[0]
}

function Get-Manifest {
    param([string]$AppId)
    $path = Join-Path $runnerRoot "script-packs\$AppId\manifest.json"
    if (-not (Test-Path $path -PathType Leaf)) { throw "No local runner manifest exists for $AppId." }
    $manifest = Get-Content -Raw $path | ConvertFrom-Json
    $entrypoint = (Resolve-Path (Join-Path (Split-Path $path) $manifest.entrypoint)).Path
    $packRoot = (Resolve-Path (Split-Path $path)).Path
    if (-not $entrypoint.StartsWith($packRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Runner entrypoint escaped its approved pack directory.' }
    return @{ Manifest=$manifest; Entrypoint=$entrypoint }
}

function Invoke-Job {
    param([object]$Job, [string]$Serial)
    $jobDirectory = Join-Path $WorkDirectory $Job.id
    New-Item -ItemType Directory -Force -Path $jobDirectory | Out-Null
    $apkPath = Join-Path $jobDirectory ([IO.Path]::GetFileName($Job.file_name))
    if (-not (Test-Path $apkPath -PathType Leaf) -or (Get-FileHash -Algorithm SHA256 $apkPath).Hash.ToLowerInvariant() -ne $Job.sha256) {
        $response = Invoke-WebRequest -Uri "$BaseUrl$($Job.artifactUrl)" -Headers (Get-Headers) -OutFile $apkPath -SkipHttpErrorCheck
        if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "APK download failed ($($response.StatusCode))." }
    }
    $actualHash = (Get-FileHash -Algorithm SHA256 $apkPath).Hash.ToLowerInvariant()
    if ($actualHash -ne $Job.sha256) { throw "Downloaded APK hash mismatch. Expected $($Job.sha256); received $actualHash." }
    $pack = Get-Manifest $Job.app_id
    $supported = @($pack.Manifest.supportedScriptIds)
    foreach ($step in @($Job.steps)) {
        if ($step.state -in @('passed','failed','blocked','manual-review','interrupted')) { continue }
        if ($supported -notcontains $step.script_id) { throw "Local manifest does not approve script $($step.script_id)." }
        Send-Heartbeat $Job.id
        Send-StepState $Job.id $step.id 'running'
        $stepDirectory = Join-Path $jobDirectory ("step-{0:D2}-{1}" -f ([int]$step.step_index + 1), $step.script_id)
        New-Item -ItemType Directory -Force -Path $stepDirectory | Out-Null
        Write-Host "Running $($Job.app_id) / $($step.script_id) on $Serial"
        $stdoutPath = Join-Path $stepDirectory 'runner-stdout.txt'
        $stderrPath = Join-Path $stepDirectory 'runner-stderr.txt'
        $process = Start-Process -FilePath pwsh -ArgumentList @('-NoProfile','-NonInteractive','-File',$pack.Entrypoint,'-ApkPath',$apkPath,'-TestId',$step.script_id,'-DeviceSerial',$Serial,'-OutputDirectory',$stepDirectory) -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
        $deadline = (Get-Date).ToUniversalTime().AddSeconds([int]$pack.Manifest.timeoutSeconds)
        $timedOut = $false
        while (-not $process.HasExited) {
            Start-Sleep -Seconds 30
            $process.Refresh()
            if (-not $process.HasExited -and (Get-Date).ToUniversalTime() -ge $deadline) {
                Stop-Process -Id $process.Id -Force
                $process.WaitForExit()
                $timedOut = $true
                break
            }
            if (-not $process.HasExited) { Send-Heartbeat $Job.id }
        }
        $exitCode = if ($timedOut) { 124 } else { $process.ExitCode }
        $resultPath = Join-Path $stepDirectory 'result.json'
        $result = if ($timedOut) { [pscustomobject]@{ overallStatus='fail'; message="Step exceeded the approved $($pack.Manifest.timeoutSeconds)-second timeout." } } elseif (Test-Path $resultPath) { Get-Content -Raw $resultPath | ConvertFrom-Json } else { [pscustomobject]@{ overallStatus = if ($exitCode -eq 0) {'pass'} elseif ($exitCode -eq 2) {'manual-review'} else {'fail'}; message='Runner did not produce result.json.' } }
        $reportRows = if ($result.PSObject.Properties.Name -contains 'results') { @($result.results) } else { @([pscustomobject]@{ id=$step.script_id; status=$result.overallStatus; message=$result.message }) }
        $preContent = "<h1>$($Job.app_id) / $($step.script_id)</h1><p>Job $($Job.id) on $Serial</p>"
        $reportRows | Select-Object id,status,message | ConvertTo-Html -Title "Maxxed test report" -PreContent $preContent | Set-Content -Encoding utf8 (Join-Path $stepDirectory 'report.html')
        $state = switch ($result.overallStatus) { 'pass' {'passed'} 'manual-review' {'manual-review'} 'blocked' {'blocked'} default {'failed'} }
        Send-StepState $Job.id $step.id $state $exitCode $result
        Get-ChildItem -Path $stepDirectory -File | ForEach-Object { Send-Evidence $Job.id $step.id $_.FullName }
        Send-Heartbeat $Job.id
        if ($state -ne 'passed') {
            foreach ($remaining in @($Job.steps | Where-Object { $_.step_index -gt $step.step_index -and $_.state -eq 'queued' })) {
                Send-StepState $Job.id $remaining.id 'blocked' 2 @{ reason="Stopped after required step $($step.script_id) returned $state." }
            }
            break
        }
    }
    return Invoke-JsonApi POST "/api/runner/jobs/$($Job.id)/complete" @{ runnerId=$RunnerId; summary='Sequential job finished; see step results and evidence.' }
}

$serial = Get-DeviceSerial
Write-Host "Maxxed runner $RunnerId using device $serial"
do {
    try {
        $lease = Invoke-JsonApi POST '/api/runner/lease' @{ runnerId=$RunnerId; runnerName=$RunnerName; deviceSerial=$serial }
        if ($null -ne $lease) {
            $completion = Invoke-Job $lease.job $serial
            Write-Host "Job $($lease.job.id) finished as $($completion.state)."
        } elseif (-not $Once) { Start-Sleep -Seconds $PollSeconds }
    } catch {
        Write-Error $_
        if (-not $Once) { Start-Sleep -Seconds $PollSeconds }
    }
} while (-not $Once)
