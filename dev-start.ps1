# Social Dev Environment Startup Script
# Starts: Docker Desktop (if needed), Docker services (MongoDB, Mongo Express, MinIO, Keycloak),
#          Spring Boot backend, React frontend
# All output shown in split panes inside Windows Terminal

$ROOT = $PSScriptRoot

# ---------------------------------------------------------------------------
# Helper: check for Windows Terminal
# ---------------------------------------------------------------------------
if (-not (Get-Command wt.exe -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Windows Terminal (wt.exe) is required for split panes." -ForegroundColor Red
    Write-Host "       Install it from https://aka.ms/terminal or the Microsoft Store." -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------------------
# 1. Ensure Docker Desktop is running
# ---------------------------------------------------------------------------
Write-Host "==> Checking Docker Desktop..." -ForegroundColor Cyan
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    Docker Desktop is not running. Starting it..." -ForegroundColor Yellow

    $dockerDesktop = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $dockerDesktop)) {
        $dockerDesktop = "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
    }

    if (-not (Test-Path $dockerDesktop)) {
        Write-Host "ERROR: Docker Desktop executable not found. Please start it manually." -ForegroundColor Red
        exit 1
    }

    Start-Process $dockerDesktop
    Write-Host "    Waiting for Docker daemon to become available..." -ForegroundColor DarkGray

    $maxWait = 120
    $elapsed = 0
    do {
        Start-Sleep -Seconds 3
        $elapsed += 3
        docker info 2>$null | Out-Null
        Write-Host "    Waiting... ($elapsed s)" -ForegroundColor DarkGray
    } while ($LASTEXITCODE -ne 0 -and $elapsed -lt $maxWait)

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Docker daemon did not start within $maxWait seconds. Aborting." -ForegroundColor Red
        exit 1
    }
}
Write-Host "==> Docker Desktop is ready." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 2. Start Docker services and wait for MongoDB
# ---------------------------------------------------------------------------
Write-Host "==> Starting Docker services (MongoDB, Mongo Express, MinIO, Keycloak)..." -ForegroundColor Cyan
docker compose -f "$ROOT\backend\docker-compose.yml" up -d

Write-Host "==> Waiting for MongoDB to accept connections..." -ForegroundColor Cyan
$maxWait = 60
$elapsed = 0
do {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $result = docker compose -f "$ROOT\backend\docker-compose.yml" exec -T mongo mongosh --quiet --eval "db.adminCommand('ping')" -u root -p example 2>$null
    Write-Host "    MongoDB check ($elapsed s)..." -ForegroundColor DarkGray
} while ($LASTEXITCODE -ne 0 -and $elapsed -lt $maxWait)

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not confirm MongoDB readiness within $maxWait seconds." -ForegroundColor Yellow
    Write-Host "         Continuing anyway - it may still be starting up." -ForegroundColor Yellow
} else {
    Write-Host "==> MongoDB is ready." -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 3. Wait for Keycloak to be ready
# ---------------------------------------------------------------------------
Write-Host "==> Waiting for Keycloak to be ready (this can take ~90s on first start)..." -ForegroundColor Cyan
$maxWait = 180
$elapsed = 0
do {
    Start-Sleep -Seconds 5
    $elapsed += 5
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8082/realms/social" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        $keycloakReady = ($response.StatusCode -eq 200)
    } catch {
        $keycloakReady = $false
    }
    Write-Host "    Keycloak check ($elapsed s)..." -ForegroundColor DarkGray
} while (-not $keycloakReady -and $elapsed -lt $maxWait)

if (-not $keycloakReady) {
    Write-Host "WARNING: Keycloak did not become ready within $maxWait seconds." -ForegroundColor Yellow
    Write-Host "         The backend may fail to connect. Check http://localhost:8082" -ForegroundColor Yellow
} else {
    Write-Host "==> Keycloak is ready (realm 'social' available)." -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 4. Install frontend dependencies if needed
# ---------------------------------------------------------------------------
if (-not (Test-Path "$ROOT\node_modules")) {
    Write-Host "==> Installing frontend dependencies (npm install)..." -ForegroundColor Cyan
    Push-Location $ROOT
    npm install
    Pop-Location
}

# ---------------------------------------------------------------------------
# 5. Write small pane helper scripts (avoids all quote-nesting in wt args)
# ---------------------------------------------------------------------------
$helperDir = "$ROOT\.dev"
New-Item -ItemType Directory -Path $helperDir -Force | Out-Null

Set-Content "$helperDir\run-backend.ps1" -Value "Set-Location '$ROOT\backend'`ncmd /c mvnw.cmd spring-boot:run"
Set-Content "$helperDir\run-frontend.ps1" -Value "Set-Location '$ROOT'`n`$env:HOST='0.0.0.0'`nnpm run start"
Set-Content "$helperDir\run-status.ps1" -Value @"
Write-Host ''
Write-Host '  Social Dev Environment' -ForegroundColor Cyan
Write-Host '  ----------------------' -ForegroundColor Cyan
Write-Host '  MongoDB       : localhost:27018'          -ForegroundColor Green
Write-Host '  Mongo Express : http://localhost:8081'    -ForegroundColor Green
Write-Host '  MinIO Console : http://localhost:9001'    -ForegroundColor Green
Write-Host '  Keycloak      : http://localhost:8082'    -ForegroundColor Green
Write-Host '  Backend       : http://localhost:8080'    -ForegroundColor Green
Write-Host '  Frontend      : http://localhost:3000'    -ForegroundColor Green
Write-Host ''
Write-Host '  Mongo Express Login: mongoexpressuser / mongoexpresspass' -ForegroundColor DarkGray
Write-Host '  Keycloak Admin    : admin / example1'                     -ForegroundColor DarkGray
Write-Host '  MinIO Admin       : lukas / example1'                     -ForegroundColor DarkGray
Write-Host ''
Write-Host '  Stop Docker: docker compose -f backend\docker-compose.yml down' -ForegroundColor DarkGray
Write-Host ''
"@

# ---------------------------------------------------------------------------
# 6. Launch Windows Terminal with three split panes
#
#    Layout:
#      [ Backend (left) | Frontend (right-top)  ]
#                       | Status  (right-bottom) ]
# ---------------------------------------------------------------------------
Write-Host "==> Launching Windows Terminal with split panes..." -ForegroundColor Cyan

$b = "$helperDir\run-backend.ps1"
$f = "$helperDir\run-frontend.ps1"
$s = "$helperDir\run-status.ps1"

$wtArgs = @(
    "new-tab", "--title", "Backend",
    "--", "powershell", "-NoExit", "-File", $b,
    ";",
    "split-pane", "-V", "--title", "Frontend",
    "--", "powershell", "-NoExit", "-File", $f,
    ";",
    "split-pane", "-H", "--title", "Status",
    "--", "powershell", "-NoExit", "-File", $s
)

Start-Process "wt.exe" -ArgumentList $wtArgs

Write-Host "==> Done. All panes launched in Windows Terminal." -ForegroundColor Green
