/**
 * Script to check what's actually in the MongoDB database
 * Run: node src/scripts/checkDatabase.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Thread = require('../models/Thread');
const Message = require('../models/Message');

async function checkDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatch';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
    console.log(`  Database: ${mongoose.connection.db.databaseName}`);
    console.log(`  Connection string: ${mongoUri}\n`);

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('=== Collections in Database ===');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    console.log('');

    // Check listings
    console.log('=== Listings Collection ===');
    const listingsCount = await Listing.countDocuments();
    console.log(`Total listings: ${listingsCount}`);
    
    if (listingsCount > 0) {
      const sampleListing = await Listing.findOne();
      console.log('\nSample listing structure:');
      console.log(JSON.stringify(sampleListing.toObject(), null, 2));
      
      const listings = await Listing.find().limit(5).select('title status ownerId createdAt');
      console.log('\nFirst 5 listings:');
      listings.forEach((listing, i) => {
        console.log(`  ${i + 1}. ${listing.title} (${listing.status}) - Owner: ${listing.ownerId}`);
      });
    } else {
      console.log('  No listings found');
    }
    console.log('');

    // Check users
    console.log('=== Users Collection ===');
    const usersCount = await User.countDocuments();
    console.log(`Total users: ${usersCount}`);
    
    if (usersCount > 0) {
      const sampleUser = await User.findOne().select('email createdAt');
      console.log('\nSample user structure:');
      console.log(JSON.stringify(sampleUser.toObject(), null, 2));
    }
    console.log('');

    // Check threads
    console.log('=== Threads Collection ===');
    const threadsCount = await Thread.countDocuments();
    console.log(`Total threads: ${threadsCount}`);
    console.log('');

    // Check messages
    console.log('=== Messages Collection ===');
    const messagesCount = await Message.countDocuments();
    console.log(`Total messages: ${messagesCount}`);
    console.log('');

    // Raw collection check
    console.log('=== Raw Collection Names & Document Counts ===');
    const rawCollections = await mongoose.connection.db.listCollections().toArray();
    for (const col of rawCollections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`  ${col.name}: ${count} documents`);
    }

    console.log('\n=== MongoDB Shell Commands ===');
    console.log('To query in mongosh, use:');
    console.log(`  use ${mongoose.connection.db.databaseName}`);
    console.log('  db.listings.find()');
    console.log('  db.listings.countDocuments()');
    console.log('  db.users.find()');
    console.log('  db.users.countDocuments()');
    console.log('\nNote: Mongoose automatically pluralizes model names:');
    console.log('  Model "Listing" → Collection "listings"');
    console.log('  Model "User" → Collection "users"');
    console.log('  Model "Thread" → Collection "threads"');
    console.log('  Model "Message" → Collection "messages"');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabase();
