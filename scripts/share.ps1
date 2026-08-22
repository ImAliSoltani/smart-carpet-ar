<#
.SYNOPSIS
    Put the whole shop on a public HTTPS address, from this laptop, for free.

.DESCRIPTION
    For showing the project to someone who is not in the room — an investor, a
    carpet seller, an examiner joining online — without a VPS, a domain or an
    account anywhere. A Cloudflare quick tunnel gives an `https://….trycloudflare.com`
    address that forwards to this machine, and everything behind it is the real
    product: the catalogue, visual search, the room adviser, AR, the admin panel.

    **One tunnel is enough, and that is not obvious.** The browser never talks to
    the API directly — `API_BASE` is the empty string client-side, so every call
    is same-origin and Next's rewrites forward `/api/*` and `/files/*` to the
    backend. Tunnelling port 3000 tunnels the whole product.

    **It runs the production build, not `next dev`.** Two reasons, both learned
    the hard way. `allowedDevOrigins` in next.config.ts only lists this machine's
    LAN addresses, so the dev server refuses to serve `/_next/*` to a
    trycloudflare host — the HTML arrives, the JavaScript does not, and the page
    is blank in a way that reads like a database failure. And the dev server's
    hot-reload socket cannot survive the tunnel, so a visitor would watch error
    toasts pile up. The production build has neither problem and is what a
    visitor should be looking at anyway.

    HTTPS is not a detail here: WebXR refuses to start without it, so the AR
    button works for a visitor on their own phone in a way it never does on a
    plain-http LAN address.

.PARAMETER Port
    Where the storefront listens. Defaults to 3200 rather than 3000 so this
    never fights a development server that is already open.

.PARAMETER Protocol
    How cloudflared reaches Cloudflare. Defaults to `http2` (TCP 443) rather
    than the usual `quic`, because QUIC needs outbound UDP 7844 and this
    network drops it. Pass `quic` on a network that allows it.

.PARAMETER SkipBuild
    Reuse the previous build. Faster, but the address is baked in at build time
    (`metadataBase`, the sitemap), so link previews will name the old one.

.EXAMPLE
    ./scripts/share.ps1

.NOTES
    This file is saved with a UTF-8 BOM on purpose. Windows PowerShell 5.1 reads
    a BOM-less script in the machine's ANSI code page — cp1256 here — so every
    Persian string in it turns to mojibake and the parser dies on the wreckage
    with a dozen "Unexpected token" errors that point at working code. PowerShell
    7 defaults to UTF-8 and never noticed. Do not strip the BOM.
