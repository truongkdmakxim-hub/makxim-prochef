@echo off
chcp 65001 >nul
title Makxim ProChef - website dang chay (dong cua so nay de tat)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] May chua cai Node.js. Tai tai https://nodejs.org roi chay lai file nay.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Lan dau chay: dang cai dat thu vien, vui long doi...
  call npm install
)

echo.
echo  Website: http://localhost:3000
echo  Quan tri: http://localhost:3000/admin
echo  GIU CUA SO NAY MO trong luc xem web. Dong cua so = tat website.
echo.

rem Mo trinh duyet sau 3 giay, khi server da san sang
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"

call npm start

echo.
echo Website da dung. Neu thay loi "EADDRINUSE" nghia la website DANG CHAY o cua so khac - chi can mo http://localhost:3000
pause
