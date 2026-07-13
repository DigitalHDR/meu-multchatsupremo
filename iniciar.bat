@echo off
cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
  mshta "javascript:alert('Node.js nao encontrado!\n\nInstale em https://nodejs.org/');close()"
  exit /b 1
)

where python >nul 2>&1
if %errorlevel% neq 0 (
  mshta "javascript:alert('Python nao encontrado!\n\nInstale em https://www.python.org/downloads/\nMarque Add python.exe to PATH');close()"
  exit /b 1
)

if not exist "node_modules\" (
  mshta "javascript:var s=new ActiveXObject('WScript.Shell');s.CurrentDirectory='%~dp0';s.Run('cmd /c npm.cmd install',1,true);close()"
)

if not exist ".env" copy .env.example .env >nul 2>&1

python -c "import PySide6" 2>nul
if %errorlevel% neq 0 (
  echo Instalando interface Qt6...
  python -m pip install -r gui\requirements.txt -q
)

wscript.exe "%~dp0iniciar.vbs"
