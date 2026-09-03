@echo off
chcp 65001 >nul
setlocal

echo ============================================
echo   Kapiert - Aenderungen hochladen
echo ============================================
echo.

cd /d "%~dp0\.."

echo Pruefe, ob dies ein Git-Repository ist...
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo.
    echo FEHLER: Dieser Ordner ist kein Git-Repository.
    echo Dieses Skript muss im "kapiert"-Hauptordner liegen.
    echo.
    pause
    exit /b 1
)

echo Sammle Aenderungen...
git add "frontend/src/pages/RegisterPage.jsx" "frontend/src/pages/lehrer/LehrerLoginPage.jsx" "backend/src/server.js"
git rm --ignore-unmatch "backend/src/routes/admin.js" >nul 2>&1

git diff --cached --quiet
if errorlevel 1 (
    echo Erstelle Commit...
    git commit -m "feat: Rollenauswahl bei der Registrierung, Admin-Aufraeumroute entfernt"
    if errorlevel 1 (
        echo.
        echo FEHLER beim Commit. Bitte Fenster offen lassen und Robert Bescheid geben.
        echo.
        pause
        exit /b 1
    )
) else (
    echo Keine neuen Aenderungen zum Speichern - ueberspringe diesen Schritt.
)

echo.
echo Sende an GitHub...
git push

if errorlevel 1 (
    echo.
    echo ============================================
    echo   Da ist etwas schiefgegangen beim Hochladen.
    echo   Bitte dieses Fenster offen lassen und
    echo   Robert Bescheid geben.
    echo ============================================
) else (
    echo.
    echo ============================================
    echo   Fertig! Alles wurde erfolgreich hochgeladen.
    echo   Dieses Fenster kann jetzt geschlossen werden.
    echo ============================================
)

echo.
pause
