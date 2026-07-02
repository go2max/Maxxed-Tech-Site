[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ApkPath,
    [ValidateSet('maxxed-remote-full-ux-connection','remote-launch','remote-navigation','remote-device-crud','remote-invalid-host','remote-physical-tv','full')][string]$TestId = 'full',
    [string]$DeviceSerial,
    [string]$TvIp,
    [string]$TvPlatform = 'Auto',
    [switch]$HardwareObserved,
    [switch]$KeepInstalled,
    [switch]$SkipInstall,
    [string]$OutputDirectory
)

if ($TestId -in @('full', 'maxxed-remote-full-ux-connection')) {
    $arguments = @{ ApkPath=$ApkPath; DeviceSerial=$DeviceSerial; TvPlatform=$TvPlatform; HardwareObserved=$HardwareObserved; KeepInstalled=$KeepInstalled; SkipInstall=$SkipInstall }
    if ($TvIp) { $arguments.TvIp = $TvIp }
    if ($OutputDirectory) { $arguments.OutputDirectory = $OutputDirectory }
    & (Join-Path $PSScriptRoot 'maxxed-remote-full-test.ps1') @arguments
    return
}

$core = Join-Path $PSScriptRoot '..\..\lib\android-app-test.ps1'
$arguments = @{ ApkPath=$ApkPath; Product='maxxed-remote'; PackageId='com.maxxedtechnicalsystems.maxxedremote'; ScriptId='maxxed-remote-runner'; TestId=$TestId; DeviceSerial=$DeviceSerial; KeepInstalled=$KeepInstalled; SkipInstall=$SkipInstall; ExpectedLabels=@('Remote','Media','Apps','More'); ManualChecks=@('Pair and approve on a real TV','Verify remote commands, power, reconnect, and streaming IDs') }
if ($OutputDirectory) { $arguments.OutputDirectory = $OutputDirectory }
& $core @arguments
