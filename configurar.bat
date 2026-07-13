@echo off
cd /d "%~dp0"

where python >nul 2>&1
if %errorlevel% neq 0 (
  mshta "javascript:alert('Python nao encontrado!\n\nInstale em https://www.python.org/downloads/');close()"
  exit /b 1
)

python -c "import PySide6" 2>nul
if %errorlevel% neq 0 (
  echo Instalando interface Qt6...
  python -m pip install -r gui\requirements.txt -q
)

wscript.exe "%~dp0gui\abrir-interface.vbs"
