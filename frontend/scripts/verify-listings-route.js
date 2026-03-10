#!/usr/bin/env node
/**
 * Verify that the /listings route is properly configured in Next.js
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
const appPath = path.join(projectRoot, 'app');

const results = {
  pageFileExists: false,
  pageExportsDefault: false,
  pageIsClientComponent: false,
  importsCorrect: false,
  layoutExists: false,
  typesExist: false,
  apiClientExists: false
};

log('\n' + '='.repeat(60), 'blue');
log('FRONTEND /listings ROUTE VERIFICATION', 'blue');
log('='.repeat(60) + '\n', 'blue');

// 1. Check if page file exists
logInfo('1. Checking page file...');
const pageFile = path.join(appPath, 'listings', 'page.tsx');
if (fs.existsSync(pageFile)) {
  logSuccess('Page file exists: app/listings/page.tsx');
  results.pageFileExists = true;
  
  const pageContent = fs.readFileSync(pageFile, 'utf8');
  
  // Check if it's a client component
  if (pageContent.includes("'use client'")) {
    logSuccess('   Page is marked as client component (required for hooks)');
    results.pageIsClientComponent = true;
  } else {
    logError('   Page is missing "use client" directive');
  }
  
  // Check if default export exists
  if (pageContent.includes('export default function ListingsPage') || 
      pageContent.includes('export default function') ||
      pageContent.match(/export default \w+/)) {
    logSuccess('   Page has default export');
    results.pageExportsDefault = true;
  } else {
    logError('   Page missing default export');
  }
  
  // Check imports
  const requiredImports = [
    'useEffect',
    'useState',
    'listingsApi',
    'Listing',
    'Link'
  ];
  
  let allImportsFound = true;
  requiredImports.forEach(imp => {
    if (pageContent.includes(imp)) {
      logSuccess(`   Import found: ${imp}`);
    } else {
      logError(`   Missing import: ${imp}`);
      allImportsFound = false;
    }
  });
  
  results.importsCorrect = allImportsFound;
  
  // Check if fetchListings function exists
  if (pageContent.includes('fetchListings')) {
    logSuccess('   fetchListings function is defined');
  } else {
    logError('   fetchListings function not found');
  }
  
  // Check if error handling exists
  if (pageContent.includes('error') && pageContent.includes('setError')) {
    logSuccess('   Error handling is implemented');
  }
  
  // Check if loading state exists
  if (pageContent.includes('loading') && pageContent.includes('setLoading')) {
    logSuccess('   Loading state is implemented');
  }
  
} else {
  logError('Page file not found: app/listings/page.tsx');
}

// 2. Check layout
logInfo('\n2. Checking layout...');
const layoutFile = path.join(appPath, 'layout.tsx');
if (fs.existsSync(layoutFile)) {
  logSuccess('Root layout exists: app/layout.tsx');
  results.layoutExists = true;
  
  const layoutContent = fs.readFileSync(layoutFile, 'utf8');
  
  if (layoutContent.includes('AuthProvider')) {
    logSuccess('   AuthProvider is configured');
  }
  
  if (layoutContent.includes('export default')) {
    logSuccess('   Layout has default export');
  }
} else {
  logError('Root layout not found');
}

// 3. Check types
logInfo('\n3. Checking TypeScript types...');
const typesFile = path.join(projectRoot, 'types', 'index.ts');
if (fs.existsSync(typesFile)) {
  logSuccess('Types file exists: types/index.ts');
  results.typesExist = true;
  
  const typesContent = fs.readFileSync(typesFile, 'utf8');
  
  if (typesContent.includes('interface Listing') || typesContent.includes('type Listing')) {
    logSuccess('   Listing type is defined');
  } else {
    logError('   Listing type not found');
  }
} else {
  logError('Types file not found: types/index.ts');
}

// 4. Check API client
logInfo('\n4. Checking API client...');
const apiFile = path.join(projectRoot, 'lib', 'api.ts');
if (fs.existsSync(apiFile)) {
  logSuccess('API client exists: lib/api.ts');
  results.apiClientExists = true;
  
  const apiContent = fs.readFileSync(apiFile, 'utf8');
  
  if (apiContent.includes('listingsApi')) {
    logSuccess('   listingsApi is defined');
  } else {
    logError('   listingsApi not found');
  }
  
  if (apiContent.includes('search:')) {
    logSuccess('   listingsApi.search function exists');
  } else {
    logError('   listingsApi.search function not found');
  }
  
  // Check if it parses response correctly
  if (apiContent.includes('response.data.data.listings')) {
    logSuccess('   API client correctly parses backend response');
  } else {
    logError('   API client may not parse response correctly');
  }
} else {
  logError('API client not found: lib/api.ts');
}

// 5. Check Next.js configuration
logInfo('\n5. Checking Next.js configuration...');
const nextConfigFile = path.join(projectRoot, 'next.config.js');
if (fs.existsSync(nextConfigFile)) {
  logSuccess('Next.js config exists');
  
  const configContent = fs.readFileSync(nextConfigFile, 'utf8');
  
  if (configContent.includes('reactStrictMode')) {
    logSuccess('   React strict mode is enabled');
  }
} else {
  logWarning('Next.js config not found (may use defaults)');
}

// 6. Check package.json scripts
logInfo('\n6. Checking package.json...');
const packageFile = path.join(projectRoot, 'package.json');
if (fs.existsSync(packageFile)) {
  const packageContent = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  
  if (packageContent.scripts && packageContent.scripts.dev) {
    logSuccess(`   Dev script exists: ${packageContent.scripts.dev}`);
  }
  
  if (packageContent.dependencies && packageContent.dependencies.next) {
    logSuccess(`   Next.js version: ${packageContent.dependencies.next}`);
  }
  
  if (packageContent.dependencies && packageContent.dependencies.axios) {
    logSuccess(`   Axios version: ${packageContent.dependencies.axios}`);
  }
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
  logInfo('\nThe /listings route is properly configured.');
  logInfo('\nTo test the route:');
  logInfo('  1. Start frontend: cd frontend && npm run dev');
  logInfo('  2. Open browser: http://localhost:3000/listings');
  logInfo('  3. Check browser console (F12) for any errors');
} else {
  logError(`\n⚠️  ${total - passed} check(s) failed.`);
  logInfo('Please review the errors above.');
}

log('\n' + '='.repeat(60) + '\n', 'blue');

process.exit(allPassed ? 0 : 1);
