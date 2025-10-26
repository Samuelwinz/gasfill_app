#!/bin/bash
# Quick Backend Startup Script for Unix/Linux/Mac

echo "🚀 Starting GasFill Payment Backend..."
echo "📍 Server will run on: http://localhost:3000"
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🔄 Starting payment server..."
node local-payment-server.js