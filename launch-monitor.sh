#!/bin/bash

cd "/Users/irvinbowman/Claude usage/claude-monitor"

# Kill any existing process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo '🚀 Starting Claude Monitor web server...'
echo '📊 Access the monitor at: http://localhost:3000'
echo ''

# Start the web server in the background
node dist/index.js --web-only --plan Max20 &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

# Open the browser
open http://localhost:3000

echo ''
echo '✅ Claude Monitor is running!'
echo '🛑 Press Ctrl+C to stop the server'
echo ''

# Function to cleanup on exit
cleanup() {
    echo ''
    echo '🛑 Stopping Claude Monitor server...'
    kill $SERVER_PID 2>/dev/null || true
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup INT TERM EXIT

# Keep the script running
wait $SERVER_PID