<#
.SYNOPSIS
    Starts the local development database (PostgreSQL + pgvector inside WSL).

.DESCRIPTION
    WSL shuts a distribution down once its last process exits, which takes the
    database with it a few seconds after any command returns. So the database is
    held open by one detached process that does nothing but stay alive; closing
    it (or running this script with -Stop) releases the distribution.

    Run once per working session, from the repository root:

        .\scripts\dev-db.ps1

    (Windows PowerShell 5.1; `pwsh` is PowerShell 7 and is not installed here.)

.PARAMETER Stop
    Shut the distribution down instead of starting it.
#>
[CmdletBinding()]
param(
    [switch]$Stop,
    [string]$Distro = 'Ubuntu',
    [int]$Port = 5432,
    [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = 'Stop'

function Test-Port {
    param([int]$Port)
    $client = New-Object Net.Sockets.TcpClient
    try { $client.Connect('127.0.0.1', $Port); $true } catch { $false } finally { $client.Dispose() }
}

if ($Stop) {
    wsl --terminate $Distro | Out-Null
    Write-Host "database stopped ($Distro terminated)"
    exit 0
}

if (Test-Port -Port $Port) {
    Write-Host "database already up on port $Port"
    exit 0
}

# `exec sleep infinity` is the keepalive: one process, no CPU, keeps WSL from
# tearing the distribution down between commands.
Start-Process -FilePath 'wsl.exe' -WindowStyle Hidden -ArgumentList @(
    '-d', $Distro, '-u', 'root', '--',
    'bash', '-lc', 'service postgresql start >/dev/null 2>&1; exec sleep infinity'
)

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
    if (Test-Port -Port $Port) {
        Write-Host "database up on port $Port"
        exit 0
    }
    Start-Sleep -Milliseconds 500
}

Write-Error "database did not answer on port $Port within $TimeoutSeconds seconds"
exit 1
