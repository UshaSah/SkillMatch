# Testing Rate Limiting with Postman

## 📋 Prerequisites

1. **Postman installed** (download from [postman.com](https://www.postman.com/downloads/))
2. **Server running** (`npm run dev` in backend folder)
3. **Server URL**: `http://localhost:3001`

---

## 🎯 Step-by-Step Guide

### Step 1: Set Up Postman Environment (Optional but Recommended)

1. Click **"Environments"** in left sidebar (or `Cmd/Ctrl + E`)
2. Click **"+"** to create new environment
3. Name it: `SkillMatch Local`
4. Add variables:
   - `base_url`: `http://localhost:3001`
   - `token_user1`: (leave empty, will set after registration)
   - `token_user2`: (leave empty, will set after registration)
   - `user1_id`: (leave empty)
   - `user2_id`: (leave empty)
   - `thread_id`: (leave empty)
5. Click **"Save"**
6. Select this environment from dropdown (top right)

**Why?** Makes it easier to reuse values across requests.

---

### Step 2: Register User 1

1. **Create new request** (or use existing)
2. **Method**: `POST`
3. **URL**: `http://localhost:3001/api/auth/register`
   - Or use: `{{base_url}}/api/auth/register` (if using environment)
4. **Headers**: 
   - `Content-Type`: `application/json`
5. **Body** (select "raw" → "JSON"):
   ```json
   {
     "email": "user1_ratetest@example.com",
     "password": "Test123!@#",
     "displayName": "Rate Test User 1"
   }
   ```
6. Click **"Send"**

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user1_ratetest@example.com",
      ...
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "..."
    }
  }
}
```

**Save the values:**
- Copy `accessToken` → Save as `token_user1` in environment
- Copy `user.id` → Save as `user1_id` in environment

---

### Step 3: Register User 2

1. **Duplicate** the previous request (right-click → Duplicate)
2. **Change Body**:
   ```json
   {
     "email": "user2_ratetest@example.com",
     "password": "Test123!@#",
     "displayName": "Rate Test User 2"
   }
   ```
3. Click **"Send"**

**Save the values:**
- Copy `accessToken` → Save as `token_user2` in environment
- Copy `user.id` → Save as `user2_id` in environment

---

### Step 4: Create a Thread

1. **Create new request**
2. **Method**: `POST`
3. **URL**: `http://localhost:3001/api/messages/threads`
4. **Headers**:
   - `Content-Type`: `application/json`
   - `Authorization`: `Bearer {{token_user1}}`
     - Or manually: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
5. **Body** (raw → JSON):
   ```json
   {
     "recipientId": "{{user2_id}}",
     "content": "Test thread for rate limiting"
   }
   ```
6. Click **"Send"**

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "thread": {
      "_id": "507f1f77bcf86cd799439012",
      ...
    },
    "message": {
      "_id": "507f1f77bcf86cd799439013",
      ...
    }
  }
}
```

**Save the value:**
- Copy `thread._id` → Save as `thread_id` in environment

---

### Step 5: Test Rate Limiting - Send Messages

Now we'll send multiple messages rapidly to test rate limiting.

#### Option A: Using Postman Collection Runner (Recommended)

1. **Create a Collection**:
   - Click **"Collections"** in left sidebar
   - Click **"+"** → Name it: `Rate Limiting Test`

2. **Create Request in Collection**:
   - Right-click collection → **"Add Request"**
   - Name: `Send Message`
   - **Method**: `POST`
   - **URL**: `http://localhost:3001/api/messages/threads/{{thread_id}}/messages`
   - **Headers**:
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer {{token_user1}}`
   - **Body** (raw → JSON):
     ```json
     {
       "content": "Rate limit test message"
     }
     ```

3. **Run Collection**:
   - Click on collection → Click **"Run"** button (top right)
   - **Iterations**: `15` (to send 15 messages)
   - **Delay**: `100` ms (between requests)
   - Click **"Run Rate Limiting Test"**

4. **Watch Results**:
   - You'll see 15 requests execute
   - First 10 should be **201** (Success)
   - 11th should be **429** (Rate Limited)
   - Check the **"Status"** column

#### Option B: Manual Testing (Send One by One)

1. **Create new request**
2. **Method**: `POST`
3. **URL**: `http://localhost:3001/api/messages/threads/{{thread_id}}/messages`
4. **Headers**:
   - `Content-Type`: `application/json`
   - `Authorization`: `Bearer {{token_user1}}`
5. **Body** (raw → JSON):
   ```json
   {
     "content": "Message 1"
   }
   ```
6. Click **"Send"** repeatedly (10+ times)

**Watch for:**
- First 10: Status `201 Created`
- 11th: Status `429 Too Many Requests`

---

### Step 6: Check Rate Limit Headers

After each successful request, check the **Headers** tab in response:

**Look for:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1640995200
```

**What they mean:**
- `X-RateLimit-Limit`: Maximum requests allowed (10)
- `X-RateLimit-Remaining`: How many requests left (decreases: 9, 8, 7...)
- `X-RateLimit-Reset`: Unix timestamp when limit resets

**When rate limited (429), check:**
```
Retry-After: 45
```

This tells you how many seconds to wait before trying again.

---

## 📊 What to Look For

### ✅ Success Response (201)

**Status Code**: `201 Created`

**Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1640995200
```

