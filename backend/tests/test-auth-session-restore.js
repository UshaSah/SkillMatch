#!/usr/bin/env node

/**
 * API-level checks for session restore flows (Step 6 backend support).
 * Run: node tests/test-auth-session-restore.js
 * Prerequisites: server on :3001, MongoDB up
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { ...(options.headers || {}) };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    const req = http.request(
      url,
      { method: options.method || 'GET', headers },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function registerUser() {
  const email = `session${Date.now()}@example.com`;
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: { email, password: 'testpassword123', displayName: 'Session Test' },
  });
  if (res.status !== 201 || !res.body?.data?.tokens) {
    throw new Error(`Register failed: ${JSON.stringify(res.body)}`);
  }
  return {
    access: res.body.data.tokens.accessToken,
    refresh: res.body.data.tokens.refreshToken,
  };
}

async function run() {
  console.log('\n🔁 Auth session restore API checks\n');
  let passed = 0;
  let failed = 0;

  const fail = (label, detail) => {
    console.log(`   ✗ ${label}`, detail || '');
    failed++;
  };
  const pass = (label) => {
    console.log(`   ✓ ${label}`);
    passed++;
  };

  let tokens;
  try {
    tokens = await registerUser();
  } catch (e) {
    console.error('❌ Setup failed:', e.message);
    process.exit(1);
  }

  // Simulate refresh-only: no Bearer, then refresh, then getMe
  console.log('\n1. Refresh-only path (no access header → refresh → /auth/me)...');
  try {
    const unauth = await request('/api/auth/me', { method: 'GET' });
    if (unauth.status !== 401) {
      fail('GET /auth/me without token should 401', unauth.status);
    } else {
      pass('GET /auth/me without token returns 401');
    }

    const refreshed = await request('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: tokens.refresh },
    });
    if (
      refreshed.status === 200 &&
      refreshed.body?.success &&
      refreshed.body?.data?.tokens?.accessToken
    ) {
      pass('POST /auth/refresh returns new tokens');
      tokens.access = refreshed.body.data.tokens.accessToken;
      tokens.refresh = refreshed.body.data.tokens.refreshToken;
    } else {
      fail('POST /auth/refresh failed', refreshed.body);
    }

    const me = await request('/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokens.access}` },
    });
    if (me.status === 200 && me.body?.data?.user) {
      pass('GET /auth/me with new access returns user');
    } else {
      fail('GET /auth/me after refresh failed', me.body);
    }
  } catch (e) {
    fail('Refresh-only path error', e.message);
  }

  // Logout revokes refresh
  console.log('\n2. Logout revokes refresh token...');
  try {
    const oldRefresh = tokens.refresh;
    const logout = await request('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.access}` },
    });
    if (logout.status === 200 && logout.body?.success) {
      pass('POST /auth/logout succeeds');
    } else {
      fail('Logout failed', logout.body);
    }

    const revoked = await request('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: oldRefresh },
    });
    if (revoked.status === 401) {
      pass('Old refresh rejected after logout (401)');
    } else {
      fail('Expected 401 for revoked refresh', revoked.status);
    }
  } catch (e) {
    fail('Logout/revoke error', e.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

request('/api/health')
  .then(run)
  .catch((err) => {
    console.error('❌ Server not running on :3001\n', err.message);
    process.exit(1);
  });
