/**
 * Test script to demonstrate rate limiting
 * 
 * This script shows:
 * 1. How rate limiting works
 * 2. What happens when limit is exceeded
 * 3. How to test rate limits
 * 
 * Run: node test-rate-limiting.js
 * 
 * Prerequisites:
 * - Server must be running (npm run dev)
 * - You need a valid access token (register/login first)
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5OGEzNWIxMzUyNzE3ZTAyMTNhNjVjZiIsImVtYWlsIjoidXNlcjFfcmF0ZXRlc3RAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIl0sInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzA2ODQ3ODAsImV4cCI6MTc3MDY4NTY4MCwiYXVkIjoic2tpbGxleGNoYW5nZS1jbGllbnQiLCJpc3MiOiJza2lsbGV4Y2hhbmdlLWFwaSJ9.16Z7AOYndX4HCtPCmL21NiE49WuB6c_ebepRjYzTMds";
let threadId = "698a386b352717e0213a65db";

// Helper function to make HTTP requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = options.headers || {};
    
    if (accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            headers: res.headers, 
            body: json 
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testRateLimiting() {
  console.log('=== Rate Limiting Test ===\n');
  
  // Step 1: Get access token (you need to register/login first)
  console.log('⚠️  IMPORTANT: You need to register/login first to get an access token');
  console.log('   Set accessToken variable in this script, or register a user first\n');
  
  if (!accessToken) {
    console.log('Example: Register a user first:');
    console.log('  POST /api/auth/register');
    console.log('  Then set accessToken = "your-token-here"\n');
    return;
  }

  // Step 2: Create a thread (if needed)
  if (!threadId) {
    console.log('Creating a test thread...');
    // You'll need to provide a valid recipientId
    // For now, we'll skip this and test with an existing thread
    console.log('⚠️  Set threadId variable or create a thread first\n');
    return;
  }

  // Step 3: Test message rate limiting
  console.log('Testing message rate limiting (10 messages per minute)...\n');
  console.log('Sending 15 messages rapidly...\n');

  let successCount = 0;
  let rateLimitedCount = 0;

  for (let i = 1; i <= 15; i++) {
    try {
      const response = await makeRequest(`/api/messages/threads/${threadId}/messages`, {
        method: 'POST',
        body: {
          content: `Test message ${i} - Rate limiting test`
        }
      });

      if (response.status === 201) {
        successCount++;
        const remaining = response.headers['x-ratelimit-remaining'];
        const limit = response.headers['x-ratelimit-limit'];
        console.log(`✓ Message ${i}: Success (Remaining: ${remaining}/${limit})`);
      } else if (response.status === 429) {
        rateLimitedCount++;
        const retryAfter = response.headers['retry-after'];
        console.log(`✗ Message ${i}: Rate limited! (Status: 429)`);
        console.log(`  Error: ${response.body.error?.message || 'Rate limit exceeded'}`);
        console.log(`  Retry after: ${retryAfter} seconds`);
        console.log(`  Limit: ${response.body.error?.limit || 'N/A'}`);
        console.log(`  Window: ${response.body.error?.window || 'N/A'}\n`);
        break; // Stop after first rate limit
      } else {
        console.log(`✗ Message ${i}: Failed (Status: ${response.status})`);
        console.log(`  Error: ${JSON.stringify(response.body)}\n`);
        break;
      }

      // Small delay to see progress
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log(`✗ Message ${i}: Error - ${error.message}\n`);
      break;
    }
  }

  console.log('\n=== Test Results ===');
  console.log(`Successful messages: ${successCount}`);
  console.log(`Rate limited: ${rateLimitedCount}`);
  console.log(`\nExpected: First 10 messages succeed, 11th gets rate limited\n`);

  // Step 4: Show rate limit headers
  console.log('=== Rate Limit Headers ===');
  console.log('When a request succeeds, you get these headers:');
  console.log('  X-RateLimit-Limit: Maximum requests allowed');
  console.log('  X-RateLimit-Remaining: Requests remaining in window');
  console.log('  X-RateLimit-Reset: Unix timestamp when limit resets');
  console.log('\nWhen rate limited (429), you get:');
  console.log('  Retry-After: Seconds until you can try again');
  console.log('  Error body with details about the limit\n');
}

// Instructions for manual testing
console.log(`
=== Manual Testing Instructions ===

1. Start your server:
   cd backend
   npm run dev

2. Register a user and get access token:
   POST http://localhost:3001/api/auth/register
   {
     "email": "test@example.com",
     "password": "Test123!@#",
     "displayName": "Test User"
   }
   Copy the accessToken from response

3. Create a thread (or use existing):
   POST http://localhost:3001/api/messages/threads
   {
     "recipientId": "other-user-id",
     "content": "Test thread"
   }
   Copy the threadId from response

4. Update this script:
   - Set accessToken variable
   - Set threadId variable

5. Run this test:
   node test-rate-limiting.js

6. Expected behavior:
   - First 10 messages: ✅ Success (200/201)
   - 11th message: ❌ Rate limited (429)
   - Wait 60 seconds
   - 11th message: ✅ Success (limit reset)

=== Testing with cURL ===

# Send 15 messages rapidly
for i in {1..15}; do
  echo "Sending message $i..."
  curl -X POST http://localhost:3001/api/messages/threads/THREAD_ID/messages \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d "{\\"content\\": \\"Message $i\\"}"
  echo ""
  sleep 0.1
done

# Watch for 429 responses after 10 messages
`);

// Run test if token and thread are set
if (accessToken && threadId) {
  testRateLimiting().catch(console.error);
} else {
  console.log('\n⚠️  Set accessToken and threadId variables to run the test\n');
}
