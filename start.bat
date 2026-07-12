@echo off
cd /d "%~dp0"
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3847 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1
node server.js