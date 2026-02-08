/**
 * Quick script to test MongoDB connection
 * Run: node src/scripts/testConnection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatch';
    console.log('Attempting to connect to:');
    console.log(`  ${mongoUri}\n`);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    
    console.log('✓ Connected successfully!');
    console.log(`  Database: ${mongoose.connection.db.databaseName}`);
    console.log(`  Host: ${mongoose.connection.host}`);
    console.log(`  Port: ${mongoose.connection.port}`);
    
    // Test query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\nCollections found: ${collections.length}`);
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed!');
    console.error(`  Error: ${error.message}\n`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('Possible issues:');
      console.log('  1. MongoDB is not running');
      console.log('  2. Wrong host/port in MONGODB_URI');
      console.log('  3. Firewall blocking connection');
      console.log('\nTo check if MongoDB is running:');
      console.log('  mongosh --eval "db.adminCommand(\'ping\')"');
    } else if (error.message.includes('authentication')) {
      console.log('Authentication failed - check your credentials');
    } else if (error.message.includes('timeout')) {
      console.log('Connection timeout - MongoDB might be slow to respond');
    }
    
    console.log(`\nCurrent MONGODB_URI: ${process.env.MONGODB_URI || 'Not set (using default)'}`);
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();
