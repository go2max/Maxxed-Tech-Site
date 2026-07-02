[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$ApkPath, [ValidateSet('measure-launch','measure-fixtures','measure-history','measure-invalid-calibration','measure-physical','full')][string]$TestId = 'full', [string]$DeviceSerial, [switch]$KeepInstalled, [switch]$SkipInstall, [string]$OutputDirectory)
$core = Join-Path $PSScriptRoot '..\..\lib\android-app-test.ps1'
$arguments = @{ ApkPath=$ApkPath; Product='maxxed-measure'; PackageId='com.maxxed.measure'; ScriptId='maxxed-measure-runner'; TestId=$TestId; DeviceSerial=$DeviceSerial; KeepInstalled=$KeepInstalled; SkipInstall=$SkipInstall; ExpectedLabels=@('Maxxed Measure','Calibration','History'); ManualChecks=@('Measure known objects at multiple distances','Check focus and low-light behavior','Verify perspective warning and endpoint correction','Confirm exported annotation') }
if ($OutputDirectory) { $arguments.OutputDirectory = $OutputDirectory }
& $core @arguments
