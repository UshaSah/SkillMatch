#!/bin/bash
# Script to help fix MongoDB Atlas IP whitelist issue

echo "🔍 MongoDB Atlas Connection Fix"
echo "================================"
echo ""

# Get public IP address
echo "Checking your current IP address..."
PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || curl -s https://ifconfig.me 2>/dev/null)

if [ -z "$PUBLIC_IP" ]; then
    echo "❌ Could not determine your public IP address"
    echo "   Please visit: https://www.whatismyip.com/"
    exit 1
fi

echo "✅ Your current public IP address is: $PUBLIC_IP"
echo ""

# Copy to clipboard if on macOS
if command -v pbcopy &> /dev/null; then
    echo "$PUBLIC_IP" | pbcopy
    echo "📋 IP address copied to clipboard!"
    echo ""
fi

echo "📋 Steps to fix MongoDB Atlas connection:"
echo ""
echo "1. Go to MongoDB Atlas: https://cloud.mongodb.com/"
echo "2. Select your project"
echo "3. Click 'Network Access' in the left sidebar"
echo "4. Click 'Add IP Address' button"
echo "5. Enter your IP: $PUBLIC_IP"
echo "   OR click 'Allow Access from Anywhere' (0.0.0.0/0) for development"
echo "6. Click 'Confirm'"
echo ""
echo "⚠️  Note: Changes take 1-2 minutes to take effect"
echo ""
echo "🔄 After adding your IP, restart the backend:"
echo "   cd backend && npm run dev"
echo ""
