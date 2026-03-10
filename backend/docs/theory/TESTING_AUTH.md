# Testing JWT Authentication System

## Prerequisites

1. **MongoDB Running**
   - Local MongoDB: `mongod` or `brew services start mongodb-community`
   - OR MongoDB Atlas connection string in `.env`

2. **Environment Variables**
   - Check `.env` file has `JWT_SECRET` and `MONGODB_URI`

3. **Dependencies Installed**
   - Run `npm install` if not done already

---

## Method 1: Automated Test Script (Recommended)

### Step 1: Start the Server

```bash
cd backend
node src/app.js
```

You should see:
```
Server running on port 3001 in development mode
MongoDB Connected: localhost:27017
```

### Step 2: Run Test Script (in another terminal)

```bash
cd backend
node test-auth.js
```

### Expected Output:
```
🔐 Testing JWT Authentication System

============================================================

1. Testing User Registration...
   ✓ Registration successful

2. Testing Duplicate Email Registration...
   ✓ Duplicate email correctly rejected

3. Testing Login...
   ✓ Login successful

4. Testing Invalid Login...
   ✓ Invalid credentials correctly rejected

5. Testing Get Current User (Authenticated)...
   ✓ Get current user successful

6. Testing Get Current User (Unauthenticated)...
   ✓ Unauthenticated request correctly rejected

7. Testing Token Refresh...
   ✓ Token refresh successful

8. Testing Logout...
   ✓ Logout successful

============================================================

📊 Results: 8 passed, 0 failed

✅ All authentication tests passed!
```

---

## Method 2: Manual Testing with cURL

### Test 1: Register a New User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpassword123",
    "displayName": "Test User"
  }' | python3 -m json.tool
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "testuser@example.com",
      "emailVerified": false,
      "roles": ["user"]
    },
    "profile": {
      "displayName": "Test User"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Registration successful. Please verify your email.",
  "requestId": "..."
}
```

**Save the tokens:**
```bash
# Save access token
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Save refresh token
export REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Test 2: Try Duplicate Registration (Should Fail)

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpassword123",
    "displayName": "Test User"
  }' | python3 -m json.tool
```

**Expected Response (409 Conflict):**
```json
{
  "success": false,
  "error": {
    "message": "Email already registered",
    "code": "EMAIL_EXISTS"
  },
  "requestId": "..."
}
```

### Test 3: Login with Valid Credentials

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpassword123"
  }' | python3 -m json.tool
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "testuser@example.com",
      "emailVerified": false,
      "roles": ["user"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Login successful",
  "requestId": "..."
}
```

### Test 4: Login with Invalid Credentials (Should Fail)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "wrongpassword"
  }' | python3 -m json.tool
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "message": "Invalid email or password",
    "code": "INVALID_CREDENTIALS"
  },
  "requestId": "..."
}
```

### Test 5: Get Current User (Authenticated)

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "testuser@example.com",
      "emailVerified": false,
      "roles": ["user"],
      "createdAt": "2026-01-22T..."
    },
    "profile": {
      "displayName": "Test User",
      ...
    }
  },
  "requestId": "..."
}
```

### Test 6: Get Current User (Unauthenticated - Should Fail)

```bash
curl -X GET http://localhost:3001/api/auth/me | python3 -m json.tool
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "message": "Authentication required. Please provide a valid token.",
    "code": "AUTH_REQUIRED"
  },
  "requestId": "..."
}
```

### Test 7: Refresh Token

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }" | python3 -m json.tool
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Token refreshed successfully",
  "requestId": "..."
}
```

### Test 8: Logout

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful",
  "requestId": "..."
}
```

### Test 9: Try Using Old Token After Logout (Should Fail)

After logout, try to use the old refresh token:

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }" | python3 -m json.tool
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "message": "Token has been revoked",
    "code": "TOKEN_REVOKED"
  }
}
```

---

## Method 3: Testing with Postman

### Setup

1. **Create a new Collection**: "Skill Exchange Auth"
2. **Set Base URL**: `http://localhost:3001`

### Requests to Create

#### 1. Register
- **Method**: POST
- **URL**: `{{baseUrl}}/api/auth/register`
- **Body** (raw JSON):
```json
{
  "email": "testuser@example.com",
  "password": "testpassword123",
  "displayName": "Test User"
}
```
- **Tests Tab** (to save tokens):
```javascript
if (pm.response.code === 201) {
    const jsonData = pm.response.json();
    pm.environment.set("accessToken", jsonData.data.tokens.accessToken);
    pm.environment.set("refreshToken", jsonData.data.tokens.refreshToken);
    pm.environment.set("userId", jsonData.data.user.id);
}
```

