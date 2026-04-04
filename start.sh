#!/bin/bash

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       ROYAL SUITES — Starting        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check MongoDB is running
echo "⏳ Checking MongoDB..."
if ! mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
  echo "⚠️  MongoDB is not running. Starting it..."
  net start MongoDB 2>/dev/null || echo "   → Could not auto-start MongoDB. Please start it manually."
else
  echo "✅ MongoDB is running"
fi

echo ""
echo "🚀 Starting Server (port 5000) and Web (port 3000)..."
echo ""

# Start server in background
cd apps/server && npm run dev &
SERVER_PID=$!

# Start web in background
cd ../web && npm run dev &
WEB_PID=$!

echo "┌─────────────────────────────────────┐"
echo "│  Frontend → http://localhost:3000   │"
echo "│  Backend  → http://localhost:5000   │"
echo "│                                     │"
echo "│  Press Ctrl+C to stop both          │"
echo "└─────────────────────────────────────┘"
echo ""

# On Ctrl+C, kill both
trap "echo ''; echo 'Stopping...'; kill $SERVER_PID $WEB_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
