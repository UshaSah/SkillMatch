# Postman Parallel Testing Guide

## 🎯 What is Parallel Execution?

Parallel execution sends multiple requests **at the exact same time**, rather than one after another. This is perfect for:
- Testing race conditions
- Stress testing rate limiters
- Simulating concurrent users
- Finding concurrency bugs

---

## 🚀 Method 1: Postman Collection Runner (Parallel Option)

### Step 1: Set Up Your Collection

1. **Create Collection**: "Rate Limiting Parallel Test"
2. **Add Request**: "Send Message"
   - Method: `POST`
   - URL: `http://localhost:3001/api/messages/threads/{{thread_id}}/messages`
   - Headers:
     - `Authorization`: `Bearer {{token_user1}}`
     - `Content-Type`: `application/json`
   - Body:
     ```json
     {
       "content": "Parallel test message"
     }
     ```

### Step 2: Run Collection in Parallel

1. **Click on Collection** → Click **"Run"** button
2. **Settings:**
   - **Iterations**: `15` (number of requests)
   - **Delay**: `0` ms (no delay = all at once)
   - **Run in parallel**: ✅ **Check this box!**
3. Click **"Run"**

**What happens:**
- All 15 requests are sent **simultaneously**
- Rate limiter processes them concurrently
- Exactly 10 should succeed, 5 should get rate limited

---

## ⚡ Method 2: Postman Runner (Advanced)

### Step 1: Open Collection Runner

1. Click **"Runner"** icon (top left, or `Cmd/Ctrl + R`)
2. Select your collection
3. Configure settings

### Step 2: Enable Parallel Execution

**In Collection Runner:**
1. **Iterations**: Set to `15`
2. **Delay**: Set to `0` ms
3. **Look for "Run in parallel"** checkbox
   - If available, check it
   - If not available, see Method 3 below

### Step 3: Run and Monitor

- Watch requests execute simultaneously
- Check results - should see mix of 201 and 429

---

## 🔧 Method 3: Using Postman Scripts (Most Control)

If Postman doesn't have a built-in parallel option, use scripts:

### Step 1: Create Pre-request Script

**In Collection → Pre-request Script:**

```javascript
// Set request number for tracking
const requestNum = pm.collectionVariables.get("requestNum") || 0;
pm.collectionVariables.set("requestNum", requestNum + 1);
pm.variables.set("messageNum", requestNum + 1);
```

### Step 2: Create Test Script

**In Request → Tests tab:**

```javascript
// Log response for analysis
console.log(`Request ${pm.variables.get("messageNum")}: Status ${pm.response.code}`);
pm.test(`Request ${pm.variables.get("messageNum")} completed`, function () {
    pm.response.to.have.status(201).or.have.status(429);
});
```

### Step 3: Use Newman with Parallel Execution

**Install Newman:**
```bash
npm install -g newman
```

**Run with parallel option:**
```bash
newman run your-collection.json \
  --iteration-count 15 \
  --delay-request 0 \
  --parallel-requests 15
```

**Note:** Newman's `--parallel-requests` sends multiple requests concurrently.

---

## 🎯 Method 4: Multiple Postman Instances (Manual)

### Step 1: Open Multiple Postman Windows

1. Open Postman
2. Duplicate window: `Cmd/Ctrl + Shift + N` (or File → New Window)
3. Repeat to open 3-5 windows

### Step 2: Set Up Each Window

1. **Window 1**: Set up "Send Message" request
2. **Window 2**: Set up same request
3. **Window 3**: Set up same request
4. ... (repeat for more windows)

### Step 3: Send Simultaneously

1. **Countdown**: "3, 2, 1, GO!"
2. **Click "Send"** in all windows at the same time
3. **Watch results** in each window

**Expected:**
- Total requests sent: 15 (5 windows × 3 requests each)
- Exactly 10 should succeed
- 5 should get rate limited

---

## 📊 Method 5: Using Postman CLI (Newman) with Concurrency

### Install Newman
```bash
npm install -g newman
```

### Export Collection
1. In Postman: Collection → **"..."** → **"Export"**
2. Save as `parallel-test.json`

### Run with Concurrency
```bash
# Send 15 requests, 15 at a time (all parallel)
newman run parallel-test.json \
  --iteration-count 15 \
  --delay-request 0 \
  --concurrency 15
```

**What this does:**
- `--iteration-count 15`: Total requests
- `--delay-request 0`: No delay between requests
- `--concurrency 15`: Send all 15 simultaneously

---

## 🧪 Method 6: Using Postman Monitors (Cloud)