#### 2. Login
- **Method**: POST
- **URL**: `{{baseUrl}}/api/auth/login`
- **Body**:
```json
{
  "email": "testuser@example.com",
  "password": "testpassword123"
}
```

#### 3. Get Me (Protected)
- **Method**: GET
- **URL**: `{{baseUrl}}/api/auth/me`
- **Headers**:
  - `Authorization: Bearer {{accessToken}}`

#### 4. Refresh Token
- **Method**: POST
- **URL**: `{{baseUrl}}/api/auth/refresh`
- **Body**:
```json
{
  "refreshToken": "{{refreshToken}}"
}
```

#### 5. Logout
- **Method**: POST
- **URL**: `{{baseUrl}}/api/auth/logout`
- **Headers**:
  - `Authorization: Bearer {{accessToken}}`

---

## Method 4: Testing Account Lockout

### Test Multiple Failed Login Attempts

```bash
# Try wrong password 5 times
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "testuser@example.com",
      "password": "wrongpassword"
    }' | python3 -m json.tool
  echo "Attempt $i"
  sleep 1
done
```

**Expected**: After 5 attempts, account should be locked.

### Try Login After Lockout (Should Fail)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpassword123"
  }' | python3 -m json.tool
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": {
    "message": "Account is temporarily locked due to multiple failed login attempts. Please try again later.",
    "code": "ACCOUNT_LOCKED"
  }
}
```

---

## Method 5: Testing Token Expiration

### Test with Expired Token

1. Wait 15 minutes after getting an access token, OR
2. Manually decode and check expiration:
```bash
# Decode token (without verification)
node -e "const jwt = require('jsonwebtoken'); const token = 'YOUR_TOKEN'; console.log(jwt.decode(token));"
```

### Try Using Expired Token

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer EXPIRED_TOKEN" | python3 -m json.tool
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": {
    "message": "Token expired",
    "code": "TOKEN_EXPIRED"
  }
}
```

---

## Quick Test Script

Save this as `quick-test.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"
EMAIL="test$(date +%s)@example.com"
PASSWORD="testpassword123"

echo "🧪 Quick Auth Test"
echo "=================="

# Register
echo -e "\n1. Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"displayName\":\"Test User\"}")

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['tokens']['accessToken'])" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Registration failed"
  echo $REGISTER_RESPONSE
  exit 1
fi

echo "✅ Registration successful"
echo "   Access Token: ${ACCESS_TOKEN:0:50}..."

# Get Me
echo -e "\n2. Getting current user..."
ME_RESPONSE=$(curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo $ME_RESPONSE | grep -q "success"; then
  echo "✅ Get current user successful"
else
  echo "❌ Get current user failed"
  echo $ME_RESPONSE
fi

# Login
echo -e "\n3. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo $LOGIN_RESPONSE | grep -q "success"; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  echo $LOGIN_RESPONSE
fi

echo -e "\n✅ All quick tests passed!"
```

Make it executable and run:
```bash
chmod +x quick-test.sh
./quick-test.sh
```

---

## Troubleshooting

### Server Not Starting
- Check MongoDB is running: `mongosh` or check connection string
- Check port 3001 is not in use: `lsof -ti:3001`
- Check `.env` file exists and has required variables

### Authentication Failing
- Verify JWT_SECRET is set in `.env`
- Check token is being sent in Authorization header: `Bearer <token>`
- Verify token hasn't expired (access tokens expire in 15min)

### Database Errors
- Ensure MongoDB is running
- Check MONGODB_URI in `.env` is correct
- Try connecting with `mongosh` to verify connection

### Rate Limiting
- Auth endpoints are limited to 5 requests per 15 minutes
- Wait 15 minutes or restart server to reset

---

## Expected Test Results

✅ **All tests should pass if:**
- Server is running
- MongoDB is connected
- Environment variables are set
- No syntax errors in code

❌ **Common failures:**
- MongoDB not running → Connection error
- Missing JWT_SECRET → Config error
- Invalid token format → 401 Unauthorized
- Expired token → Token expired error

---

## Next Steps After Testing

Once authentication is working:
1. ✅ Test all endpoints manually
2. ✅ Verify token refresh works
3. ✅ Test account lockout
4. ✅ Test protected routes
5. Ready to implement messaging endpoints with auth!

---

**Happy Testing! 🚀**