@echo off
title Excel → Production Sync Watcher
color 0A
echo ============================================
echo   Rizviz ERP — Excel to Production Watcher
echo ============================================
echo.
echo Jab bhi Excel file save karo (Ctrl+S), changes
echo automatically production pe sync ho jayenge.
echo.
echo Ye window band MAT karo jab tak sync chahte ho.
echo Band karne ke liye Ctrl+C dabao.
echo.
cd /d "%~dp0.."
node scripts/watch-excel-production.js
pause
