const mongoose = require('mongoose');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Connection state management
let isConnecting = false;
let connectionPromise = null;

const connectDB = async () => {
  // Prevent multiple simultaneous connection attempts
  if (mongoose.connection.readyState === 1) {
    logger.info('MongoDB already connected');
    return mongoose.connection;
  }

  if (isConnecting && connectionPromise) {
    logger.info('MongoDB connection already in progress, waiting...');
    return connectionPromise;
  }

  isConnecting = true;
  connectionPromise = (async () => {
    // #region agent log
    const logData1 = {location:'database.js:4',message:'connectDB called',data:{hasMongoUri:!!process.env.MONGODB_URI,mongoUriLength:process.env.MONGODB_URI?.length||0,mongoUriPrefix:process.env.MONGODB_URI?.substring(0,20)||'missing'},timestamp:Date.now(),runId:'run1',hypothesisId:'B'};
    fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData1)}).catch(()=>{});
    try{fs.appendFileSync(path.join(__dirname,'../../.cursor/debug.log'),JSON.stringify(logData1)+'\n');}catch(e){}
    // #endregion

    if (!process.env.MONGODB_URI) {
      const error = new Error('MONGODB_URI environment variable is not set');
      logger.error(error.message);
      isConnecting = false;
      connectionPromise = null;
      throw error;
    }

    try {
      // #region agent log
      const logData2 = {location:'database.js:6',message:'Attempting MongoDB connection',data:{uriPrefix:process.env.MONGODB_URI?.substring(0,30)||'missing'},timestamp:Date.now(),runId:'run1',hypothesisId:'A'};
      fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
      try{fs.appendFileSync(path.join(__dirname,'../../.cursor/debug.log'),JSON.stringify(logData2)+'\n');}catch(e){}
      // #endregion

      // Use connection string as-is (MongoDB connection strings are well-formed)
      const mongoUri = process.env.MONGODB_URI.trim();
      
      // Log connection attempt details (without exposing password)
      const uriForLog = mongoUri.replace(/:([^:@]+)@/, ':****@');
      logger.info(`Connecting to MongoDB: ${uriForLog.substring(0, 80)}...`);

      // Modern mongoose (v6+) doesn't need useNewUrlParser or useUnifiedTopology
      // Increased timeouts to handle network latency and DNS resolution
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 30000, // 30 seconds timeout (increased for network issues)
        socketTimeoutMS: 45000, // 45 seconds socket timeout
        connectTimeoutMS: 30000, // 30 seconds connection timeout
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 1, // Maintain at least 1 socket connection
        retryWrites: true, // Retry write operations on network errors
        // These options help with replica set connections
        directConnection: false, // Allow connection through replica set
      });

      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      // #region agent log
      const logData3 = {location:'database.js:11',message:'MongoDB connection successful',data:{host:conn.connection.host,readyState:conn.connection.readyState},timestamp:Date.now(),runId:'run1',hypothesisId:'A'};
      fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData3)}).catch(()=>{});
      try{fs.appendFileSync(path.join(__dirname,'../../.cursor/debug.log'),JSON.stringify(logData3)+'\n');}catch(e){}
      // #endregion

      isConnecting = false;
      connectionPromise = null;

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        isConnecting = false;
        connectionPromise = null;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      });

      return conn;
    } catch (error) {
      isConnecting = false;
      connectionPromise = null;

      // #region agent log
      const logData4 = {location:'database.js:46',message:'MongoDB connection error caught',data:{errorName:error.name,errorMessage:error.message,errorCode:error.code,errorReason:error.reason?.type||'none',hasServers:!!error.reason?.servers,serverCount:Object.keys(error.reason?.servers||{}).length,errorReasonSetName:error.reason?.setName||'none',errorReasonServersType:error.reason?.type||'none',errorStack:error.stack?.substring(0,200)||'none'},timestamp:Date.now(),runId:'run1',hypothesisId:'A,C,D,E'};
      fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData4)}).catch(()=>{});
      const logPath = path.join(__dirname,'../../.cursor/debug.log');
      try{
        fs.appendFileSync(logPath,JSON.stringify(logData4)+'\n');
        fs.fsyncSync(fs.openSync(logPath,'r+')); // Force write to disk
      }catch(e){
        console.error('Failed to write debug log:',e.message);
      }
      // #endregion

      // Enhanced error logging with helpful messages
      logger.error('Database connection failed:', error.message);
      logger.error('Error details:', {
        name: error.name,
        code: error.code,
        reason: error.reason?.type || error.reason,
        message: error.message
      });
      
      // Parse connection string for diagnostics (without exposing password)
      const uri = process.env.MONGODB_URI || '';
      const uriMatch = uri.match(/^mongodb(\+srv)?:\/\/([^:]+):([^@]+)@(.+)$/);
      if (uriMatch) {
        const [, isSrv, username, , hosts] = uriMatch;
        logger.error('Connection string info:', {
          format: isSrv ? 'SRV' : 'Standard',
          username: username,
          hosts: hosts.substring(0, 100) + (hosts.length > 100 ? '...' : ''),
          uriLength: uri.length
        });
      }
      
      // Provide specific guidance based on error type
      if (error.message && error.message.includes('whitelist')) {
        logger.error('');
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error('MONGODB ATLAS IP WHITELISTING ERROR');
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error('Your IP address is not whitelisted in MongoDB Atlas.');
        logger.error('');
        logger.error('To fix this:');
        logger.error('1. Go to MongoDB Atlas Dashboard: https://cloud.mongodb.com/');
        logger.error('2. Navigate to: Network Access → IP Access List');
        logger.error('3. Click "Add IP Address"');
        logger.error('4. Either add your current IP or use "0.0.0.0/0" (less secure, allows all IPs)');
        logger.error('5. Wait a few minutes for changes to propagate');
        logger.error('');
        logger.error('For production, use specific IP addresses or VPC peering.');
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error('');
      } else if (error.name === 'MongooseServerSelectionError' || error.reason?.type === 'ReplicaSetNoPrimary') {
        logger.error('');
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error('MONGODB CONNECTION ERROR: ReplicaSetNoPrimary');
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error('Possible causes:');
        logger.error('1. ❌ Authentication failed (wrong username/password)');
        logger.error('2. ❌ Connection string format is incorrect');
        logger.error('3. ❌ Cluster is paused or unavailable');
        logger.error('4. ❌ Network/DNS resolution issues');
        logger.error('');
        logger.error('Troubleshooting steps:');
        logger.error('1. Verify credentials in MongoDB Atlas → Database Access');
        logger.error('2. Get fresh connection string from Atlas → Connect → Connect your application');
        logger.error('3. Check if cluster is running (not paused)');
        logger.error('4. Try using SRV format: mongodb+srv://... (if DNS works)');
        logger.error('5. Try standard format: mongodb://... (more reliable for some networks)');
        logger.error('6. Verify connection string includes: ?ssl=true&authSource=admin');
        logger.error('');
        logger.error('Test connection string format:');
        logger.error('  Standard: mongodb://user:pass@host1:27017,host2:27017/db?ssl=true&authSource=admin');
        logger.error('  SRV:      mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority');
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error('');
      } else if (error.message && (error.message.includes('authentication') || error.message.includes('auth'))) {
        logger.error('');
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error('MONGODB AUTHENTICATION ERROR');
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error('The username or password in your connection string is incorrect.');
        logger.error('');
        logger.error('To fix:');
        logger.error('1. Go to MongoDB Atlas → Database Access');
        logger.error('2. Verify the username exists and password is correct');
        logger.error('3. If password was changed, update MONGODB_URI environment variable');
        logger.error('4. Ensure user has proper database permissions');
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error('');
      }

      // Don't exit immediately - let the app continue running
      // The app can still serve requests, but database operations will fail
      // This is better for development where you might want to fix the issue without restarting
      logger.warn('Application will continue running, but database operations will fail until connection is established.');
      
      throw error;
    }
  })();

  return connectionPromise;
};

module.exports = connectDB;
