# Rate Limiting - Learning Guide

## 📚 Concepts Explained

### What is Rate Limiting?

Rate limiting is a technique to control how many requests a user or IP address can make to your API within a specific time period.

**Real-world analogy:** Like a speed limit on a highway - it prevents people from going too fast and causing problems.

---

## 🎯 Why We Need It

### 1. **Prevent Abuse**
Without rate limiting, a malicious user could:
- Send 1000 messages per second
- Spam other users
- Overload your database
- Cause your server to crash

### 2. **Protect Resources**
- Database connections are limited
- Each request uses CPU and memory
- Storage costs money
- Bandwidth costs money

### 3. **Fair Usage**
- Ensures all users get fair access
- Prevents one user from monopolizing resources
- Maintains good performance for everyone

---

## 🔄 Types of Rate Limiting

### 1. **IP-Based Rate Limiting**
```javascript
// Limits by IP address
keyGenerator: (req) => req.ip
```

**Pros:**
- Works for unauthenticated endpoints
- Simple to implement

**Cons:**
- Users can change IPs (VPN, mobile data)
- Multiple users behind same IP (office, school)
- Can block legitimate users

**Use when:** Public endpoints, login attempts

---

### 2. **User-Based Rate Limiting** ⭐ (What we're using)
```javascript
// Limits by authenticated user ID
keyGenerator: (req) => `user:${req.user._id}`
```

**Pros:**
- More accurate (tied to user account)
- Can't be bypassed by changing IP
- Better user experience
- Can track per-user behavior

**Cons:**
- Requires authentication
- Slightly more complex

**Use when:** Authenticated endpoints (messaging, profile updates)

---

### 3. **Token-Based Rate Limiting**
```javascript
// Limits by API key or token
keyGenerator: (req) => req.headers['api-key']
```

**Use when:** API keys, third-party integrations

---

## 📊 How It Works

### Step-by-Step Process

1. **Request arrives**
   ```
   User sends: POST /api/messages/threads/123/messages
   ```

2. **Rate limiter checks**
   ```
   - Extract user ID: "user:507f1f77bcf86cd799439011"
   - Check: How many requests in last 60 seconds?
   - Current count: 8
   - Limit: 10
   - Result: ✅ Allow (8 < 10)
   ```

3. **Request processed**
   ```
   - Increment counter: 8 → 9
   - Process message
   - Return response
   ```

4. **If limit exceeded**
   ```
   - Current count: 10
   - Limit: 10
   - Result: ❌ Block
   - Return: 429 Too Many Requests
   - Headers: Retry-After: 45 (seconds until reset)
   ```

---

## 🛠️ Implementation Details

### Our Rate Limiters

#### 1. **Message Sending** (Strictest)
```javascript
messageRateLimiter: {
  windowMs: 60 * 1000,  // 1 minute window
  max: 10,               // 10 messages max
  key: user._id          // Per user
}
```

**Why 10/minute?**
- Average typing speed: ~40 words/minute
- Average message: ~10 words
- 10 messages = ~100 words = reasonable for 1 minute
- Prevents spam while allowing normal conversation

---

#### 2. **Thread Creation** (Strict)
```javascript
threadCreationRateLimiter: {
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 5,                    // 5 threads max
  key: user._id
}
```

**Why 5 per 15 minutes?**
- Legitimate users rarely create many threads quickly
- Prevents spam thread creation
- Still allows normal use

---

#### 3. **General API** (Moderate)
```javascript
messagingApiRateLimiter: {
  windowMs: 60 * 1000,  // 1 minute window
  max: 60,               // 60 requests max
  key: user._id
}
```

**Why 60/minute?**
- Covers GET requests (less expensive)
- Allows polling/refreshing
- Prevents abuse without blocking normal use

---

## 📈 Rate Limit Headers

When a request is made, the rate limiter adds headers:

```
X-RateLimit-Limit: 10          // Maximum requests allowed
X-RateLimit-Remaining: 3       // Requests remaining in window
X-RateLimit-Reset: 1640995200  // Unix timestamp when limit resets
Retry-After: 45                // Seconds until retry (if exceeded)
```

**Frontend can use these to:**
- Show user how many requests they have left
- Display countdown timer
- Disable button when limit reached

---

## 🧪 Testing Rate Limiting

### Test Script
```javascript
// Send 15 messages rapidly
for (let i = 0; i < 15; i++) {
  await sendMessage(threadId, `Message ${i}`);
  // First 10 succeed
  // Messages 11-15 get 429 error
}
```

### Expected Behavior
- Messages 1-10: ✅ Success (200/201)
- Message 11: ❌ 429 Too Many Requests
- Wait 60 seconds
- Message 11: ✅ Success (limit reset)

---

## 🚀 Production Considerations

### 1. **Storage Backend**

**Current (Memory):**
- Stored in Node.js process memory
- ❌ Lost on server restart
- ❌ Doesn't work with multiple servers

**Production (Redis):**
```javascript
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

rateLimit({
  store: new RedisStore({
    client: client
  }),
  // ... other options
});
```

**Why Redis?**
- ✅ Persists across restarts
- ✅ Works with multiple servers
- ✅ Fast (in-memory database)
- ✅ Can set TTL automatically

---

### 2. **Different Limits for Different Users**

```javascript
// Premium users get higher limits
const getRateLimit = (user) => {
  if (user.isPremium) {
    return { max: 50, windowMs: 60 * 1000 };
  }
  return { max: 10, windowMs: 60 * 1000 };
};
```

---

### 3. **Whitelist Certain Users**

```javascript
skip: (req) => {
  // Admins bypass rate limiting
  return req.user && req.user.role === 'admin';
}
```

---

### 4. **Graceful Degradation**

```javascript
// Instead of hard blocking, slow down responses
if (requestCount > limit * 0.8) {
  // Add small delay
  await sleep(100);
}
```

---

## 📝 Best Practices

### 1. **Choose Appropriate Limits**
- Too strict: Frustrates legitimate users
- Too loose: Doesn't prevent abuse
- **Rule of thumb:** 2-3x normal usage

### 2. **Clear Error Messages**
```javascript
message: 'You are sending messages too quickly. Please wait 45 seconds.'
// ✅ Good: Tells user what to do

message: 'Rate limit exceeded'
// ❌ Bad: User doesn't know what to do
```

### 3. **Return Retry-After Header**
```javascript
Retry-After: 45  // Seconds until they can try again
```

### 4. **Log Rate Limit Violations**
```javascript
if (limitExceeded) {
  logger.warn('Rate limit exceeded', {
    userId: req.user._id,
    endpoint: req.path,
    ip: req.ip
  });
}
```

### 5. **Monitor Rate Limits**
- Track how often limits are hit
- Adjust limits based on data
- Alert on unusual patterns

---

## 🎓 Key Takeaways

1. **Rate limiting is essential** for production APIs
2. **User-based > IP-based** for authenticated endpoints
3. **Different endpoints need different limits**
4. **Use Redis in production** for multi-server setups
5. **Clear error messages** improve user experience
6. **Monitor and adjust** limits based on usage

---

## 🔗 Further Reading

- [express-rate-limit documentation](https://github.com/nfriedly/express-rate-limit)
- [Redis rate limiting patterns](https://redis.io/docs/manual/patterns/rate-limiting/)
- [API rate limiting best practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
