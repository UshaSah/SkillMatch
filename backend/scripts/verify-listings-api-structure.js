#!/usr/bin/env node
/**
 * Verify Listings API structure without making HTTP requests
 * Checks code structure, routes, and response format
 */

const fs = require('fs');
const path = require('path');

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

const projectRoot = path.join(__dirname, '..');
const srcPath = path.join(projectRoot, 'src');

// Test results
const results = {
  routeExists: false,
  routeMounted: false,
  controllerExists: false,
  controllerExports: false,
  responseFormat: false,
  frontendCompatible: false
};

log('\n' + '='.repeat(60), 'blue');
log('LISTINGS API STRUCTURE VERIFICATION', 'blue');
log('='.repeat(60) + '\n', 'blue');

// 1. Check if route file exists
logInfo('1. Checking route file...');
const routeFile = path.join(srcPath, 'routes', 'listings.js');
if (fs.existsSync(routeFile)) {
  logSuccess('Route file exists: routes/listings.js');
  results.routeExists = true;
  
  const routeContent = fs.readFileSync(routeFile, 'utf8');
  
  // Check if route is defined
  if (routeContent.includes("router.get('/',")) {
    logSuccess('   GET / route is defined');
  } else {
    logError('   GET / route not found');
  }
  
  // Check if optionalAuth is used
  if (routeContent.includes('optionalAuth')) {
    logSuccess('   Route uses optionalAuth (public access)');
  } else {
    logError('   Route does not use optionalAuth');
  }
  
  // Check if searchListings is imported
  if (routeContent.includes('searchListings')) {
    logSuccess('   searchListings controller is imported');
    results.controllerExports = true;
  } else {
    logError('   searchListings controller not imported');
  }
} else {
  logError('Route file not found: routes/listings.js');
}

// 2. Check if route is mounted in app.js
logInfo('\n2. Checking route mounting...');
const appFile = path.join(srcPath, 'app.js');
if (fs.existsSync(appFile)) {
  const appContent = fs.readFileSync(appFile, 'utf8');
  
  if (appContent.includes("app.use('/api/listings'")) {
    logSuccess('Route is mounted at /api/listings in app.js');
    results.routeMounted = true;
  } else {
    logError('Route not mounted in app.js');
  }
  
  if (appContent.includes("require('./routes/listings')")) {
    logSuccess('Listings routes are imported');
  } else {
    logError('Listings routes not imported');
  }
} else {
  logError('app.js not found');
}

// 3. Check if controller exists
logInfo('\n3. Checking controller...');
const controllerFile = path.join(srcPath, 'controllers', 'listingController.js');
if (fs.existsSync(controllerFile)) {
  logSuccess('Controller file exists: controllers/listingController.js');
  results.controllerExists = true;
  
  const controllerContent = fs.readFileSync(controllerFile, 'utf8');
  
  // Check if searchListings function exists
  if (controllerContent.includes('const searchListings =') || 
      controllerContent.includes('function searchListings') ||
      controllerContent.includes('searchListings = async')) {
    logSuccess('   searchListings function is defined');
  } else {
    logError('   searchListings function not found');
  }
  
  // Check if it's exported
  if (controllerContent.includes('module.exports') && 
      controllerContent.includes('searchListings')) {
    logSuccess('   searchListings is exported');
    results.controllerExports = true;
  } else {
    logError('   searchListings not exported');
  }
  
  // Check response format
  if (controllerContent.includes('success: true') && 
      controllerContent.includes('data: {') &&
      controllerContent.includes('listings:') &&
      controllerContent.includes('pagination:')) {
    logSuccess('   Response format includes success, data, listings, pagination');
    results.responseFormat = true;
  } else {
    logError('   Response format may be incorrect');
  }
  
  // Check for pagination structure
  if (controllerContent.includes('pagination:') && 
      controllerContent.includes('total:')) {
    logSuccess('   Pagination includes total field (required by frontend)');
    results.frontendCompatible = true;
  } else {
    logError('   Pagination may not include total field');
  }
} else {
  logError('Controller file not found: controllers/listingController.js');
}

// 4. Check frontend API client
logInfo('\n4. Checking frontend compatibility...');
const frontendApiFile = path.join(projectRoot, '..', 'frontend', 'lib', 'api.ts');
if (fs.existsSync(frontendApiFile)) {
  logSuccess('Frontend API client exists');
  
  const apiContent = fs.readFileSync(frontendApiFile, 'utf8');
  
  // Check if listingsApi.search exists
  if (apiContent.includes('listingsApi') && apiContent.includes('search:')) {
    logSuccess('   listingsApi.search function exists');
  }
  
  // Check if it parses response.data.data.listings
  if (apiContent.includes('response.data.data.listings')) {
    logSuccess('   Frontend correctly parses backend response structure');
    results.frontendCompatible = true;
  } else {
    logError('   Frontend may not parse response correctly');
  }
  
  // Check if it extracts pagination.total
  if (apiContent.includes('pagination?.total')) {
    logSuccess('   Frontend extracts pagination.total');
  }
} else {
  logWarning('Frontend API client not found (may not be critical)');
}

// 5. Check model structure
logInfo('\n5. Checking Listing model...');
const modelFile = path.join(srcPath, 'models', 'Listing.js');
if (fs.existsSync(modelFile)) {
  logSuccess('Listing model exists');
  
  const modelContent = fs.readFileSync(modelFile, 'utf8');
  
  // Check skills structure
  if (modelContent.includes('skills: [{') && modelContent.includes('name:')) {
    logSuccess('   Skills are structured as objects with name field');
  } else {
    logError('   Skills structure may be incorrect');
  }
  
  // Check required fields
  const requiredFields = ['type', 'description', 'status', 'ownerId'];
  requiredFields.forEach(field => {
    if (modelContent.includes(field)) {
      logSuccess(`   Field '${field}' is defined`);
    } else {
      logError(`   Field '${field}' not found`);
    }
  });
} else {
  logError('Listing model not found');
}

// Summary
log('\n' + '='.repeat(60), 'blue');
log('VERIFICATION SUMMARY', 'blue');
log('='.repeat(60), 'blue');

const allPassed = Object.values(results).every(r => r === true);
const passed = Object.values(results).filter(r => r).length;
const total = Object.keys(results).length;

console.log('\nStructure Checks:');
Object.entries(results).forEach(([test, passed]) => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`  ${status}: ${test}`, color);
});

log(`\nTotal: ${passed}/${total} checks passed`, allPassed ? 'green' : 'yellow');

if (allPassed) {
  logSuccess('\n🎉 All structure checks passed!');
  logInfo('\nThe API code structure is correct.');
  logInfo('To test the actual API, run: npm run test:listings-api');
  logInfo('(Make sure backend is running: npm run dev)');
} else {
  logError(`\n⚠️  ${total - passed} check(s) failed.`);
  logInfo('Please review the errors above.');
}

log('\n' + '='.repeat(60) + '\n', 'blue');

process.exit(allPassed ? 0 : 1);
