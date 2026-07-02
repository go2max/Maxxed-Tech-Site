[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$ApkPath, [ValidateSet('fishing-launch','fishing-measurement','fishing-records','fishing-privacy','fishing-physical','full')][string]$TestId = 'full', [string]$DeviceSerial, [switch]$KeepInstalled, [switch]$SkipInstall, [string]$OutputDirectory)
$core = Join-Path $PSScriptRoot '..\..\lib\android-app-test.ps1'
$arguments = @{ ApkPath=$ApkPath; Product='fishing-maxxed'; PackageId='com.maxxed.fishingmaxxed'; ScriptId='fishing-maxxed-runner'; TestId=$TestId; DeviceSerial=$DeviceSerial; KeepInstalled=$KeepInstalled; SkipInstall=$SkipInstall; ExpectedLabels=@('Fishing Maxxed','Capture and measure','Catch journal'); ManualChecks=@('Measure a known fish-shaped object outdoors','Confirm exact coordinates remain private','Verify broad-region export','Confirm regulation status fails closed') }
if ($OutputDirectory) { $arguments.OutputDirectory = $OutputDirectory }
& $core @arguments
