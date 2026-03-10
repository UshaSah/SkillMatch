#!/bin/bash
# Script to test backend outside Docker environment

echo "🧪 Testing Backend Outside Docker"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "   Make sure you're in the backend directory"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Get current IP
echo "🔍 Checking your current IP address..."
PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || curl -s https://ifconfig.me 2>/dev/null)

if [ -z "$PUBLIC_IP" ]; then
    echo "⚠️  Could not determine IP (will use MongoDB Atlas whitelist)"
else
    echo "✅ Your current IP: $PUBLIC_IP"
    echo "   Make sure this IP is whitelisted in MongoDB Atlas"
    echo ""
fi

echo "🚀 Starting backend server..."
echo "   Press Ctrl+C to stop"
echo ""
echo "📋 Watch for:"
echo "   ✅ 'MongoDB Connected: ...' = Success!"
echo "   ❌ 'Database connection failed' = IP whitelist issue"
echo ""

# Start the server
npm run dev
