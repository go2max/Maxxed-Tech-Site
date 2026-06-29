[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$ApkPath, [ValidateSet('gold-launch','gold-quality','gold-analysis','gold-export','gold-physical','full')][string]$TestId = 'full', [string]$DeviceSerial, [switch]$KeepInstalled, [switch]$SkipInstall, [string]$OutputDirectory)
$core = Join-Path $PSScriptRoot '..\..\lib\android-app-test.ps1'
$arguments = @{ ApkPath=$ApkPath; Product='maxxed-gold-estimator'; PackageId='com.maxxed.goldestimator'; ScriptId='maxxed-gold-estimator-runner'; TestId=$TestId; DeviceSerial=$DeviceSerial; KeepInstalled=$KeepInstalled; SkipInstall=$SkipInstall; ExpectedLabels=@('Offline visual material estimates','Start new batch','Saved batches'); ManualChecks=@('Capture all six angles of a real sample','Repeat under wet, dry, diffuse, and harsh lighting','Verify known-reference placement','Compare conservative output with a known fixture') }
if ($OutputDirectory) { $arguments.OutputDirectory = $OutputDirectory }
& $core @arguments
