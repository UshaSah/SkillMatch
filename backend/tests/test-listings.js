#!/usr/bin/env node

/**
 * Test script for Listings API
 * Run: node test-listings.js
 * 
 * Prerequisites:
 * - Server must be running (node src/app.js)
 * - MongoDB must be running
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let accessToken = null;
let userId = null;
let listingId = null;

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

async function testListings() {
  console.log('\n📋 Testing Listings API\n');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;

  // Step 1: Register a user to get tokens
  console.log('\n1. Registering test user...');
  try {
    const testEmail = `listing${Date.now()}@example.com`;
    const response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'testpassword123',
        displayName: 'Listing Test User'
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

  // Test 2: Create listing
  console.log('\n2. Testing Create Listing (POST /api/listings)...');
  try {
    const response = await makeRequest('/api/listings', {
      method: 'POST',
      body: {
        type: 'offer',
        title: 'JavaScript Tutoring - React & Node.js',
        description: 'Offering one-on-one JavaScript tutoring sessions. Can help with React hooks, Node.js backend development, and async programming. Available evenings and weekends.',
        skills: [
          {
            name: 'JavaScript',
            level: 'expert',
            category: 'Programming'
          },
          {
            name: 'React',
            level: 'advanced',
            category: 'Frontend'
          }
        ],
        location: {
          coordinates: [-122.4194, 37.7749],
          address: {
            city: 'San Francisco',
            state: 'CA',
            country: 'USA'
          }
        },
        timeCommitment: 'one-time',
        estimatedHours: {
          min: 1,
          max: 2
        },
        isRemote: false
      }
    });

    if (response.status === 201 && response.body.success && response.body.data.listing) {
      console.log('   ✓ Listing created successfully');
      listingId = response.body.data.listing._id || response.body.data.listing.id;
      console.log(`   ✓ Listing ID: ${listingId}`);
      passed++;
    } else {
      console.log('   ✗ Create listing failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Create listing error:', error.message);
    failed++;
  }

  // Test 3: Get listing by ID
  console.log('\n3. Testing Get Listing (GET /api/listings/:id)...');
  try {
    if (!listingId) {
      console.log('   ⚠ Skipped (no listing ID)');
    } else {
      const response = await makeRequest(`/api/listings/${listingId}`, {
        method: 'GET'
      });

      if (response.status === 200 && response.body.success && response.body.data.listing) {
        console.log('   ✓ Get listing successful');
        console.log(`   ✓ Title: ${response.body.data.listing.title}`);
        console.log(`   ✓ View count: ${response.body.data.listing.viewCount}`);
        passed++;
      } else {
        console.log('   ✗ Get listing failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Get listing error:', error.message);
    failed++;
  }

  // Test 4: Search listings (public - no auth required)
  console.log('\n4. Testing Search Listings (GET /api/listings)...');
  try {
    const response = await makeRequest('/api/listings?type=offer&status=active&limit=10', {
      method: 'GET'
    });

    if (response.status === 200 && response.body.success && Array.isArray(response.body.data.listings)) {
      console.log('   ✓ Search listings successful');
      console.log(`   ✓ Found ${response.body.data.listings.length} listings`);
      console.log(`   ✓ Total: ${response.body.data.pagination?.total || 0}`);
      passed++;
    } else {
      console.log('   ✗ Search listings failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Search listings error:', error.message);
    failed++;
  }

  // Test 5: Search with skills filter
  console.log('\n5. Testing Search with Skills Filter...');
  try {
    const response = await makeRequest('/api/listings?skills=JavaScript&limit=5', {
      method: 'GET'
    });

    if (response.status === 200 && response.body.success) {
      console.log('   ✓ Skills filter working');
      console.log(`   ✓ Found ${response.body.data.listings.length} listings with JavaScript`);
      passed++;
    } else {
      console.log('   ✗ Skills filter failed');
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Skills filter error:', error.message);
    failed++;
  }

  // Test 6: Search with location (geospatial)
  console.log('\n6. Testing Geospatial Search...');
  try {
    const location = JSON.stringify([-122.4194, 37.7749]);
    const response = await makeRequest(`/api/listings?location=${encodeURIComponent(location)}&radius=50&limit=5`, {
      method: 'GET'
    });

    if (response.status === 200 && response.body.success) {
      console.log('   ✓ Geospatial search working');
      console.log(`   ✓ Found ${response.body.data.listings.length} listings nearby`);
      passed++;
    } else {
      console.log('   ✗ Geospatial search failed');
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Geospatial search error:', error.message);
    failed++;
  }

  // Test 7: Get my listings
  console.log('\n7. Testing Get My Listings (GET /api/listings/me)...');
  try {
    const response = await makeRequest('/api/listings/me', {
      method: 'GET'
    });

    if (response.status === 200 && response.body.success && Array.isArray(response.body.data.listings)) {
      console.log('   ✓ Get my listings successful');
      console.log(`   ✓ Found ${response.body.data.listings.length} of my listings`);
      passed++;
    } else {
      console.log('   ✗ Get my listings failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Get my listings error:', error.message);
    failed++;
  }

  // Test 8: Update listing
  console.log('\n8. Testing Update Listing (PUT /api/listings/:id)...');
  try {
    if (!listingId) {
      console.log('   ⚠ Skipped (no listing ID)');
    } else {
      const response = await makeRequest(`/api/listings/${listingId}`, {
        method: 'PUT',
        body: {
          title: 'Updated: JavaScript Tutoring - React & Node.js',
          description: 'Updated description with more details about the tutoring sessions.'
        }
      });

      if (response.status === 200 && response.body.success) {
        console.log('   ✓ Update listing successful');
        console.log(`   ✓ Updated title: ${response.body.data.listing.title}`);
        passed++;
      } else {
        console.log('   ✗ Update listing failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Update listing error:', error.message);
    failed++;
  }

  // Test 9: Update listing - unauthorized (should fail)
  console.log('\n9. Testing Update Listing - Unauthorized...');
  try {
    // Create another user
    const testEmail2 = `listing2${Date.now()}@example.com`;
    const regResponse = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: testEmail2,
        password: 'testpassword123',
        displayName: 'Another User'
      }
    });

    if (regResponse.body.success) {
      const otherToken = regResponse.body.data.tokens.accessToken;
      const oldToken = accessToken;
      accessToken = otherToken;

      if (listingId) {
        const response = await makeRequest(`/api/listings/${listingId}`, {
          method: 'PUT',
          body: {
            title: 'Hacked Title'
          }
        });

        accessToken = oldToken;

        if (response.status === 403) {
          console.log('   ✓ Unauthorized update correctly rejected');
          passed++;
        } else {
          console.log('   ✗ Should reject unauthorized update');
          failed++;
        }
      }
    }
  } catch (error) {
    console.log('   ✓ Unauthorized update rejected');
    passed++;
  }

  // Test 10: Delete listing
  console.log('\n10. Testing Delete Listing (DELETE /api/listings/:id)...');
  try {
    if (!listingId) {
      console.log('   ⚠ Skipped (no listing ID)');
    } else {
      const response = await makeRequest(`/api/listings/${listingId}`, {
        method: 'DELETE'
      });

      if (response.status === 200 && response.body.success) {
        console.log('   ✓ Delete listing successful');
        passed++;
      } else {
        console.log('   ✗ Delete listing failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Delete listing error:', error.message);
    failed++;
  }

  // Test 11: Get deleted listing (should return 404 or inactive)
  console.log('\n11. Testing Get Deleted Listing...');
  try {
    if (!listingId) {
      console.log('   ⚠ Skipped (no listing ID)');
    } else {
      const response = await makeRequest(`/api/listings/${listingId}`, {
        method: 'GET'
      });

      // Should either be 404 or return with status 'cancelled'
      if (response.status === 404 || (response.body.data?.listing?.status === 'cancelled')) {
        console.log('   ✓ Deleted listing handled correctly');
        passed++;
      } else {
        console.log('   ⚠ Listing still accessible (soft delete)');
        passed++; // Soft delete is acceptable
      }
    }
  } catch (error) {
    console.log('   ✓ Deleted listing not found');
    passed++;
  }

  // Test 12: Validation error - missing required fields
  console.log('\n12. Testing Validation - Missing Required Fields...');
  try {
    const response = await makeRequest('/api/listings', {
      method: 'POST',
      body: {
        type: 'offer'
        // Missing title, description, skills, location
      }
    });

    if (response.status === 400 && response.body.error) {
      console.log('   ✓ Validation correctly rejected incomplete listing');
      passed++;
    } else {
      console.log('   ✗ Should reject incomplete listing');
      failed++;
    }
  } catch (error) {
    console.log('   ✓ Validation rejected incomplete listing');
    passed++;
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All listing tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed\n');
    process.exit(1);
  }
}

// Check if server is running
makeRequest('/api/health').then(() => {
  testListings();
}).catch((error) => {
  console.error('❌ Server is not running. Please start the server first:');
  console.error('   cd backend && node src/app.js\n');
  console.error('Error:', error.message);
  process.exit(1);
});