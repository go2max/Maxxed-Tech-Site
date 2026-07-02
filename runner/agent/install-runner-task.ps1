[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$BaseUrl,
    [string]$DeviceSerial,
    [string]$TaskName = 'Maxxed Android Test Runner'
)

$ErrorActionPreference = 'Stop'
if (-not $env:MAXXED_RUNNER_TOKEN) { throw 'Set the machine or user environment variable MAXXED_RUNNER_TOKEN before installing the task.' }
$pwsh = (Get-Command pwsh -ErrorAction Stop).Source
$agent = (Resolve-Path (Join-Path $PSScriptRoot 'maxxed-runner-agent.ps1')).Path
$arguments = "-NoProfile -NonInteractive -File `"$agent`" -BaseUrl `"$BaseUrl`""
if ($DeviceSerial) { $arguments += " -DeviceSerial `"$DeviceSerial`"" }
$action = New-ScheduledTaskAction -Execute $pwsh -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 1)
if ($PSCmdlet.ShouldProcess($TaskName, 'Register current-user test runner scheduled task')) {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Polls the private Maxxed admin queue and runs approved Android tests sequentially.' -Force | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "Installed and started scheduled task: $TaskName"
}
