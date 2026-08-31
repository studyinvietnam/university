
@echo off
setlocal EnableDelayedExpansion

title Push .env to Vercel

echo.
echo ========================================
echo       PUSH .ENV TO VERCEL
echo ========================================
echo.

if not exist ".env" (
    echo [ERROR] Khong tim thay file .env
    pause
    exit /b 1
)

echo [1/3] Kiem tra Vercel project...
vercel project ls >nul 2>&1

if errorlevel 1 (
    echo [ERROR] Vercel CLI chua dang nhap.
    echo Hay chay: vercel login
    pause
    exit /b 1
)

echo.
echo [2/3] Doc file .env...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$lines = Get-Content '.env'; ^
foreach ($line in $lines) { ^
    $line = $line.Trim(); ^
    if ([string]::IsNullOrWhiteSpace($line)) { continue }; ^
    if ($line.StartsWith('#')) { continue }; ^
    $idx = $line.IndexOf('='); ^
    if ($idx -le 0) { continue }; ^
    $name = $line.Substring(0,$idx).Trim(); ^
    $value = $line.Substring($idx+1); ^
    if ($value.StartsWith('\"') -and $value.EndsWith('\"')) { ^
        $value = $value.Substring(1,$value.Length-2) ^
    }; ^
    Write-Host ('Uploading: ' + $name); ^
    $value | vercel env add $name production --yes; ^
    if ($LASTEXITCODE -ne 0) { ^
        Write-Host ('[ERROR] Failed: ' + $name); ^
    } ^
}"

echo.
echo [3/3] Hoan tat!
echo.
echo ========================================
echo       ENV DA DUOC DAY LEN VERCEL
echo ========================================
echo.

pause

