# How to Debug Registration Failure - Step-by-Step Guide

## The Bug We Found
- Backend required `displayName` field, but frontend didn't send it
- API response format mismatch between backend and frontend

## How to Discover This Bug Yourself

### Step 1: Check Browser Developer Tools (Network Tab)

**What to do:**
1. Open browser DevTools (F12 or Cmd+Option+I on Mac)
2. Go to **Network** tab
3. Try to register
4. Find the failed request (usually `/api/auth/register`)
5. Click on it to see details

**What to look for:**

#### A. Request Payload (What was sent)
```
Request Payload:
{
  "email": "arushila3211@gmail.com",
  "password": "****"
}
```
**Observation:** Notice `displayName` is missing!

#### B. Response (What came back)
```
Status: 400 Bad Request

Response:
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "displayName",
        "message": "Display name is required"
      }
    ]
  }
}
```
**Observation:** Backend is complaining about missing `displayName`!

### Step 2: Check Browser Console

**What to do:**
1. Open **Console** tab in DevTools
2. Look for error messages

**What you'd see:**
```javascript
POST http://localhost:3001/api/auth/register 400 (Bad Request)
Error: Registration failed
```

**What to do next:**
- Check if there's more detail in the error object
- Look at `err.response.data` in the console

### Step 3: Check Backend Logs

**What to do:**
1. Look at your terminal where backend is running
2. Check for error logs

**What you'd see:**
```json
{
  "timestamp": "2026-03-09 16:30:00",
  "level": "error",
  "message": "Validation failed",
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "displayName",
        "message": "Display name is required"
      }
    ]
  }
}
```

### Step 4: Compare Frontend Code vs Backend Code

**Frontend code check:**
```typescript
// frontend/app/register/page.tsx
const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  // ❌ No displayName field!
});
```

**Backend code check:**
```javascript
// backend/src/validators/authValidator.js
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  displayName: Joi.string().min(2).max(50).required(), // ❌ Required!
});
```

**Observation:** Mismatch! Backend requires `displayName`, frontend doesn't send it.

### Step 5: Trace the Request Flow

**Follow the data flow:**

1. **Frontend Form** → `register/page.tsx`
   - Form collects: email, password, confirmPassword
   - Calls: `registerUser(email, password)`

2. **Frontend Hook** → `hooks/useAuth.tsx`
   - Calls: `authApi.register(email, password)`
   - Sends: `{ email, password }` only

3. **Frontend API** → `lib/api.ts`
   - Makes POST to `/api/auth/register`
   - Sends: `{ email, password }`

4. **Backend Route** → `routes/auth.js`
   - Validates with `registerSchema`
   - Expects: `{ email, password, displayName }` ❌

5. **Backend Validator** → `validators/authValidator.js`
   - Rejects because `displayName` is missing

### Step 6: Use API Testing Tools

**Option A: Test with curl**
```bash
# Test what backend expects
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'

# Response:
# {"success":false,"error":{"message":"Validation failed","code":"VALIDATION_ERROR","details":[{"field":"displayName","message":"Display name is required"}]}}
```

**Option B: Use Postman/Insomnia**
1. Create POST request to `http://localhost:3001/api/auth/register`
2. Send `{ "email": "test@example.com", "password": "test123" }`
3. See validation error response
4. Try adding `displayName` to see if it works

### Step 7: Check API Documentation or Types

**Look for:**
- API documentation files
- TypeScript types/interfaces
- OpenAPI/Swagger specs
- Example requests in tests

**Example test file:**
```javascript
// backend/tests/test-auth.js
const response = await makeRequest('/api/auth/register', {
  method: 'POST',
  body: {
    email: 'test@example.com',
    password: 'test123',
    displayName: 'Test User' // ← Notice this field!
  }
});
```

### Step 8: Add Better Error Handling

