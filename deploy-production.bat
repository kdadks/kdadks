@echo off
REM Production Deployment Script for KDADKS with reCAPTCHA Enterprise

echo 🚀 KDADKS Production Deployment Script
echo ======================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    exit /b 1
)

REM Check if credentials exist
if not exist "etc\credentials\google-service-account.json" (
    echo ❌ Error: Google Cloud service account credentials not found at etc\credentials\google-service-account.json
    echo Please copy your service account JSON file to this location.
    exit /b 1
)

echo ✅ Credentials found

REM Check if production environment file exists
if not exist ".env.production" (
    echo ❌ Error: .env.production file not found
    exit /b 1
)

echo ✅ Production environment configuration found

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Error: Failed to install dependencies
    exit /b 1
)

echo ✅ Dependencies installed

REM Copy production environment
echo 🔧 Setting up production environment...
copy .env.production .env

echo ✅ Production environment activated

REM Build the application
echo 🏗️ Building application...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Error: Build failed
    exit /b 1
)

echo ✅ Build completed successfully

REM Test if built files exist
if not exist "dist" (
    echo ❌ Error: Build output directory 'dist' not found
    exit /b 1
)

echo ✅ Build output verified

echo.
echo 🎉 Production deployment ready!
echo.
echo Next steps:
echo 1. Upload the 'dist' directory to your web server
echo 2. Configure your server to serve the index.html file
echo 3. Set up the backend API server with the same environment variables
echo.
echo For testing locally:
echo   npm run preview
echo.
echo 📊 Build Information:
echo   Build directory: .\dist
echo   reCAPTCHA Enterprise: Enabled
echo   Environment: Production
echo.
