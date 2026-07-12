@echo off
title Parar Meu Multichat
echo.
echo  Encerrando servidor na porta 3847...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3847 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
echo  Pronto. Pode iniciar de novo com start.bat ou npm.cmd start
echo.
pause
