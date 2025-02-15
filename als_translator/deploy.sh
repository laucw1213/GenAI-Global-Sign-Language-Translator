#!/bin/bash

echo "🚀 Starting deployment..."

# Clean old build files
echo "🧹 Cleaning old build files..."
rm -rf build

# Create new build
echo "🔨 Creating new build..."
npm run build

# Deploy to Firebase
echo "📤 Deploying to Firebase..."
firebase deploy

echo "✅ Deployment complete!"