**Body:**
```json
{
  "success": true,
  "data": {
    "message": {
      "_id": "...",
      "content": "Message 1",
      ...
    }
  }
}
```

---

### 🚫 Rate Limited Response (429)

**Status Code**: `429 Too Many Requests`

**Headers:**
```
Retry-After: 45
```

**Body:**
```json
{
  "success": false,
  "error": {
    "message": "You are sending messages too quickly. Please wait a moment before sending another message.",
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 45,
    "limit": 10,
    "window": "60s"
  },
  "requestId": "...",
  "timestamp": "2026-02-08T..."
}
```

---

## 🎯 Testing Different Rate Limits

### Test 1: Message Sending (10 per minute)

**Endpoint**: `POST /api/messages/threads/:id/messages`

**Steps:**
1. Send 15 messages rapidly
2. Expected: 10 succeed, 11th gets 429

---

### Test 2: Thread Creation (5 per 15 minutes)

**Endpoint**: `POST /api/messages/threads`

**Steps:**
1. Create 7 threads rapidly (with different recipientIds)
2. Expected: 5 succeed, 6th gets 429

**Note**: You'll need multiple recipient user IDs for this test.

---

### Test 3: General API (60 per minute)

**Endpoint**: `GET /api/messages/threads`

**Steps:**
1. Use Collection Runner
2. Create request: `GET /api/messages/threads`
3. Run 65 iterations
4. Expected: 60 succeed, 61st gets 429

---

## 🔍 Advanced: Using Postman Pre-request Scripts

You can automate testing with scripts:

1. **Create Collection** with request: `Send Message`
2. **Add Pre-request Script** to collection:
   ```javascript
   // Set message number
   pm.collectionVariables.set("messageNumber", 
     (pm.collectionVariables.get("messageNumber") || 0) + 1
   );
   ```
3. **Update Request Body**:
   ```json
   {
     "content": "Message {{messageNumber}}"
   }
   ```
4. **Run Collection** with 15 iterations

---

## 📝 Postman Collection JSON (Import Ready)

Save this as `RateLimitingTest.postman_collection.json`:

```json
{
  "info": {
    "name": "Rate Limiting Test",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register User 1",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user1_ratetest@example.com\",\n  \"password\": \"Test123!@#\",\n  \"displayName\": \"Rate Test User 1\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/auth/register",
          "host": ["{{base_url}}"],
          "path": ["api", "auth", "register"]
        }
      }
    },
    {
      "name": "Register User 2",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user2_ratetest@example.com\",\n  \"password\": \"Test123!@#\",\n  \"displayName\": \"Rate Test User 2\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/messages/threads",
          "host": ["{{base_url}}"],
          "path": ["api", "auth", "register"]
        }
      }
    },
    {
      "name": "Create Thread",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token_user1}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"recipientId\": \"{{user2_id}}\",\n  \"content\": \"Test thread for rate limiting\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/messages/threads",
          "host": ["{{base_url}}"],
          "path": ["api", "messages", "threads"]
        }
      }
    },
    {
      "name": "Send Message",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token_user1}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"content\": \"Rate limit test message\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/messages/threads/{{thread_id}}/messages",
          "host": ["{{base_url}}"],
          "path": ["api", "messages", "threads", "{{thread_id}}", "messages"]
        }
      }
    }
  ]
}
```

**To import:**
1. Postman → **Import** (top left)
2. Select file or paste JSON
3. Click **Import**

---

## ✅ Verification Checklist

After testing, verify:

- [ ] User 1 can send 10 messages successfully
- [ ] 11th message returns 429 error
- [ ] Error message is clear and helpful
- [ ] Headers show rate limit info (`X-RateLimit-*`)
- [ ] `Retry-After` header is present when rate limited
- [ ] After waiting 60 seconds, can send again
- [ ] User 2 has separate rate limit (can also send 10)

---

## 🐛 Troubleshooting

### Issue: All requests return 201 (no rate limiting)

**Check:**
- Is rate limiter middleware applied? (check `routes/messages.js`)
- Are you sending requests fast enough? (need >10 in 60 seconds)
- Is authentication working? (rate limiter needs `req.user._id`)

### Issue: Getting 401 instead of 429

**Problem**: Authentication failing before rate limiter
**Fix**: Make sure `Authorization: Bearer TOKEN` header is correct

### Issue: Rate limit resets immediately

**Note**: In development, rate limiter uses memory (resets on server restart)
**Expected**: This is normal. In production, use Redis for persistence.

---

## 🎓 Learning Tips

1. **Watch the Headers**: `X-RateLimit-Remaining` decreases with each request
2. **Check Status Codes**: 201 = success, 429 = rate limited
3. **Read Error Messages**: They tell you exactly what happened
4. **Test Different Users**: Each user has separate limits
5. **Wait and Retry**: After hitting limit, wait 60 seconds and try again

Happy testing! 🚀