**Improve frontend error display:**
```typescript
// In register/page.tsx
catch (err: any) {
  // Show detailed error
  if (err.response?.data?.error?.details) {
    const details = err.response.data.error.details;
    setError(details.map(d => d.message).join(', '));
  } else {
    setError(err.response?.data?.message || 'Registration failed');
  }
}
```

This would show: **"Display name is required"** instead of just "Registration failed"

### Step 9: Use Debugging Statements

**Add console.logs strategically:**

**Frontend:**
```typescript
const register = async (email: string, password: string) => {
  console.log('Registering with:', { email, password }); // What we're sending
  const response = await authApi.register(email, password);
  console.log('Registration response:', response); // What we got back
};
```

**Backend:**
```javascript
const register = async (req, res, next) => {
  console.log('Registration request body:', req.body); // What we received
  const { email, password, displayName } = req.body;
  console.log('Extracted values:', { email, password, displayName }); // What we extracted
  // ...
};
```

### Step 10: Check Related Files

**When you see a validation error, check:**
1. Validator file: `backend/src/validators/authValidator.js`
2. Controller file: `backend/src/controllers/authController.js`
3. Model file: `backend/src/models/User.js` (check required fields)
4. Frontend form: `frontend/app/register/page.tsx`
5. Frontend API: `frontend/lib/api.ts`

## Quick Debugging Checklist

When something fails, always check:

- [ ] **Browser Network Tab** - What was sent? What was received?
- [ ] **Browser Console** - Any JavaScript errors?
- [ ] **Backend Logs** - What does the server say?
- [ ] **Request Payload** - Does it match what backend expects?
- [ ] **Response Status** - 400? 401? 500? (tells you the type of error)
- [ ] **Response Body** - What's the actual error message?
- [ ] **Code Comparison** - Frontend vs Backend expectations
- [ ] **Validation Rules** - Check validator schemas
- [ ] **Database Connection** - Is MongoDB connected? (for save operations)

## Common Error Patterns

### 400 Bad Request
- **Cause:** Validation error, missing required fields
- **Fix:** Check validator schema, ensure all required fields are sent

### 401 Unauthorized
- **Cause:** Authentication failed, invalid token
- **Fix:** Check auth token, login again

### 404 Not Found
- **Cause:** Route doesn't exist, wrong URL
- **Fix:** Check route registration, verify URL path

### 500 Internal Server Error
- **Cause:** Server-side error, database connection, code bug
- **Fix:** Check backend logs, database connection, error stack trace

### Network Error
- **Cause:** Backend not running, CORS issue, wrong URL
- **Fix:** Start backend server, check CORS config, verify API URL

## Tools That Help

1. **Browser DevTools** (F12)
   - Network tab: See all HTTP requests
   - Console tab: See JavaScript errors
   - Application tab: See localStorage, cookies

2. **Postman/Insomnia**
   - Test API endpoints directly
   - See exact request/response

3. **curl**
   - Quick command-line API testing
   - Good for automation

4. **Backend Logging**
   - Winston logs in `backend/logs/`
   - Console output in terminal

5. **VS Code Debugger**
   - Set breakpoints in code
   - Step through execution
   - Inspect variables

## Pro Tips

1. **Always check the Network tab first** - It shows you exactly what's happening
2. **Read error messages carefully** - They usually tell you what's wrong
3. **Compare frontend and backend** - Mismatches are common bugs
4. **Use TypeScript types** - They help catch mismatches at compile time
5. **Add detailed error logging** - Makes debugging much easier
6. **Test with API tools** - Isolate frontend vs backend issues
7. **Check validation schemas** - They define the contract between frontend/backend

## Example: How I Would Debug This

1. **See "Registration failed" error** → Open Network tab
2. **See 400 status** → Check response body
3. **See "Validation failed" with "displayName required"** → Check validator
4. **Check validator** → See `displayName` is required
5. **Check frontend form** → See it doesn't have `displayName` field
6. **Found the bug!** → Either add field to frontend or make it optional in backend

The key is: **Follow the error message** - it usually points you in the right direction!
