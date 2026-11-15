<#
.SYNOPSIS
    Генерирует HTTPS-сертификат для Cozy Voice Chat (mkcert) со всеми адресами машины.

.DESCRIPTION
    Собирает все IPv4-адреса компьютера — включая виртуальные адаптеры
    Radmin VPN (26.x.x.x) и Hamachi (25.x.x.x), — добавляет localhost и 127.0.0.1
    и вызывает mkcert. Файлы пишутся по путям из backend\.env
    (SSL_CERT_PATH / SSL_KEY_PATH), поэтому остальную конфигурацию менять не нужно.
    Существующие файлы сертификата перезаписываются.

.PARAMETER ExtraHosts
    Дополнительные имена или IP (например, домен или адрес ещё одной сети).

.PARAMETER SkipInstall
    Не вызывать `mkcert -install` (если локальный CA уже установлен).

.EXAMPLE
    .\scripts\make-cert.ps1

.EXAMPLE
    .\scripts\make-cert.ps1 -ExtraHosts 26.0.0.5,cozy.lan -SkipInstall
#>
[CmdletBinding()]
param(
    [string[]]$ExtraHosts = @(),
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot 'backend'
$backendEnv = Join-Path $backendDir '.env'

function Get-EnvValue {
    param(
        [string]$Path,
        [string]$Key
    )

    if (-not (Test-Path -LiteralPath $Path)) { return $null }

    $pattern = '^\s*' + [regex]::Escape($Key) + '\s*=\s*(.+?)\s*$'
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match $pattern) { return $Matches[1] }
    }

    return $null
}

function Resolve-BackendPath {
    param(
        [string]$Value,
        [string]$Fallback
    )

    $raw = if ($Value) { $Value } else { $Fallback }

    if ([System.IO.Path]::IsPathRooted($raw)) {
        return [System.IO.Path]::GetFullPath($raw)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $backendDir $raw))
}

function Get-LocalIPv4 {
    $addresses = @()

    if (Get-Command Get-NetIPAddress -ErrorAction SilentlyContinue) {
        $addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty IPAddress
    }

    if (-not $addresses) {
        $addresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
            Where-Object { $_.AddressFamily -eq 'InterNetwork' } |
            ForEach-Object { $_.IPAddressToString }
    }

    return $addresses |
        Where-Object { $_ -and $_ -ne '127.0.0.1' -and $_ -notlike '169.254.*' }
}

$mkcert = Get-Command mkcert -ErrorAction SilentlyContinue
if (-not $mkcert) {
    throw 'mkcert не найден. Установите его (choco install mkcert / brew install mkcert) и повторите запуск.'
}

$certPath = Resolve-BackendPath -Value (Get-EnvValue -Path $backendEnv -Key 'SSL_CERT_PATH') -Fallback '..\cert\cozy.pem'
$keyPath = Resolve-BackendPath -Value (Get-EnvValue -Path $backendEnv -Key 'SSL_KEY_PATH') -Fallback '..\cert\cozy-key.pem'

$hosts = @('localhost', '127.0.0.1') + (Get-LocalIPv4) + $ExtraHosts |
    Where-Object { $_ } |
    Sort-Object -Unique

if (-not $SkipInstall) {
    Write-Host 'Устанавливаю локальный CA (mkcert -install)...' -ForegroundColor Cyan
    & mkcert -install

    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'Не удалось установить CA. Сертификат будет создан, но браузер на этой машине не будет ему доверять: запустите PowerShell от администратора и повторите `mkcert -install`.'
    }
}

$certDir = Split-Path -Parent $certPath
if (-not (Test-Path -LiteralPath $certDir)) {
    New-Item -ItemType Directory -Path $certDir -Force | Out-Null
}

Write-Host ('Генерирую сертификат для: ' + ($hosts -join ', ')) -ForegroundColor Cyan
& mkcert -cert-file $certPath -key-file $keyPath @hosts

if ($LASTEXITCODE -ne 0) {
    throw "mkcert завершился с кодом $LASTEXITCODE"
}

$caRoot = (& mkcert -CAROOT).Trim()

Write-Host ''
Write-Host 'Готово!' -ForegroundColor Green
Write-Host "  Сертификат: $certPath"
Write-Host "  Ключ:       $keyPath"
Write-Host ''
Write-Host 'Чтобы браузеры на других машинах (в т.ч. в VPN) доверяли сертификату,'
Write-Host "установите там корневой CA: $caRoot\rootCA.pem"
Write-Host '(«Доверенные корневые центры сертификации»). Без этого не будет доступа к микрофону.'
