#!/usr/bin/env node
/**
 * Comprehensive test script for Listings API
 * Tests all endpoints and validates response formats
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const BASE_URL = `${API_URL}/api`;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function testHealthCheck() {
  logInfo('\n1. Testing Health Check...');
  try {
    const response = await axios.get(`${API_URL}/api/health`);
    if (response.status === 200 && response.data.status === 'healthy') {
      logSuccess('Health check passed');
      return true;
    } else {
      logError(`Health check failed: Unexpected response`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      logWarning('Backend server is not running. Start it with: cd backend && npm run dev');
    }
    return false;
  }
}

async function testListingsSearch() {
  logInfo('\n2. Testing GET /api/listings (Search/Browse)...');
  try {
    const response = await axios.get(`${BASE_URL}/listings`, {
      params: {
        page: 1,
        limit: 10
      }
    });

    // Check response structure
    if (response.status !== 200) {
      logError(`Unexpected status code: ${response.status}`);
      return false;
    }

    const data = response.data;
    
    // Validate response format
    if (!data.success) {
      logError('Response missing success field');
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }

    if (!data.data) {
      logError('Response missing data field');
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }

    if (!Array.isArray(data.data.listings)) {
      logError('Response data.listings is not an array');
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }

    if (!data.data.pagination) {
      logError('Response missing pagination field');
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }

    logSuccess(`Listings search successful`);
    logInfo(`   Found ${data.data.listings.length} listings`);
    logInfo(`   Total: ${data.data.pagination.total}`);
    logInfo(`   Page: ${data.data.pagination.page}`);
    logInfo(`   Limit: ${data.data.pagination.limit}`);

    // Validate listing structure if listings exist
    if (data.data.listings.length > 0) {
      const listing = data.data.listings[0];
      logInfo('\n   Sample listing structure:');
      console.log('   ', JSON.stringify({
        _id: listing._id,
        type: listing.type,
        skills: listing.skills?.length || 0,
        hasDescription: !!listing.description,
        status: listing.status,
        hasLocation: !!listing.location
      }, null, 2));

      // Validate required fields
      const requiredFields = ['_id', 'type', 'description', 'status', 'createdAt'];
      const missingFields = requiredFields.filter(field => !listing[field]);
      
      if (missingFields.length > 0) {
        logWarning(`   Missing fields in listing: ${missingFields.join(', ')}`);
      } else {
        logSuccess('   Listing structure is valid');
      }

      // Validate skills structure
      if (listing.skills && listing.skills.length > 0) {
        const skill = listing.skills[0];
        if (typeof skill === 'object' && skill.name) {
          logSuccess('   Skills are properly structured as objects');
        } else if (typeof skill === 'string') {
          logWarning('   Skills are strings (expected objects with name, level, category)');
        }
      }
    } else {
      logWarning('   No listings found in database');
    }

    return true;
  } catch (error) {
    logError(`Listings search failed: ${error.message}`);
    if (error.response) {
      logError(`   Status: ${error.response.status}`);
      logError(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      logError('   No response received from server');
      logWarning('   Make sure backend is running on port 3001');
    }
    return false;
  }
}

async function testListingsWithFilters() {
  logInfo('\n3. Testing GET /api/listings with filters...');
  
  const filters = [
    { type: 'offer' },
    { type: 'request' },
    { status: 'active' },
    { page: 1, limit: 5 }
  ];

  let passed = 0;
  let failed = 0;

  for (const filter of filters) {
    try {
      const response = await axios.get(`${BASE_URL}/listings`, { params: filter });
      if (response.status === 200 && response.data.success) {
        logSuccess(`   Filter ${JSON.stringify(filter)}: OK (${response.data.data.listings.length} results)`);
        passed++;
      } else {
        logError(`   Filter ${JSON.stringify(filter)}: Failed`);
        failed++;
      }
    } catch (error) {
      logError(`   Filter ${JSON.stringify(filter)}: ${error.message}`);
      failed++;
    }
  }

  logInfo(`   Filters test: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function testListingsValidation() {
  logInfo('\n4. Testing request validation...');
  
  try {
    // Test with invalid parameters
    const response = await axios.get(`${BASE_URL}/listings`, {
      params: {
        type: 'invalid_type', // Should be 'offer' or 'request'
        status: 'invalid_status'
      },
      validateStatus: () => true // Don't throw on 4xx
    });

    if (response.status >= 400) {
      logSuccess('   Validation working: Invalid params rejected');
      return true;
    } else {
      logWarning('   Validation may not be working: Invalid params accepted');
      return false;
    }
  } catch (error) {
    logError(`   Validation test failed: ${error.message}`);
    return false;
  }
}

async function testResponseFormat() {
  logInfo('\n5. Validating response format matches frontend expectations...');
  
  try {
    const response = await axios.get(`${BASE_URL}/listings`);
    const data = response.data;

    // Frontend expects: { success: true, data: { listings: [], pagination: { total } } }
    const expectedStructure = {
      success: typeof data.success === 'boolean',
      hasData: !!data.data,
      hasListings: Array.isArray(data.data?.listings),
      hasPagination: !!data.data?.pagination,
      hasTotal: typeof data.data?.pagination?.total === 'number'
    };

    const allValid = Object.values(expectedStructure).every(v => v === true);

    if (allValid) {
      logSuccess('   Response format matches frontend expectations');
      logInfo('   Structure: { success: true, data: { listings: [], pagination: { total, page, limit } } }');
      return true;
    } else {
      logError('   Response format does not match frontend expectations');
      console.log('   Expected structure:', expectedStructure);
      return false;
    }
  } catch (error) {
    logError(`   Format validation failed: ${error.message}`);
    return false;
  }
}

async function testCORS() {
  logInfo('\n6. Testing CORS configuration...');
  
  try {
    const response = await axios.get(`${BASE_URL}/listings`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });

    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials']
    };

    if (corsHeaders['access-control-allow-origin']) {
      logSuccess('   CORS headers present');
      logInfo(`   Allow-Origin: ${corsHeaders['access-control-allow-origin']}`);
      return true;
    } else {
      logWarning('   CORS headers not found (may cause frontend issues)');
      return false;
    }
  } catch (error) {
    logError(`   CORS test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('LISTINGS API COMPREHENSIVE TEST', 'blue');
  log('='.repeat(60) + '\n', 'blue');

  const results = {
    healthCheck: await testHealthCheck(),
    listingsSearch: await testListingsSearch(),
    filters: await testListingsWithFilters(),
    validation: await testListingsValidation(),
    responseFormat: await testResponseFormat(),
    cors: await testCORS()
  };

  log('\n' + '='.repeat(60), 'blue');
  log('TEST SUMMARY', 'blue');
  log('='.repeat(60), 'blue');

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  const failed = total - passed;

  console.log('\nResults:');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`  ${status}: ${test}`, color);
  });

  log(`\nTotal: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    logSuccess('\n🎉 All tests passed! Listings API is working correctly.');
    logInfo('\nThe API is ready to be used by the frontend.');
  } else {
    logError(`\n⚠️  ${failed} test(s) failed. Please check the errors above.`);
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
