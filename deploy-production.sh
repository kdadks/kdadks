#!/bin/bash
# Production Deployment Script for KDADKS with reCAPTCHA Enterprise

echo "🚀 KDADKS Production Deployment Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if credentials exist
if [ ! -f "etc/credentials/google-service-account.json" ]; then
    echo "❌ Error: Google Cloud service account credentials not found at etc/credentials/google-service-account.json"
    echo "Please copy your service account JSON file to this location."
    exit 1
fi

echo "✅ Credentials found"

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found"
    exit 1
fi

echo "✅ Production environment configuration found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Copy production environment
echo "🔧 Setting up production environment..."
cp .env.production .env

echo "✅ Production environment activated"

# Build the application
echo "🏗️ Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

# Test if built files exist
if [ ! -d "dist" ]; then
    echo "❌ Error: Build output directory 'dist' not found"
    exit 1
fi

echo "✅ Build output verified"

echo ""
echo "🎉 Production deployment ready!"
echo ""
echo "Next steps:"
echo "1. Upload the 'dist' directory to your web server"
echo "2. Configure your server to serve the index.html file"
echo "3. Set up the backend API server with the same environment variables"
echo ""
echo "For testing locally:"
echo "  npm run preview"
echo ""
echo "📊 Build Information:"
echo "  Build directory: ./dist"
echo "  reCAPTCHA Enterprise: Enabled"
echo "  Environment: Production"
echo ""
