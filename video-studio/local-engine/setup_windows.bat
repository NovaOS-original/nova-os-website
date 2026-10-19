@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher was not found. Install Python 3.10-3.12 from https://www.python.org/downloads/windows/
  pause
  exit /b 1
)

py -3.11 -m venv .venv
if errorlevel 1 (
  echo Could not create virtual environment. Make sure Python 3.11 is installed.
  pause
  exit /b 1
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
echo.
echo IMPORTANT: install the CUDA-enabled PyTorch build that matches your NVIDIA driver.
echo Choose the correct command at https://pytorch.org/get-started/locally/
echo Then run: pip install -r requirements.txt
echo.
echo After dependencies are installed, try:
echo python generate.py --prompt "A cinematic aerial shot of a futuristic city at sunset"
echo.
pause
