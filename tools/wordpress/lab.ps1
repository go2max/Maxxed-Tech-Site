param(
  [string]$Manifest = "wordpress/products.example.json",
  [switch]$InstallManifest,
  [switch]$Reset
)

$ErrorActionPreference = "Stop"
$ComposeFile = $env:COMPOSE_FILE
if ([string]::IsNullOrWhiteSpace($ComposeFile)) { $ComposeFile = "docker-compose.wordpress.yml" }
$EnvFile = $env:ENV_FILE
if ([string]::IsNullOrWhiteSpace($EnvFile)) { $EnvFile = ".env.wordpress" }

if (!(Test-Path $EnvFile)) {
  Copy-Item ".env.wordpress.example" $EnvFile
}

New-Item -ItemType Directory -Force "wordpress/plugins" | Out-Null
New-Item -ItemType Directory -Force "wordpress/themes" | Out-Null
New-Item -ItemType Directory -Force "wordpress/uploads" | Out-Null
New-Item -ItemType Directory -Force "wordpress/mu-plugins" | Out-Null
New-Item -ItemType Directory -Force "wordpress/reports" | Out-Null
New-Item -ItemType Directory -Force "local-artifacts/wordpress" | Out-Null

if ($Reset) {
  docker compose -f $ComposeFile --env-file $EnvFile down -v --remove-orphans
}

docker compose -f $ComposeFile --env-file $EnvFile up -d db wordpress phpmyadmin

$siteUrl = (Select-String -Path $EnvFile -Pattern '^WP_SITE_URL=' | Select-Object -First 1).Line
if ($siteUrl) { $siteUrl = $siteUrl -replace '^WP_SITE_URL=', '' } else { $siteUrl = 'http://localhost:8080' }
$adminUser = (Select-String -Path $EnvFile -Pattern '^WP_ADMIN_USER=' | Select-Object -First 1).Line
if ($adminUser) { $adminUser = $adminUser -replace '^WP_ADMIN_USER=', '' } else { $adminUser = 'admin' }
$adminPass = (Select-String -Path $EnvFile -Pattern '^WP_ADMIN_PASSWORD=' | Select-Object -First 1).Line
if ($adminPass) { $adminPass = $adminPass -replace '^WP_ADMIN_PASSWORD=', '' } else { $adminPass = 'adminpass123' }
$adminEmail = (Select-String -Path $EnvFile -Pattern '^WP_ADMIN_EMAIL=' | Select-Object -First 1).Line
if ($adminEmail) { $adminEmail = $adminEmail -replace '^WP_ADMIN_EMAIL=', '' } else { $adminEmail = 'admin@example.test' }

$installed = $false
docker compose -f $ComposeFile --env-file $EnvFile run --rm wpcli core is-installed
if ($LASTEXITCODE -eq 0) { $installed = $true }

if (!$installed) {
  docker compose -f $ComposeFile --env-file $EnvFile run --rm wpcli core install --url=$siteUrl --title="Maxxed WordPress Plugin Lab" --admin_user=$adminUser --admin_password=$adminPass --admin_email=$adminEmail --skip-email
}

if ($InstallManifest) {
  node tools/wordpress/run-manifest.mjs $Manifest
}

Write-Host "WordPress Plugin Lab: $siteUrl/wp-admin"
Write-Host "Artifact folder: local-artifacts/wordpress"
Write-Host "Manifest: $Manifest"
