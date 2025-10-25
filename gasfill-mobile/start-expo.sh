#!/bin/bash
# Expo Start Script
cd "$(dirname "$0")"
echo "Current directory: $(pwd)"
echo "Checking for package.json..."
ls -la package.json
echo "Starting Expo development server..."
npx expo start --clear