#>
[CmdletBinding()]
param(
    [int]$Port = 3200,
    [int]$ApiPort = 8000,
    [ValidateSet("http2", "quic", "auto")]
    [string]$Protocol = "http2",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$jobs = @()

function Test-Port([int]$p) {
    $null -ne (Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue)
}

# Every child process writes to a log, and the log path is named in the failure.
# The first version started them hidden with no redirection, so `next start`
# died instantly and all the script could say was "port 3200 never opened" —
# true, useless, and pointing at the wrong thing.
$script:LogDir = Join-Path ([System.IO.Path]::GetTempPath()) "toranjan-share-$PID"
New-Item -ItemType Directory -Force -Path $script:LogDir | Out-Null

function Start-Child([string]$name, [string]$exe, [string[]]$argv, [string]$cwd) {
    Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $cwd `
        -FilePath $exe -ArgumentList $argv `
        -RedirectStandardOutput (Join-Path $script:LogDir "$name.out") `
        -RedirectStandardError  (Join-Path $script:LogDir "$name.err")
}

function Wait-Port([int]$p, [int]$seconds, [string]$what) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Port $p) { return $true }
        Start-Sleep -Milliseconds 700
    }
    throw "$what روی پورت $p بالا نیامد. لاگ: $script:LogDir"
}

try {
    # --- 1. database ---------------------------------------------------------
    # The catalogue lives in WSL Postgres. Without it every page still renders
    # and every list is empty, which looks like a broken site rather than a
    # missing database — so it is checked first and loudly.
    Write-Host "`n[1/4] دیتابیس" -ForegroundColor Cyan
    & "$root\scripts\dev-db.ps1"

    # --- 2. backend ----------------------------------------------------------
    Write-Host "`n[2/4] بک‌اند" -ForegroundColor Cyan
    if (Test-Port $ApiPort) {
        Write-Host "      از سرور در حال اجرا روی $ApiPort استفاده می‌شود"
    } else {
        Write-Host "      اجرا روی $ApiPort …"
        $jobs += Start-Child "api" "uv" @(
            "run", "--directory", "backend", "--group", "ml",
            "uvicorn", "app.main:app", "--port", "$ApiPort"
        ) $root
        Wait-Port $ApiPort 180 "بک‌اند" | Out-Null
    }

    # --- 3. tunnel -----------------------------------------------------------
    # Started *before* the build, because the address it hands out is an input
    # to the build: `NEXT_PUBLIC_SITE_URL` is baked into the static output, so a
    # build that runs first can only name localhost.
    Write-Host "`n[3/4] تونل" -ForegroundColor Cyan
    $log = Join-Path $script:LogDir "tunnel.err"
    # `--protocol http2` is not a preference, it is what works here. cloudflared
    # prefers QUIC, which needs outbound UDP on port 7844 — and this network
    # drops it, so the tunnel came up, published an address, and then failed
    # every connection to the edge with "no recent network activity" while
    # visitors saw a Cloudflare error page. The http2 path is plain TCP 443,
    # which nothing blocks. It is marginally slower and always available.
    $jobs += Start-Child "tunnel" "cloudflared" `
        @("tunnel", "--no-autoupdate", "--protocol", $Protocol,
          "--url", "http://127.0.0.1:$Port") $root

    $publicUrl = $null
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline -and -not $publicUrl) {
        Start-Sleep -Milliseconds 700
        if (Test-Path $log) {
            $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" `
                 -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($m) { $publicUrl = $m.Matches[0].Value }
        }
    }
    if (-not $publicUrl) { throw "آدرس تونل پیدا نشد. لاگ: $script:LogDir" }
    Write-Host "      $publicUrl"

    # --- 4. storefront -------------------------------------------------------
    Write-Host "`n[4/4] فروشگاه" -ForegroundColor Cyan
    Push-Location "$root\frontend"
    try {
        $env:NEXT_PUBLIC_SITE_URL = $publicUrl
        $env:API_INTERNAL_URL = "http://127.0.0.1:$ApiPort"
        $env:NEXT_TELEMETRY_DISABLED = "1"
        if (-not $SkipBuild) {
            Write-Host "      build … (یک بار، حدود یک دقیقه)"
            npm run build | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "بیلد فرانت‌اند شکست خورد" }
        }
        # `npx.cmd`, not `npx`. On Windows the extension-less `npx` beside it is
        # a shell script, and `Start-Process` hands it to CreateProcess, which
        # answers "%1 is not a valid Win32 application" — into a redirected
        # stream nobody was reading, so all the script could report was that
        # port 3200 never opened.
        $jobs += Start-Child "web" "npx.cmd" @("next", "start", "--port", "$Port") "$root\frontend"
        Wait-Port $Port 120 "فروشگاه" | Out-Null
    } finally {
        Pop-Location
    }

    Write-Host "`n════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  $publicUrl" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host @"

  از هر گوشی و هر کجای دنیا باز می‌شود، تا وقتی این پنجره باز است.
  پنل مدیریت: $publicUrl/admin

  نکته‌ها:
   • آدرس با هر بار اجرا عوض می‌شود؛ آدرس ثابت، دامنه می‌خواهد.
   • سرعت به آپلود اینترنت همین دستگاه بند است. فایل AR هر فرش
     حدود ۰٫۹ مگابایت است — روی خط خانگی چند ثانیه.
   • پیش از شروع جلسه یک بار جست‌وجوی بصری بزنید تا مدل گرم شود.

  برای بستن: Ctrl+C
"@
    while ($true) { Start-Sleep -Seconds 3600 }
}
finally {
    Write-Host "`nبستن …" -ForegroundColor DarkGray
    foreach ($p in $jobs) {
        if ($p -and -not $p.HasExited) {
            try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
}
