<#
.SYNOPSIS
    Открывает порты Cozy Voice Chat в брандмауэре Windows.

.DESCRIPTION
    Добавляет входящее правило TCP для портов backend (8080), PeerJS (9000)
    и фронтенда (5173 для `yarn dev`, 4173 для `yarn preview`) во всех профилях
    сети: адаптер Radmin VPN / Hamachi Windows часто помечает как «Общественная
    сеть», и без правила клиенты из VPN не подключатся.

    Скрипт нужно запускать в PowerShell от имени администратора.

.PARAMETER Ports
    Порты, которые нужно открыть. По умолчанию 8080, 9000, 5173, 4173.

.PARAMETER RuleName
    Имя правила брандмауэра. Повторный запуск не создаёт дубликат.

.EXAMPLE
    .\scripts\open-firewall.ps1
#>
[CmdletBinding()]
param(
    [int[]]$Ports = @(8080, 9000, 5173, 4173),
    [string]$RuleName = 'Cozy Voice Chat'
)

$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)

if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Нужны права администратора: запустите PowerShell «от имени администратора».'
}

$existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue

if ($existing) {
    Write-Host "Правило '$RuleName' уже существует — ничего не меняю." -ForegroundColor Yellow
} else {
    New-NetFirewallRule `
        -DisplayName $RuleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $Ports `
        -Profile Any | Out-Null
    Write-Host "Правило '$RuleName' создано для портов: $($Ports -join ', ')" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Проверка с другой машины:'
Write-Host '  Test-NetConnection <IP-хоста-в-VPN> -Port 8080'
Write-Host '  Test-NetConnection <IP-хоста-в-VPN> -Port 5173'
