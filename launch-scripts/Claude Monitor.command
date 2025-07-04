#!/bin/bash

# Claude Monitor Launcher
# This script launches the Claude Monitor web interface

# Change to the claude-monitor directory
cd "$(dirname "$0")/.." || exit

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "Building project..."
    npm run build
fi

# Kill any existing instance on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start the web server
echo "Starting Claude Monitor..."
echo "Opening http://localhost:3000 in your browser..."
node dist/index.js --web-only --plan Max20 &

# Wait a moment for the server to start
sleep 2

# Open in default browser
open http://localhost:3000

# Keep the terminal window open
echo ""
echo "Claude Monitor is running. Press Ctrl+C to stop."
echo ""

# Wait for user to close
wait