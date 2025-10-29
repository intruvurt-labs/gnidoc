@echo off
echo.
echo ==============================
echo   Aurebix Bundling Error Fix
echo ==============================
echo.

echo Step 1/4: Clearing Metro and Expo caches...
if exist .expo rmdir /s /q .expo
if exist .expo-shared rmdir /s /q .expo-shared
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist node_modules\.vite rmdir /s /q node_modules\.vite
echo [OK] Caches cleared
echo.

echo Step 2/4: Verifying dependencies...
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Bun is not installed. Please install it first.
    pause
    exit /b 1
)
echo [OK] Bun is installed
echo.

echo Step 3/4: Reinstalling dependencies...
call bun install
echo [OK] Dependencies installed
echo.

echo Step 4/4: Next steps
echo.
echo Now run one of these commands:
echo.
echo For development:
echo   bunx expo start --clear
echo.
echo To reset everything:
echo   bunx expo start --clear --reset-cache
echo.
echo If TypeScript errors persist:
echo   1. Restart your IDE/editor
echo   2. In VS Code: Ctrl+Shift+P - TypeScript: Restart TS Server
echo.
echo [OK] Fix complete!
echo.
pause
