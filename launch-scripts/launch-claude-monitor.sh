#!/bin/bash

# Set the working directory
cd "/Users/irvinbowman/Claude usage/claude-monitor"

# Kill any existing instance on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start the monitor
node dist/index.js --web-only --plan Max20 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Open in browser
open http://localhost:3000

# Keep running
echo "Claude Monitor is running at http://localhost:3000"
echo "Close this window to stop the monitor"

# Wait for the server process
wait $SERVER_PID