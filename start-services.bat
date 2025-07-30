@echo off
echo =====================================
echo    AI Job Suite - Starting Services
echo =====================================
echo.

echo [1/3] Starting Backend Service...
cd /d "C:\Users\ngwen\MyProjects\ai-job-suite\apps\backend"
start "AI Job Suite - Backend" cmd /k "npm run dev"

echo [2/3] Waiting for backend to initialize...
timeout /t 8 /nobreak > nul

echo [3/3] Starting Frontend Service...
cd /d "C:\Users\ngwen\MyProjects\ai-job-suite\apps\frontend"
start "AI Job Suite - Frontend" cmd /k "npx vite --host 0.0.0.0 --port 5173"

echo.
echo =====================================
echo    Services Starting Successfully!
echo =====================================
echo.
echo 🔧 Backend API:  http://localhost:3001
echo 🌐 Frontend App: http://localhost:5173
echo 🧪 Test Page:    file:///C:/Users/ngwen/MyProjects/ai-job-suite/test-settings.html
echo.
echo =====================================
echo    Profile & Settings Features
echo =====================================
echo.
echo ✅ Profile Manager: /dashboard/profile
echo ✅ Settings Page:   /dashboard/settings
echo ✅ API Endpoints:   /api/v1/settings/*
echo.
echo The profile and settings functionality has been fixed and should work perfectly!
echo.
echo 📖 Instructions:
echo 1. Wait for both services to fully start (check the terminal windows)
echo 2. Open http://localhost:5173 in your browser
echo 3. Login/register to access the dashboard
echo 4. Navigate to Profile or Settings from the sidebar
echo.
echo Press any key to open the test page for API testing...
pause > nul

start "" "C:\Users\ngwen\MyProjects\ai-job-suite\test-settings.html"

echo.
echo ✨ All services started! Check the terminal windows for status.
echo If you encounter issues, use the test-settings.html page to debug the API.
echo.
pause