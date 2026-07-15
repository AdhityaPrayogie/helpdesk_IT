@echo off
title Start IT Logbook - Backend + Ngrok + Frontend Lokal
REM ===== SESUAIKAN PATH INI DENGAN LOKASI PROJECT KAMU =====
set BACKEND_PATH=C:\laragon\www\it-logbook\backend
set FRONTEND_PATH=C:\laragon\www\it-logbook\frontend

echo Menjalankan backend...
start "Backend - IT Logbook" cmd /k "cd /d %BACKEND_PATH% && node server.js"
timeout /t 3 /nobreak >nul

echo Menjalankan ngrok (akun 2, untuk akses dari internet)...
start "Ngrok Tunnel" cmd /k "ngrok http 5000 --config "C:/Users/adhitya/.config/ngrok/ngrok2.yml" --traffic-policy-file "C:/Users/adhitya/.config/ngrok/policy.yml""
timeout /t 2 /nobreak >nul

echo Menjalankan frontend lokal (untuk akses dari jaringan lokal)...
start "Frontend Lokal - IT Logbook" cmd /k "cd /d %FRONTEND_PATH% && npm run dev -- --host"

echo.
echo Semua service sudah dijalankan:
echo  - Backend      : http://localhost:8000
echo  - Frontend web (Vercel) tetap online seperti biasa
echo  - Frontend lokal: http://localhost:5173 (juga bisa diakses dari HP/laptop lain se-WiFi lewat IP kamu)
echo  - Ngrok        : cek jendela "Ngrok Tunnel" untuk URL publik terbaru
echo.
pause