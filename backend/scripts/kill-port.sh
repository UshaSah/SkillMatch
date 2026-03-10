#!/bin/bash
# Script to kill processes running on a specific port
# Usage: ./kill-port.sh [PORT]
# Example: ./kill-port.sh 3001

PORT=${1:-3001}

echo "🔍 Looking for processes on port $PORT..."

# Find processes using the port
PIDS=$(lsof -ti:$PORT)

if [ -z "$PIDS" ]; then
    echo "✅ No processes found on port $PORT"
    exit 0
fi

echo "📋 Found processes: $PIDS"

# Kill the processes
for PID in $PIDS; do
    echo "🛑 Killing process $PID..."
    kill -9 $PID 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Process $PID killed successfully"
    else
        echo "❌ Failed to kill process $PID"
    fi
done

# Verify
sleep 1
REMAINING=$(lsof -ti:$PORT)
if [ -z "$REMAINING" ]; then
    echo "✅ Port $PORT is now free"
else
    echo "⚠️  Some processes may still be running: $REMAINING"
fi
