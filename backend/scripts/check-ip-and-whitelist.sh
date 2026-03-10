#!/bin/bash
# Script to check your current IP and provide MongoDB Atlas whitelist instructions

echo "🔍 Checking your current IP address..."
echo ""

# Get public IP address
PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || curl -s https://ifconfig.me 2>/dev/null || echo "Unable to determine")

if [ "$PUBLIC_IP" = "Unable to determine" ]; then
    echo "❌ Could not determine your public IP address"
    echo "   Please visit: https://www.whatismyip.com/"
    exit 1
fi

echo "✅ Your current public IP address is: $PUBLIC_IP"
echo ""
echo "📋 To add this IP to MongoDB Atlas:"
echo ""
echo "1. Go to: https://cloud.mongodb.com/"
echo "2. Select your project"
echo "3. Click 'Network Access' in the left sidebar"
echo "4. Click 'Add IP Address' button"
echo "5. Enter: $PUBLIC_IP"
echo "   OR click 'Allow Access from Anywhere' (0.0.0.0/0) for development"
echo "6. Click 'Confirm'"
echo ""
echo "⚠️  Note: It may take 1-2 minutes for the change to take effect"
echo ""
echo "🔄 After adding your IP, try connecting again:"
echo "   cd backend && npm run dev"
echo ""

# Option to copy IP to clipboard (macOS)
if command -v pbcopy &> /dev/null; then
    echo "📋 Your IP has been copied to clipboard!"
    echo "$PUBLIC_IP" | pbcopy
fi
