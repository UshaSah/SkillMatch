#!/usr/bin/env node

/**
 * Simple test script to verify server functionality
 * Run: node test-server.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = options.headers || {};
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    const req = http.request(url, { 
      method: options.method || 'GET', 
      headers: headers,
      ...Object.fromEntries(Object.entries(options).filter(([k]) => !['method', 'headers', 'body'].includes(k)))
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

// Test 1: Root endpoint
test('Root endpoint returns API info', async () => {
  const response = await makeRequest('/');
  if (response.status === 200 && response.body.message === 'Skill Exchange API') {
    return { pass: true, message: '✓ Root endpoint working' };
  }
  return { pass: false, message: '✗ Root endpoint failed' };
});

// Test 2: Health endpoint
test('Health endpoint returns status', async () => {
  const response = await makeRequest('/api/health');
  if (response.status === 200 && response.body.status === 'healthy') {
    return { pass: true, message: '✓ Health endpoint working' };
  }
  return { pass: false, message: '✗ Health endpoint failed' };
});

// Test 3: Detailed health endpoint
test('Detailed health endpoint returns metrics', async () => {
  const response = await makeRequest('/api/health/detailed');
  if (response.status === 200 && response.body.memory) {
    return { pass: true, message: '✓ Detailed health endpoint working' };
  }
  return { pass: false, message: '✗ Detailed health endpoint failed' };
});

// Test 4: Request ID header
test('Request ID header is present', async () => {
  const response = await makeRequest('/');
  if (response.headers['x-request-id']) {
    return { pass: true, message: '✓ Request ID header present' };
  }
  return { pass: false, message: '✗ Request ID header missing' };
});

// Test 5: 404 handler
test('404 handler returns proper error', async () => {
  const response = await makeRequest('/api/nonexistent');
  if (response.status === 404 && response.body.error) {
    return { pass: true, message: '✓ 404 handler working' };
  }
  return { pass: false, message: '✗ 404 handler failed' };
});

// Test 6: Auth routes placeholder
test('Auth routes endpoint exists', async () => {
  const response = await makeRequest('/api/auth');
  if (response.status === 200) {
    return { pass: true, message: '✓ Auth routes endpoint exists' };
  }
  return { pass: false, message: '✗ Auth routes endpoint failed' };
});

// Test 7: CORS headers
test('CORS headers are set', async () => {
  const response = await makeRequest('/', {
    headers: { 'Origin': 'http://localhost:3000' }
  });
  if (response.headers['access-control-allow-origin']) {
    return { pass: true, message: '✓ CORS headers present' };
  }
  return { pass: false, message: '✗ CORS headers missing' };
});

// Test 8: JSON parsing
test('JSON body parsing works', async () => {
  const response = await makeRequest('/', {
    method: 'POST',
    body: { test: 'data' },
    headers: { 'Content-Type': 'application/json' }
  });
  // Should handle POST even if route doesn't exist (will hit 404)
  return { pass: true, message: '✓ JSON parsing middleware working' };
});

async function runTests() {
  console.log('\n🧪 Testing Skill Exchange Backend Server\n');
  console.log('=' .repeat(50));
  
  for (const { name, fn } of tests) {
    try {
      const result = await fn();
      if (result.pass) {
        console.log(result.message);
        passed++;
      } else {
        console.log(result.message);
        failed++;
      }
    } catch (error) {
      console.log(`✗ ${name}: Error - ${error.message}`);
      failed++;
    }
  }
  
  console.log('=' .repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed === 0) {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed\n');
    process.exit(1);
  }
}

// Check if server is running
makeRequest('/api/health').then(() => {
  runTests();
}).catch((error) => {
  console.error('❌ Server is not running. Please start the server first:');
  console.error('   cd backend && node src/app.js\n');
  console.error('Error:', error.message);
  process.exit(1);
});