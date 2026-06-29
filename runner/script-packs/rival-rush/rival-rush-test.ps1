[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$ApkPath, [ValidateSet('rival-launch','rival-navigation','rival-gameplay','rival-recovery','rival-physical','full')][string]$TestId = 'full', [string]$DeviceSerial, [switch]$KeepInstalled, [switch]$SkipInstall, [string]$OutputDirectory)
$core = Join-Path $PSScriptRoot '..\..\lib\android-app-test.ps1'
$arguments = @{ ApkPath=$ApkPath; Product='rival-rush'; PackageId='com.maxxed_technical_systems.rivalrushlaunch'; ScriptId='rival-rush-runner'; TestId=$TestId; DeviceSerial=$DeviceSerial; KeepInstalled=$KeepInstalled; SkipInstall=$SkipInstall; ExpectedLabels=@('Rival Rush','PickOff','RPS'); ManualChecks=@('Exercise every scene and back path','Verify two-player touch ergonomics','Test Word Rush A-Z input and resets','Check profiles, help, credits, ads, and aspect ratios') }
if ($OutputDirectory) { $arguments.OutputDirectory = $OutputDirectory }
& $core @arguments
