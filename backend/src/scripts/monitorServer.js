/**
 * Simple Server Monitoring Script
 * 
 * Monitors server logs, health, and performance during testing
 * 
 * Run: node src/scripts/monitorServer.js
 * 
 * Prerequisites:
 * - Server must be running (npm run dev)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_URL = 'http://localhost:3001';
const LOG_FILE = path.join(__dirname, '../../logs/combined.log');

// Statistics
const stats = {
  startTime: new Date(),
  requests: 0,
  successful: 0,
  rateLimited: 0,
  errors: 0,
  responseTimes: []
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check server health
async function checkHealth() {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    http.get(`${BASE_URL}/api/health`, (res) => {
      const time = Date.now() - start;
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          resolve({ status: res.statusCode, time, health });
        } catch (e) {
          resolve({ status: res.statusCode, time, health: null });
        }
      });
    }).on('error', reject);
  });
}

// Monitor log file
function monitorLogs() {
  if (!fs.existsSync(LOG_FILE)) {
    log('⚠️  Log file not found. Make sure server is running and has created logs.', 'yellow');
    return;
  }

  // Read last 50 lines to catch up
  const logContent = fs.readFileSync(LOG_FILE, 'utf8');
  const lines = logContent.split('\n').filter(l => l.trim());
  const recentLines = lines.slice(-50);

  recentLines.forEach(processLogLine);

  // Watch for new lines
  let lastSize = fs.statSync(LOG_FILE).size;
  
  setInterval(() => {
    try {
      const currentSize = fs.statSync(LOG_FILE).size;
      if (currentSize > lastSize) {
        const stream = fs.createReadStream(LOG_FILE, {
          start: lastSize,
          end: currentSize
        });
        
        let newData = '';
        stream.on('data', chunk => {
          newData += chunk.toString();
        });
        
        stream.on('end', () => {
          newData.split('\n').forEach(line => {
            if (line.trim()) {
              processLogLine(line);
            }
          });
        });
        
        lastSize = currentSize;
      }
    } catch (error) {
      // File might be rotating, ignore
    }
  }, 500); // Check every 500ms
}

// Process a log line
function processLogLine(line) {
  try {
    const log = JSON.parse(line);
    
    // Count rate limit events
    if (log.message && (
      log.message.toLowerCase().includes('rate limit') ||
      log.message.toLowerCase().includes('too many requests')
    )) {
      stats.rateLimited++;
      log(`🚫 Rate Limited: ${log.userId || 'unknown'} - ${log.route || log.path || 'unknown'}`, 'red');
    }
    
    // Count successful operations
    if (log.message && (
      log.message.includes('Message sent') ||
      log.message.includes('Thread created') ||
      log.message.includes('created or retrieved')
    )) {
      stats.successful++;
      log(`✅ ${log.message}`, 'green');
    }
    
    // Count errors
    if (log.level === 'error' || log.level === 'warn') {
      stats.errors++;
      log(`⚠️  ${log.level.toUpperCase()}: ${log.message}`, 'yellow');
    }
    
    // Track requests
    if (log.requestId) {
      stats.requests++;
    }
    
    // Track response times
    if (log.latencyMs) {
      stats.responseTimes.push(log.latencyMs);
      // Keep only last 100
      if (stats.responseTimes.length > 100) {
        stats.responseTimes.shift();
      }
    }
  } catch (e) {
    // Not JSON, skip
  }
}

// Display statistics
function displayStats() {
  const uptime = Math.floor((new Date() - stats.startTime) / 1000);
  const avgResponseTime = stats.responseTimes.length > 0
    ? Math.round(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length)
    : 0;
  
  console.clear();
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 SERVER MONITORING DASHBOARD', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`⏱️  Monitoring for: ${uptime}s`, 'blue');
  log(`📈 Total Requests: ${stats.requests}`, 'blue');
  log(`✅ Successful: ${stats.successful}`, 'green');
  log(`🚫 Rate Limited: ${stats.rateLimited}`, 'red');
  log(`❌ Errors: ${stats.errors}`, stats.errors > 0 ? 'red' : 'green');
  
  if (stats.requests > 0) {
    const successRate = ((stats.successful / stats.requests) * 100).toFixed(1);
    log(`📊 Success Rate: ${successRate}%`, 'blue');
  }
  
  if (avgResponseTime > 0) {
    log(`⚡ Avg Response Time: ${avgResponseTime}ms`, 'blue');
  }
  
  log('='.repeat(60), 'cyan');
  log('Press Ctrl+C to stop\n', 'yellow');
}

// Monitor server health
async function monitorHealth() {
  try {
    const health = await checkHealth();
    if (health.status === 200) {
      log(`💚 Server Health: OK | Response: ${health.time}ms | Uptime: ${Math.floor(health.health?.uptime || 0)}s`, 'green');
    } else {
      log(`💔 Server Health: ${health.status}`, 'red');
    }
  } catch (error) {
    log(`💔 Server Unreachable: ${error.message}`, 'red');
  }
}

// Main monitoring loop
function startMonitoring() {
  log('🚀 Starting Server Monitor...\n', 'cyan');
  log('Make sure your server is running: npm run dev\n', 'yellow');
  
  // Check if log file exists
  if (!fs.existsSync(LOG_FILE)) {
    log('⚠️  Log file not found. Waiting for server to create it...', 'yellow');
    // Wait and retry
    setTimeout(() => {
      if (fs.existsSync(LOG_FILE)) {
        monitorLogs();
      }
    }, 2000);
  } else {
    monitorLogs();
  }
  
  // Display stats every 2 seconds
  setInterval(displayStats, 2000);
  
  // Check health every 5 seconds
  setInterval(monitorHealth, 5000);
  
  // Initial display
  displayStats();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.clear();
  log('\n\n📊 FINAL STATISTICS', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total Requests: ${stats.requests}`, 'blue');
  log(`✅ Successful: ${stats.successful}`, 'green');
  log(`🚫 Rate Limited: ${stats.rateLimited}`, 'red');
  log(`❌ Errors: ${stats.errors}`, stats.errors > 0 ? 'red' : 'green');
  
  if (stats.responseTimes.length > 0) {
    const avg = Math.round(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length);
    const min = Math.min(...stats.responseTimes);
    const max = Math.max(...stats.responseTimes);
    log(`⚡ Response Times: Avg ${avg}ms | Min ${min}ms | Max ${max}ms`, 'blue');
  }
  
  log('='.repeat(60), 'cyan');
  log('\n👋 Monitoring stopped\n', 'yellow');
  process.exit(0);
});

// Start monitoring
startMonitoring();
