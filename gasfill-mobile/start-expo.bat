@echo off
cd /d "%~dp0"
echo Current directory: %cd%
echo Checking for package.json...
dir package.json
echo Starting Expo development server...
npx expo start --clear