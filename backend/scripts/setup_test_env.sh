#!/bin/bash
# Setup virtual environment for MongoDB connection testing

echo "Setting up Python virtual environment..."

# Check if venv already exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
else
    echo "Virtual environment already exists."
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r scripts/requirements-test.txt

echo ""
echo "✅ Virtual environment ready!"
echo ""
echo "To use the test script:"
echo "  1. Activate the virtual environment: source venv/bin/activate"
echo "  2. Run the test: python scripts/test_mongodb_connection.py \"<your-connection-string>\""
echo "  3. Deactivate when done: deactivate"
