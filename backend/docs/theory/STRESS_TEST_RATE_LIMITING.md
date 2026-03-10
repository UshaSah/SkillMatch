# Stress Testing Rate Limiting in Postman

## 🎯 Why 10 Iterations All Succeeded

The rate limit is **10 messages per minute**. So:
- ✅ 10 iterations = All succeed (you're at the limit)
- ❌ 11th iteration = Should get rate limited (429)

To properly stress test, you need to send **more than 10 requests**.

---

## 🚀 Method 1: Collection Runner (Recommended)

### Step 1: Create Collection with Send Message Request

1. **Create Collection**: "Rate Limiting Stress Test"
2. **Add Request**: "Send Message"
   - Method: `POST`
   - URL: `http://localhost:3001/api/messages/threads/{{thread_id}}/messages`
   - Headers:
     - `Authorization`: `Bearer {{token_user1}}`
     - `Content-Type`: `application/json`
   - Body:
     ```json
     {
       "content": "Stress test message {{$randomInt}}"
     }
     ```

### Step 2: Run Collection with Many Iterations

1. **Click on Collection** → Click **"Run"** button (top right)
2. **Settings:**
   - **Iterations**: `20` (to send 20 messages)
   - **Delay**: `50` ms (50 milliseconds between requests = very fast)
   - **Data**: None needed
3. Click **"Run Rate Limiting Stress Test"**

### Step 3: Watch Results

**Expected:**
- Requests 1-10: ✅ Status `201` (Success)
- Request 11: 🚫 Status `429` (Rate Limited)
- Requests 12-20: 🚫 Status `429` (Still rate limited)

**Check the Status column** - you should see:
```
Request 1:  201 Created
Request 2:  201 Created
...
Request 10: 201 Created
Request 11: 429 Too Many Requests  ← Rate limit hit!
Request 12: 429 Too Many Requests
...
Request 20: 429 Too Many Requests
```

---

## ⚡ Method 2: Newman (Command Line - More Control)

Newman is Postman's CLI tool for running collections.

### Install Newman
```bash
npm install -g newman
```

### Export Collection
1. In Postman: Collection → **"..."** → **"Export"**
2. Save as `rate-limiting-test.json`

### Run with Newman
```bash
# Run 20 iterations with 50ms delay
newman run rate-limiting-test.json \
  --iteration-count 20 \
  --delay-request 50 \
  --verbose
```

**Benefits:**
- More control over timing
- Better for automation
- Can run in CI/CD

---

## 🔥 Method 3: Rapid Fire Test (Manual)

Send requests as fast as possible:

1. **Create Request**: "Send Message"
2. **Set up request** (URL, headers, body)
3. **Click "Send" repeatedly** (15-20 times)
   - Click Send → Wait for response → Click Send again
   - Do this as fast as you can

**Expected:**
- First 10: Success
- 11th+: Rate limited

---

## 📊 Method 4: Advanced Stress Test (Multiple Users)

Test that each user has separate limits:

### Setup
1. **User 1**: Register, get token1
2. **User 2**: Register, get token2
3. **Create 2 Collections:**
   - Collection 1: "User 1 Messages" (uses token1)
   - Collection 2: "User 2 Messages" (uses token2)

### Run Both Collections
1. Run Collection 1: 15 iterations
2. Run Collection 2: 15 iterations

**Expected:**
- User 1: 10 succeed, 5 rate limited
- User 2: 10 succeed, 5 rate limited
- **Each user has separate limits!**

---

## 🎯 Stress Test Scenarios

### Scenario 1: Rapid Burst (Within 1 Second)

**Goal**: Send all requests as fast as possible

**Setup:**
- Iterations: `15`
- Delay: `0` ms (no delay)

**Expected:**
- First 10 succeed immediately
- 11th+ get 429

**This tests**: Can the rate limiter handle rapid bursts?

---

### Scenario 2: Sustained Load (Over 1 Minute)

**Goal**: Send requests over 60 seconds

**Setup:**
- Iterations: `20`
- Delay: `3000` ms (3 seconds between requests)
- Total time: ~60 seconds

**Expected:**
- Requests 1-10: Succeed
- Request 11: Rate limited (hits limit)
- Wait for window to reset
- Requests 12-20: Some succeed (after reset)

**This tests**: Does the rate limit window reset correctly?

---

### Scenario 3: Concurrent Requests

**Goal**: Send multiple requests at the exact same time

**Setup:**
- Use Postman's **"Run in parallel"** (if available)
- Or use multiple Postman instances
- Send 15 requests simultaneously

**Expected:**
- Exactly 10 succeed
- 5 get rate limited

**This tests**: Race condition handling

---

### Scenario 4: Different Endpoints

**Goal**: Test all rate limiters

**Test 1: Message Sending (10/minute)**
- Endpoint: `POST /api/messages/threads/:id/messages`
- Iterations: `15`
- Expected: 10 succeed, 5 rate limited

**Test 2: Thread Creation (5/15 minutes)**
- Endpoint: `POST /api/messages/threads`
- Iterations: `7`
- Expected: 5 succeed, 2 rate limited

**Test 3: General API (60/minute)**
- Endpoint: `GET /api/messages/threads`
- Iterations: `65`
- Expected: 60 succeed, 5 rate limited

---

## 📈 What to Monitor

### 1. Response Times
- Check **"Time"** column in Collection Runner
- Rate limited requests might be faster (fail fast)
- Successful requests show normal response time

### 2. Rate Limit Headers
After each request, check **Headers** tab:

**Success (201):**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9  (decreases: 9, 8, 7...)
X-RateLimit-Reset: 1640995200
```

**Rate Limited (429):**
```
Retry-After: 45
```

### 3. Error Messages
Check that error messages are clear:
```json
{
  "error": {
    "message": "You are sending messages too quickly...",
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 45,
    "limit": 10,
    "window": "60s"
  }
}
```

---

## 🧪 Advanced: Postman Pre-request Script

Add dynamic message content to track which request:

**Pre-request Script** (in Collection or Request):
```javascript
// Set message number
const messageNum = pm.collectionVariables.get("messageNum") || 0;
pm.collectionVariables.set("messageNum", messageNum + 1);

// Set in request body
pm.variables.set("messageContent", `Stress test message ${messageNum + 1}`);
```

**Request Body:**
```json
{
  "content": "{{messageContent}}"
}
```

This helps track which request succeeded/failed.

---

## 📊 Expected Results Summary

### Test: 20 Messages, 50ms Delay

| Request # | Expected Status | Reason |
|-----------|----------------|--------|
| 1-10 | 201 Created | Within limit (10/minute) |
| 11 | 429 Too Many Requests | Exceeded limit |
| 12-20 | 429 Too Many Requests | Still in same window |

### Test: 20 Messages, 3s Delay (Over 60s)

| Request # | Expected Status | Reason |
|-----------|----------------|--------|
| 1-10 | 201 Created | Within limit |
| 11 | 429 Too Many Requests | Exceeded limit |
| 12-15 | 429 Too Many Requests | Still in window |
| 16-20 | 201 Created | Window reset (after 60s) |

---

## ✅ Verification Checklist

After stress testing, verify:

- [ ] First 10 requests succeed (201)
- [ ] 11th request gets rate limited (429)
- [ ] Error message is clear and helpful
- [ ] Headers show rate limit info (`X-RateLimit-*`)
- [ ] `Retry-After` header is present
- [ ] Different users have separate limits
- [ ] Rate limit resets after window expires
- [ ] No server crashes or errors
- [ ] Response times are reasonable

---

## 🐛 Troubleshooting

### Issue: All 20 requests succeed

**Possible causes:**
1. **Delay too long**: Requests spread over >60 seconds
   - **Fix**: Reduce delay to 50ms or less
2. **Rate limiter not applied**: Check middleware order
   - **Fix**: Verify `messageRateLimiter` is in routes
3. **Different users**: Each request uses different token
   - **Fix**: Use same token for all requests

### Issue: Rate limit triggers too early

**Possible causes:**
1. **Previous test data**: Rate limit already hit
   - **Fix**: Wait 60 seconds or use different user
2. **Server restarted**: Memory-based limiter reset
   - **Note**: This is expected in development

### Issue: Inconsistent results

**Possible causes:**
1. **Race conditions**: Multiple requests at exact same time
   - **Note**: This is normal, rate limiter handles it
2. **Timing issues**: Requests span window boundary
   - **Fix**: Send all requests within 1 second

---

## 🎓 Learning Points

1. **Rate limiting is per user**: Each user has separate limits
2. **Time window matters**: Limit resets after window expires
3. **Rapid bursts are handled**: Rate limiter works even with 0ms delay
4. **Headers provide info**: Use them to show users their limits
5. **Error messages matter**: Clear messages improve UX

---

## 🚀 Next Steps

After stress testing confirms rate limiting works:

1. ✅ Rate limiting is working
2. ⏭️ Move to next improvement:
   - N+1 query problem (performance)
   - Content sanitization (security)
   - Race condition fixes (data consistency)

Happy stress testing! 🎯
