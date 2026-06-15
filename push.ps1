# ============================================================================
# terminalv2 — Push to GitHub
# Speicherort: D:\terminal V2\push.ps1
# Ausfuehren:  PowerShell.exe -ExecutionPolicy Bypass -File "D:\terminal V2\push.ps1"
# ============================================================================

$ErrorActionPreference = "Stop"
$Repo = "D:\terminal V2"

function OK($m)   { Write-Host "  OK   $m" -ForegroundColor Green }
function ERR($m)  { Write-Host "  XX   $m" -ForegroundColor Red; exit 1 }
function INFO($m) { Write-Host "       $m" -ForegroundColor DarkGray }
function HEAD($m) { Write-Host ""; Write-Host "--- $m ---" -ForegroundColor Cyan }

HEAD "1. Repo pruefen"

if (-not (Test-Path $Repo))  { ERR "Ordner nicht gefunden: $Repo" }
Set-Location $Repo
OK "Ordner: $Repo"

if (-not (Test-Path ".git")) { ERR "Kein git-Repo gefunden" }
OK "Git-Repo OK"

$remote = git remote get-url origin 2>&1
OK "Remote: $remote"

$branch = git rev-parse --abbrev-ref HEAD 2>&1
OK "Branch: $branch"

HEAD "2. Aenderungen"

$changes = git status --porcelain 2>&1
if (-not $changes) {
    Write-Host ""
    Write-Host "  Nichts zu committen." -ForegroundColor Yellow
    git log -1 --format="  Letzter Commit: %h  %s" | Write-Host
    exit 0
}

$count = ($changes | Measure-Object -Line).Lines
Write-Host ""
Write-Host "  $count Datei(en) geaendert:" -ForegroundColor White
$changes | ForEach-Object { INFO $_ }

HEAD "3. Bestaetigung"

Write-Host ""
$ok = Read-Host "  Alles committen und pushen? (j/n)"
if ($ok -ne "j") { Write-Host "  Abgebrochen." -ForegroundColor Yellow; exit 0 }

HEAD "4. Backup-Tag"

$tagExists = git tag -l "pre-phase-3.5-backup" 2>&1
if ($tagExists -ne "pre-phase-3.5-backup") {
    git tag pre-phase-3.5-backup
    OK "Backup-Tag gesetzt"
} else {
    OK "Backup-Tag existiert bereits"
}

HEAD "5. Stage + Commit"

git add .
OK "Gestaged"

$msg = @"
feat: phase 3.5 - design system + brand hierarchy

- iOS 18 Liquid Glass design system (D-034)
- Quantum Blue als UI accent (D-036)
- Brand hierarchy mit parent_id, 7 IBE sub-brands (D-039)
- Service Center Antalya Umbenennung (D-045)
- Migrations 0007 / 0008 / 0009
- spec/DESIGN_SYSTEM.md + EMBEDS_INVENTORY.md neu
- spec/embeds/ + spec/mockups/ neu
"@

$tmp = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmp, $msg, [System.Text.UTF8Encoding]::new($false))
git commit -F $tmp | Out-Null
Remove-Item $tmp -Force

$hash = git rev-parse --short HEAD
OK "Committed: $hash"

HEAD "6. Push"

git push origin $branch
if ($LASTEXITCODE -ne 0) { ERR "Push fehlgeschlagen" }
OK "Gepusht nach origin/$branch"

git push origin pre-phase-3.5-backup 2>&1 | Out-Null
OK "Backup-Tag gepusht"

HEAD "Fertig"

Write-Host ""
Write-Host "  Commit : $hash" -ForegroundColor Green
Write-Host "  Branch : $branch" -ForegroundColor Green
Write-Host "  URL    : https://github.com/airtuerkmarketing/terminalv2/commit/$hash" -ForegroundColor Green
Write-Host ""
Write-Host "  NAECHSTER SCHRITT:" -ForegroundColor Yellow
Write-Host "  Neue Claude Session -> 'Apply Phase 3.5 migrations 0007/0008/0009'" -ForegroundColor Yellow
Write-Host "  Supabase project ref: zkydrymygjrscjbhusxp" -ForegroundColor Yellow
Write-Host ""

$open = Read-Host "  GitHub im Browser oeffnen? (j/n)"
if ($open -eq "j") {
    Start-Process "https://github.com/airtuerkmarketing/terminalv2/commit/$hash"
}
