#!/bin/bash

# KDADKS Website Deployment Script
# This script builds and deploys the website to Netlify

set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not a git repository. Please run 'git init' first."
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit them first."
    echo "Run: git add . && git commit -m 'Your commit message'"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linting..."
npm run lint

# Build the project
echo "🏗️  Building project..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📁 Build files are in the 'dist' directory"
echo ""
echo "📋 Next steps for Netlify deployment:"
echo "1. Commit and push your changes to your Git repository"
echo "2. Connect your repository to Netlify"
echo "3. Netlify will automatically deploy using the netlify.toml configuration"
echo ""
echo "🔧 Manual deployment option:"
echo "1. Drag and drop the 'dist' folder to Netlify's deploy interface"
echo "2. Or use Netlify CLI: npx netlify deploy --prod --dir=dist"
echo ""
echo "🌐 Your site will be available at your Netlify URL once deployed"