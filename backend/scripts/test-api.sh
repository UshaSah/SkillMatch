#!/bin/bash
# Test SkillMatch API as an end user

REGION=${1:-us-east-1}

echo "=========================================="
echo "SkillMatch API End-to-End Test"
echo "=========================================="
echo ""

# Get ALB DNS name
echo "🔍 Finding API URL..."
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --region "$REGION" \
    --query 'LoadBalancers[?contains(LoadBalancerName, `skillmatch`)].DNSName' \
    --output text 2>/dev/null | head -1)

if [ -z "$ALB_DNS" ] || [ "$ALB_DNS" == "None" ]; then
    echo "❌ Could not find ALB. Trying alternative method..."
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --region "$REGION" \
        --query 'LoadBalancers[0].DNSName' \
        --output text 2>/dev/null)
fi

if [ -z "$ALB_DNS" ] || [ "$ALB_DNS" == "None" ]; then
    echo "❌ Error: Could not find Application Load Balancer"
    echo "   Make sure your ALB is created and named 'skillmatch-alb'"
    exit 1
fi

API_URL="http://$ALB_DNS"
echo "✅ API URL: $API_URL"
echo ""

# Test 1: Health Check
echo "=========================================="
echo "Test 1: Health Check"
echo "=========================================="
echo "GET $API_URL/api/health"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/api/health" 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Health check passed (HTTP $HTTP_CODE)"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi

echo ""

# Test 2: Root Endpoint
echo "=========================================="
echo "Test 2: Root Endpoint"
echo "=========================================="
echo "GET $API_URL/"
echo ""

ROOT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/" 2>&1)
HTTP_CODE=$(echo "$ROOT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$ROOT_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Root endpoint working (HTTP $HTTP_CODE)"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
    echo "⚠️  Root endpoint returned HTTP $HTTP_CODE"
    echo "$BODY"
fi

echo ""

# Test 3: Register User (if endpoint exists)
echo "=========================================="
echo "Test 3: User Registration"
echo "=========================================="
echo "POST $API_URL/api/auth/register"
echo ""

# Generate a unique email for testing
TEST_EMAIL="test$(date +%s)@example.com"
TEST_PASSWORD="Test123!@#"
TEST_NAME="Test User"

REGISTER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"displayName\": \"$TEST_NAME\"
    }" 2>&1)

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
    echo "✅ User registration successful (HTTP $HTTP_CODE)"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    
    # Extract token if present
    TOKEN=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)
    if [ -n "$TOKEN" ]; then
        echo ""
        echo "🔑 Token received (saved for next test)"
    fi
else
    echo "⚠️  Registration returned HTTP $HTTP_CODE"
    echo "$BODY"
    if [ "$HTTP_CODE" == "409" ]; then
        echo "   (User already exists - this is OK)"
    fi
fi

echo ""

# Test 4: Login
echo "=========================================="
echo "Test 4: User Login"
echo "=========================================="
echo "POST $API_URL/api/auth/login"
echo ""

LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }" 2>&1)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Login successful (HTTP $HTTP_CODE)"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    
    # Extract token
    TOKEN=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)
    if [ -n "$TOKEN" ]; then
        echo ""
        echo "🔑 Token: ${TOKEN:0:50}..."
        
        # Test 5: Protected Endpoint
        echo ""
        echo "=========================================="
        echo "Test 5: Protected Endpoint (Get Profile)"
        echo "=========================================="
        echo "GET $API_URL/api/users/profile"
        echo ""
        
        PROFILE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
            -X GET "$API_URL/api/users/profile" \
            -H "Authorization: Bearer $TOKEN" \
            2>&1)
        
        HTTP_CODE=$(echo "$PROFILE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
        BODY=$(echo "$PROFILE_RESPONSE" | sed '/HTTP_CODE/d')
        
        if [ "$HTTP_CODE" == "200" ]; then
            echo "✅ Protected endpoint working (HTTP $HTTP_CODE)"
            echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
        else
            echo "⚠️  Protected endpoint returned HTTP $HTTP_CODE"
            echo "$BODY"
        fi
    fi
else
    echo "⚠️  Login returned HTTP $HTTP_CODE"
    echo "$BODY"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "API URL: $API_URL"
echo ""
echo "✅ Health check endpoint: /api/health"
echo "✅ Root endpoint: /"
echo ""
echo "📝 Manual Testing:"
echo "   1. Open in browser: $API_URL/api/health"
echo "   2. Test registration: curl -X POST $API_URL/api/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"Test123!\",\"displayName\":\"Test\"}'"
echo "   3. Test login: curl -X POST $API_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"Test123!\"}'"
echo ""
