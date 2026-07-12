@echo off
title Meu Multichat - OBS Overlay
cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo  [ERRO] Node.js nao encontrado!
  echo  Instale em: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias...
  call npm.cmd install
)

if not exist ".env" (
  echo Criando arquivo .env a partir do exemplo...
  copy .env.example .env
  echo.
  echo  Edite o arquivo .env com seus canais antes de usar!
  echo.
  notepad .env
)

echo.
echo  Iniciando Meu Multichat...
echo.

REM Encerra instancia anterior se a porta ja estiver em uso
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3847 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

node server.js
pause
