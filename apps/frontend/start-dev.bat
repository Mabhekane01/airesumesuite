@echo off
echo Starting Frontend with relaxed TypeScript checking...
echo.

set VITE_TS_CONFIG_PATH=tsconfig.dev.json
npx vite --host 0.0.0.0 --port 5173

pause