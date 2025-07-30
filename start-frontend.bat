@echo off
echo Starting AI Job Suite Frontend...
echo.

cd apps\frontend

echo Installing dependencies...
npm install

echo.
echo Starting frontend development server...
npm run dev

pause