#!/usr/bin/env python3
"""
GasFill Python Server Launcher
Simple script to start the Python backend server
"""

import subprocess
import sys
import os
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import fastapi
        import uvicorn
        import pydantic
        import jwt
        print("✅ All dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("📦 Installing dependencies...")
        return False

def install_dependencies():
    """Install dependencies from requirements.txt"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting GasFill Python Backend Server...")
    print("📊 API Documentation will be available at: http://localhost:5000/api/docs")
    print("🔄 Health Check: http://localhost:5000/api/health")
    print("🛑 Press Ctrl+C to stop the server")
    print("-" * 60)
    
    try:
        # Import and run the server
        import uvicorn
        uvicorn.run(
            "python_server:app",
            host="0.0.0.0",
            port=5000,
            reload=True,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")

def main():
    """Main function"""
    print("🐍 GasFill Python Backend Server Launcher")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("python_server.py").exists():
        print("❌ python_server.py not found in current directory")
        print("📂 Please run this script from the gasfill_app directory")
        return
    
    # Check dependencies
    if not check_dependencies():
        print("📦 Installing required packages...")
        if not install_dependencies():
            print("❌ Failed to install dependencies. Please install manually:")
            print("   pip install fastapi uvicorn pydantic pyjwt websockets")
            return
    
    # Start the server
    start_server()

if __name__ == "__main__":
    main()