#!/bin/bash

echo "🔧 Fixing bundling errors..."

# Clean node modules and cache
echo "1. Cleaning caches..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .expo-shared

# Reinstall expo-sharing if missing
echo "2. Checking dependencies..."
bun install

# Clear Metro bundler cache
echo "3. Clearing Metro cache..."
bunx expo start --clear

echo "✅ Done! Try running your app again."
