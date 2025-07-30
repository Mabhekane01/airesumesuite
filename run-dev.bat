@echo off
echo Starting AI Job Suite in development mode...
echo.
echo Starting backend and frontend servers...
echo Press Ctrl+C to stop all services
echo.

start "Backend Server" cmd /k "cd apps\backend && npm run dev"
start "Frontend Server" cmd /k "cd apps\frontend && npm run dev"

echo Both servers are starting in separate windows...
echo Backend will be available at: http://localhost:3001
echo Frontend will be available at: http://localhost:5173 or http://localhost:5174
echo.
pause