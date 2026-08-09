# Ruleaza DB + backend + frontend in ACEST terminal PowerShell.
# Folosire: .\start-all.ps1
$ErrorActionPreference = "Continue"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "boxmag-backend"
$FrontendDir = Join-Path $RootDir "boxmag4"
$ComposeFile = Join-Path $RootDir "docker-compose.yml"
$EnvFile = Join-Path $RootDir ".env"

function Test-DockerReady {
  docker info 1>$null 2>$null
  return ($LASTEXITCODE -eq 0)
}

function Assert-RequiredEnvVars {
  param([string[]]$Keys)
  if (-not (Test-Path $EnvFile)) {
    throw "Lipseste .env in radacina. Copiaza din .env.example si completeaza valorile."
  }
  $text = Get-Content -Raw $EnvFile
  $missing = @()
  foreach ($key in $Keys) {
    if ($text -notmatch "(?m)^[ \t]*$([regex]::Escape($key))=") {
      $missing += $key
    }
  }
  if ($missing.Count -gt 0) {
    throw ("In .env lipsesc: {0}. Vezi .env.example." -f ($missing -join ", "))
  }
}

function Start-DockerDesktopIfNeeded {
  if (Test-DockerReady) { return }

  $candidates = @(
    (Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Docker\Docker\Docker Desktop.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Docker\Docker\Docker Desktop.exe")
  ) | Where-Object { $_ -and (Test-Path $_) }

  if (-not $candidates) {
    throw "Docker Desktop nu a fost gasit. Porneste-l manual din Start Menu."
  }

  Write-Host "-> Pornesc Docker Desktop..."
  Start-Process -FilePath $candidates[0] | Out-Null

  Write-Host "-> Astept ca Docker daemon sa fie disponibil..."
  for ($i = 1; $i -le 90; $i++) {
    if (Test-DockerReady) {
      Write-Host "-> Docker este gata."
      return
    }
    Start-Sleep -Seconds 2
  }
  throw "Docker daemon nu a raspuns in timp util."
}

function Start-DbContainers {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker nu este instalat sau nu este in PATH."
  }

  Assert-RequiredEnvVars @(
    "MYSQL_ROOT_PASSWORD",
    "MYSQL_PASSWORD",
    "MINIO_ROOT_PASSWORD"
  )
  Start-DockerDesktopIfNeeded

  Write-Host "-> Pornesc containerele DB (MySQL + MinIO)..."
  Push-Location $RootDir
  try {
    docker compose --env-file $EnvFile -f $ComposeFile start mysql minio 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "-> Containerele mysql/minio sunt pornite."
      return
    }

    docker compose --env-file $EnvFile -f $ComposeFile up -d mysql minio
    if ($LASTEXITCODE -ne 0) {
      throw "nu am putut porni mysql/minio."
    }
    Write-Host "-> Containerele mysql/minio au fost create si pornite."
  } finally {
    Pop-Location
  }
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm nu este instalat sau nu este in PATH."
}
if (-not (Test-Path $BackendDir) -or -not (Test-Path $FrontendDir)) {
  throw "folderele backend/frontend nu au fost gasite."
}

Start-DbContainers

Write-Host "-> Pornesc backend..."
$backend = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" `
  -WorkingDirectory $BackendDir -NoNewWindow -PassThru

Write-Host "-> Pornesc frontend..."
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" `
  -WorkingDirectory $FrontendDir -NoNewWindow -PassThru

Write-Host ""
Write-Host "Servicii pornite in acest terminal:"
Write-Host "- DB: docker compose (MySQL + MinIO)"
Write-Host "- Backend: http://localhost:3005"
Write-Host "- Frontend: http://localhost:3006"
Write-Host ""
Write-Host "Apasa Ctrl+C pentru a opri backend/frontend."

$cleanup = {
  Write-Host ""
  Write-Host "-> Oprire procese..."
  foreach ($p in @($backend, $frontend)) {
    if ($null -ne $p -and -not $p.HasExited) {
      taskkill /PID $p.Id /T /F 1>$null 2>$null
    }
  }
  Write-Host "-> Procese backend/frontend oprite."
}

try {
  while (-not $backend.HasExited -and -not $frontend.HasExited) {
    Start-Sleep -Seconds 1
  }
} finally {
  & $cleanup
}
