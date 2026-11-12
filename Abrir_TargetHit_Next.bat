@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules" (
  echo Installing dependencies...
  call yarn install
)
echo Starting TargetHit Next.js on http://localhost:3000/trade
call yarn dev
pause

