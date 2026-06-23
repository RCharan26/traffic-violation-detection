@echo off
echo ================================================
echo  TrafficVision AI — Package Installer
echo ================================================
echo.
echo Installing motion and hls.js...
cd /d "C:\Users\pmrdr\Desktop\Flipkart Prototype"
npm install motion hls.js --legacy-peer-deps
echo.
echo ================================================
echo  Done! Now starting dev server...
echo ================================================
npm run dev
pause
