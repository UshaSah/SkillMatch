#!/usr/bin/env node

/**
 * Test script for JWT Authentication
 * Run: node test-auth.js
 * 
 * Prerequisites:
 * - Server must be running (node src/app.js)
 * - MongoDB must be running (or use MongoDB Atlas)
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let accessToken = null;
let refreshToken = null;
let userId = null;

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
          resolve({ status: res.statusCode, headers: res.headers, body: json });
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

async function testAuth() {
  console.log('\n🔐 Testing JWT Authentication System\n');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;

  // Test 1: Register new user
  console.log('\n1. Testing User Registration...');
  try {
    const testEmail = `test${Date.now()}@example.com`;
    seededEmail = testEmail;
    const response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'testpassword123',
        displayName: 'Test User'
      }
    });

    if (response.status === 201 && response.body.success && response.body.data.tokens) {
      console.log('   ✓ Registration successful');
      accessToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
      userId = response.body.data.user.id;
      passed++;
    } else {
      console.log('   ✗ Registration failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Registration error:', error.message);
    failed++;
  }

  // Test 2: Try to register duplicate email
  console.log('\n2. Testing Duplicate Email Registration...');
  try {
    const response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: seededEmail,
        password: 'testpassword123',
        displayName: 'Test User'
      }
    });

    if (response.status === 409 || response.status === 400) {
      console.log('   ✓ Duplicate email correctly rejected');
      passed++;
    } else {
      console.log('   ✗ Should reject duplicate email');
      failed++;
    }
  } catch (error) {
    console.log('   ✓ Duplicate email rejected (error expected)');
    passed++;
  }

  // Test 3: Login with valid credentials
  console.log('\n3. Testing Login...');
  try {
    // First register a user
    const testEmail = `login${Date.now()}@example.com`;
    await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'testpassword123',
        displayName: 'Login Test User'
      }
    });

    // Then login
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'testpassword123'
      }
    });

    if (response.status === 200 && response.body.success && response.body.data.tokens) {
      console.log('   ✓ Login successful');
      accessToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
      passed++;
    } else {
      console.log('   ✗ Login failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Login error:', error.message);
    failed++;
  }

  // Test 4: Login with invalid credentials
  console.log('\n4. Testing Invalid Login...');
  try {
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      }
    });

    if (response.status === 401) {
      console.log('   ✓ Invalid credentials correctly rejected');
      passed++;
    } else {
      console.log('   ✗ Should reject invalid credentials');
      failed++;
    }
  } catch (error) {
    console.log('   ✓ Invalid credentials rejected');
    passed++;
  }

  // Test 5: Get current user (authenticated)
  console.log('\n5. Testing Get Current User (Authenticated)...');
  try {
    if (!accessToken) {
      console.log('   ⚠ Skipped (no access token)');
    } else {
      const response = await makeRequest('/api/auth/me', {
        method: 'GET'
      });

      if (response.status === 200 && response.body.success && response.body.data.user) {
        console.log('   ✓ Get current user successful');
        passed++;
      } else {
        console.log('   ✗ Get current user failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Get current user error:', error.message);
    failed++;
  }

  // Test 6: Get current user (unauthenticated)
  console.log('\n6. Testing Get Current User (Unauthenticated)...');
  try {
    const oldToken = accessToken;
    accessToken = null;
    
    const response = await makeRequest('/api/auth/me', {
      method: 'GET'
    });

    accessToken = oldToken;

    if (response.status === 401) {
      console.log('   ✓ Unauthenticated request correctly rejected');
      passed++;
    } else {
      console.log('   ✗ Should reject unauthenticated request');
      failed++;
    }
  } catch (error) {
    console.log('   ✓ Unauthenticated request rejected');
    passed++;
  }

  // Test 7: Refresh token
  console.log('\n7. Testing Token Refresh...');
  try {
    if (!refreshToken) {
      console.log('   ⚠ Skipped (no refresh token)');
    } else {
      const response = await makeRequest('/api/auth/refresh', {
        method: 'POST',
        body: {
          refreshToken: refreshToken
        }
      });

      if (response.status === 200 && response.body.success && response.body.data.tokens) {
        console.log('   ✓ Token refresh successful');
        accessToken = response.body.data.tokens.accessToken;
        refreshToken = response.body.data.tokens.refreshToken;
        passed++;
      } else {
        console.log('   ✗ Token refresh failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Token refresh error:', error.message);
    failed++;
  }

  // Test 8: Logout
  console.log('\n8. Testing Logout...');
  try {
    if (!accessToken) {
      console.log('   ⚠ Skipped (no access token)');
    } else {
      const response = await makeRequest('/api/auth/logout', {
        method: 'POST'
      });

      if (response.status === 200 && response.body.success) {
        console.log('   ✓ Logout successful');
        passed++;
      } else {
        console.log('   ✗ Logout failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Logout error:', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All authentication tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed\n');
    process.exit(1);
  }
}

// Check if server is running
makeRequest('/api/health').then(() => {
  testAuth();
}).catch((error) => {
  console.error('❌ Server is not running. Please start the server first:');
  console.error('   cd backend && node src/app.js\n');
  console.error('Error:', error.message);
  process.exit(1);
});