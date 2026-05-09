@echo off
echo ==========================================
echo   CloudExport Pro - Deploy to Firebase
echo ==========================================
echo.
echo Step 1: Building project...
call npm run build
if errorlevel 1 (
    echo Build FAILED. Check errors above.
    pause
    exit /b 1
)
echo Build SUCCESS.
echo.
echo Step 2: Deploying to Firebase Hosting...
call firebase deploy --only hosting
if errorlevel 1 (
    echo Deploy FAILED. Make sure you ran: firebase login
    pause
    exit /b 1
)
echo.
echo ==========================================
echo   DEPLOY COMPLETE!
echo   Your app is now live online.
echo ==========================================
pause
