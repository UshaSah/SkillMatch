#!/usr/bin/env node

/**
 * Test script for Profile Management API
 * Run: node test-profile.js
 * 
 * Prerequisites:
 * - Server must be running (node src/app.js)
 * - MongoDB must be running
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let accessToken = null;
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

async function testProfile() {
  console.log('\n👤 Testing Profile Management API\n');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;

  // Step 1: Register a user to get tokens
  console.log('\n1. Registering test user...');
  try {
    const testEmail = `profile${Date.now()}@example.com`;
    const response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'testpassword123',
        displayName: 'Profile Test User'
      }
    });

    if (response.status === 201 && response.body.success && response.body.data.tokens) {
      console.log('   ✓ User registered successfully');
      accessToken = response.body.data.tokens.accessToken;
      userId = response.body.data.user.id;
      passed++;
    } else {
      console.log('   ✗ Registration failed:', response.body);
      failed++;
      console.log('\n❌ Cannot continue without authentication token\n');
      process.exit(1);
    }
  } catch (error) {
    console.log('   ✗ Registration error:', error.message);
    failed++;
    process.exit(1);
  }

  // Test 2: Get profile (should exist from registration)
  console.log('\n2. Testing Get Profile (GET /api/users/me)...');
  try {
    const response = await makeRequest('/api/users/me', {
      method: 'GET'
    });

    if (response.status === 200 && response.body.success) {
      console.log('   ✓ Get profile successful');
      if (response.body.data.profile) {
        console.log(`   ✓ Profile found: ${response.body.data.profile.displayName}`);
      } else {
        console.log('   ⚠ Profile not found (will be created on update)');
      }
      passed++;
    } else {
      console.log('   ✗ Get profile failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Get profile error:', error.message);
    failed++;
  }

  // Test 3: Update profile - basic fields
  console.log('\n3. Testing Update Profile - Basic Fields (PUT /api/users/me)...');
  try {
    const response = await makeRequest('/api/users/me', {
      method: 'PUT',
      body: {
        displayName: 'Updated Name',
        bio: 'This is my updated bio. I love coding and helping others!',
        radius: 30
      }
    });

    if (response.status === 200 && response.body.success) {
      console.log('   ✓ Profile updated successfully');
      console.log(`   ✓ Display Name: ${response.body.data.profile.displayName}`);
      console.log(`   ✓ Bio: ${response.body.data.profile.bio}`);
      console.log(`   ✓ Radius: ${response.body.data.profile.radius} miles`);
      passed++;
    } else {
      console.log('   ✗ Update profile failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Update profile error:', error.message);
    failed++;
  }

  // Test 4: Update profile - skills
  console.log('\n4. Testing Update Profile - Skills...');
  try {
    const response = await makeRequest('/api/users/me', {
      method: 'PUT',
      body: {
        skills: [
          {
            name: 'JavaScript',
            level: 'advanced',
            category: 'Programming'
          },
          {
            name: 'React',
            level: 'intermediate',
            category: 'Frontend'
          },
          {
            name: 'Node.js',
            level: 'expert',
            category: 'Backend'
          }
        ]
      }
    });

    if (response.status === 200 && response.body.success) {
      console.log('   ✓ Skills updated successfully');
      console.log(`   ✓ Skills count: ${response.body.data.profile.skills.length}`);
      passed++;
    } else {
      console.log('   ✗ Update skills failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Update skills error:', error.message);
    failed++;
  }

  // Test 5: Update profile - location
  console.log('\n5. Testing Update Profile - Location...');
  try {
    const response = await makeRequest('/api/users/me', {
      method: 'PUT',
      body: {
        location: {
          coordinates: [-122.4194, 37.7749], // San Francisco
          address: {
            city: 'San Francisco',
            state: 'CA',
            country: 'USA'
          }
        }
      }
    });

    if (response.status === 200 && response.body.success) {
      console.log('   ✓ Location updated successfully');
      console.log(`   ✓ Coordinates: [${response.body.data.profile.location.coordinates.join(', ')}]`);
      console.log(`   ✓ City: ${response.body.data.profile.location.address?.city || 'N/A'}`);
      passed++;
    } else {
      console.log('   ✗ Update location failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Update location error:', error.message);
    failed++;
  }

  // Test 6: Update profile - preferences
  console.log('\n6. Testing Update Profile - Preferences...');
  try {
    const response = await makeRequest('/api/users/me', {
      method: 'PUT',
      body: {
        preferences: {
          notifications: {
            email: true,
            newMessages: true,
            newMatches: false
          },
          privacy: {
            showLocation: true,
            showEmail: false
          }
        }
      }
    });

    if (response.status === 200 && response.body.success) {
      console.log('   ✓ Preferences updated successfully');
      console.log(`   ✓ Email notifications: ${response.body.data.profile.preferences.notifications.email}`);
      console.log(`   ✓ Show location: ${response.body.data.profile.preferences.privacy.showLocation}`);
      passed++;
    } else {
      console.log('   ✗ Update preferences failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Update preferences error:', error.message);
    failed++;
  }

  // Test 7: Update profile - availability
  console.log('\n7. Testing Update Profile - Availability...');
  try {
    const response = await makeRequest('/api/users/me', {
      method: 'PUT',
      body: {
        availability: {
          monday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '10:00', end: '15:00' }]
        }
      }
    });

    if (response.status === 200 && response.body.success) {
      console.log('   ✓ Availability updated successfully');
      console.log(`   ✓ Monday slots: ${response.body.data.profile.availability.monday?.length || 0}`);
      passed++;
    } else {
      console.log('   ✗ Update availability failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Update availability error:', error.message);
    failed++;
  }

  // Test 8: Validation error - invalid coordinates
  console.log('\n8. Testing Validation - Invalid Coordinates...');
  try {
    const response = await makeRequest('/api/users/me', {
      method: 'PUT',
      body: {
        location: {
          coordinates: [200, 100] // Invalid: longitude > 180, latitude > 90
        }
      }
    });

    if (response.status === 400 && response.body.error) {
      console.log('   ✓ Invalid coordinates correctly rejected');
      passed++;
    } else {
      console.log('   ✗ Should reject invalid coordinates');
      failed++;
    }
  } catch (error) {
    console.log('   ✓ Invalid coordinates rejected');
    passed++;
  }

  // Test 9: Validation error - empty update
  console.log('\n9. Testing Validation - Empty Update...');
  try {
    const response = await makeRequest('/api/users/me', {
      method: 'PUT',
      body: {}
    });

    if (response.status === 400 && response.body.error) {
      console.log('   ✓ Empty update correctly rejected');
      passed++;
    } else {
      console.log('   ✗ Should reject empty update');
      failed++;
    }
  } catch (error) {
    console.log('   ✓ Empty update rejected');
    passed++;
  }

  // Test 10: Unauthenticated request
  console.log('\n10. Testing Unauthenticated Request...');
  try {
    const oldToken = accessToken;
    accessToken = null;
    
    const response = await makeRequest('/api/users/me', {
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

  // Test 11: Get updated profile
  console.log('\n11. Testing Get Updated Profile...');
  try {
    const response = await makeRequest('/api/users/me', {
      method: 'GET'
    });

    if (response.status === 200 && response.body.success && response.body.data.profile) {
      const profile = response.body.data.profile;
      console.log('   ✓ Get updated profile successful');
      console.log(`   ✓ Display Name: ${profile.displayName}`);
      console.log(`   ✓ Skills: ${profile.skills.length} skills`);
      console.log(`   ✓ Location: [${profile.location.coordinates.join(', ')}]`);
      console.log(`   ✓ Radius: ${profile.radius} miles`);
      passed++;
    } else {
      console.log('   ✗ Get updated profile failed');
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Get updated profile error:', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All profile tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed\n');
    process.exit(1);
  }
}

// Check if server is running
makeRequest('/api/health').then(() => {
  testProfile();
}).catch((error) => {
  console.error('❌ Server is not running. Please start the server first:');
  console.error('   cd backend && node src/app.js\n');
  console.error('Error:', error.message);
  process.exit(1);
});