@echo off
cd /d "%~dp0"
echo Instalando interface Qt6 (PySide6)...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
  echo.
  echo Falha na instalacao. Verifique se o Python esta instalado.
  echo https://www.python.org/downloads/
  pause
  exit /b 1
)
echo.
echo Pronto! Use configurar.bat ou iniciar.bat
pause
