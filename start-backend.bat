@echo off
echo Starting AI Job Suite Backend Server...
echo.

cd apps\backend

echo Installing dependencies...
npm install

echo.
echo Starting server...
npm run dev

pause