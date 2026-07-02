[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$ApkPath, [ValidateSet('compass-launch','compass-history','compass-recovery','compass-sky-fixtures','compass-physical','full')][string]$TestId = 'full', [string]$DeviceSerial, [switch]$KeepInstalled, [switch]$SkipInstall, [string]$OutputDirectory)
$core = Join-Path $PSScriptRoot '..\..\lib\android-app-test.ps1'
$arguments = @{ ApkPath=$ApkPath; Product='maxxed-compass'; PackageId='com.maxxed.compass'; ScriptId='maxxed-compass-runner'; TestId=$TestId; DeviceSerial=$DeviceSerial; KeepInstalled=$KeepInstalled; SkipInstall=$SkipInstall; ExpectedLabels=@('MAXXED COMPASS','Trip tracker','Sky scanner'); ManualChecks=@('Compare magnetic and true-north headings outdoors','Verify trip distance and lock-screen tracking','Compare Sky Scanner orientation with the visible sky','Record battery use') }
if ($OutputDirectory) { $arguments.OutputDirectory = $OutputDirectory }
& $core @arguments