### Step 1: Create Monitor

1. In Postman: **"Monitors"** → **"Create Monitor"**
2. Select your collection
3. Configure:
   - **Iterations**: 15
   - **Delay**: 0ms
   - **Parallel execution**: Enable if available

### Step 2: Run Monitor

- Monitors can run in parallel
- Good for scheduled stress tests
- Results stored in Postman cloud

---

## 📈 Understanding Parallel Test Results

### What to Expect

**Test: 15 requests sent simultaneously**

```
Request 1:  201 or 429 (race condition - which one processes first?)
Request 2:  201 or 429
...
Request 10: 201 or 429
Request 11: 429 (definitely rate limited)
Request 12: 429
...
Request 15: 429
```

**Key Point:**
- Exactly **10 requests should succeed** (total)
- Exactly **5 requests should get 429** (total)
- Which specific requests succeed is non-deterministic (race condition)

### Why Results Vary

When requests arrive simultaneously:
1. Rate limiter checks count: "How many requests so far?"
2. Multiple requests might see the same count
3. They all increment the counter
4. Some might succeed, some might get rate limited
5. **Total successful = exactly 10** (the limit)

---

## 🎯 Best Practices for Parallel Testing

### 1. Start Small
- Test with 5-10 parallel requests first
- Verify behavior before scaling up

### 2. Monitor Server
- Watch server logs during test
- Check for errors or crashes
- Monitor CPU/memory usage

### 3. Use Different Users
- Test with multiple user tokens
- Each user should have separate limits
- Verify isolation works

### 4. Check Database
- Verify exactly 10 messages created
- No duplicates or missing messages
- Data consistency maintained

### 5. Analyze Timing
- Successful requests: ~580ms
- Rate limited requests: ~73ms
- All should complete quickly

---

## 🔍 What to Look For

### Success Indicators

✅ **Exactly 10 requests succeed** (not 9, not 11)
✅ **Exactly 5 requests get 429** (not 4, not 6)
✅ **No server errors** (500, crashes)
✅ **No duplicate messages** in database
✅ **Fast response times** (rate limited requests are fast)

### Warning Signs

⚠️ **More than 10 succeed**: Rate limiter not working correctly
⚠️ **Less than 10 succeed**: Rate limiter too strict, or race condition issue
⚠️ **Server errors**: Rate limiter causing problems
⚠️ **Slow responses**: Rate limiter adding too much overhead

---

## 📝 Example: Complete Parallel Test Setup

### Collection Structure

```
Rate Limiting Parallel Test
├── Pre-request Script (Collection level)
│   └── Sets request number
│
└── Send Message (Request)
    ├── Method: POST
    ├── URL: /api/messages/threads/{{thread_id}}/messages
    ├── Headers: Authorization: Bearer {{token}}
    ├── Body: {"content": "Parallel test {{messageNum}}"}
    └── Tests: Logs response status
```

### Run Configuration

```
Iterations: 15
Delay: 0 ms
Run in parallel: ✅ Enabled
Data: None
Environment: SkillMatch Local (selected)
```

### Expected Results

```
Total Requests: 15
Successful (201): 10
Rate Limited (429): 5
Total Time: ~600ms (all complete quickly)
```

---

## 🐛 Troubleshooting

### Issue: Can't Find "Run in Parallel" Option

**Solution:**
- Use Newman CLI with `--concurrency` flag
- Or use multiple Postman windows
- Or use Postman Monitors

### Issue: All Requests Succeed

**Check:**
- Are requests actually parallel? (check timing)
- Is rate limiter applied? (check middleware)
- Are you using same user token? (should be)

### Issue: Inconsistent Results

**Normal:**
- Race conditions cause non-deterministic order
- But total should always be: 10 succeed, 5 rate limited

**If total is wrong:**
- Rate limiter might have race condition bug
- Need to fix with transactions or locks

---

## 🎓 Learning Points

1. **Parallel testing** reveals race conditions
2. **Total success count** should always be exactly 10
3. **Which requests succeed** is non-deterministic
4. **Rate limiter must be thread-safe** for parallel requests
5. **Fail fast** keeps response times low even under load

---

## 🚀 Quick Start Command

**Using Newman (Recommended for Parallel):**

```bash
# Export collection from Postman first
newman run rate-limiting-test.json \
  --iteration-count 15 \
  --delay-request 0 \
  --concurrency 15 \
  --verbose
```

This sends all 15 requests simultaneously and shows detailed results.

---

Happy parallel testing! 🎯
