@echo off
echo ==========================================
echo   Tohid Dayhami Export+ - Deploy to Firebase
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
echo Step 2: Deploying Hosting + Storage rules + Firestore rules...
call firebase deploy --only hosting,storage,firestore
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
