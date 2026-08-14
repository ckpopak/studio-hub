@echo off
setlocal
set "PORT=%PORT%"
if "%PORT%"=="" set "PORT=8765"
set "HOST=%HOST%"
if "%HOST%"=="" set "HOST=127.0.0.1"
cd /d "%~dp0.."
echo Serving studio-hub from %CD%
echo Open http://%HOST%:%PORT%/
python -m http.server %PORT% --bind %HOST% --directory "%CD%"
