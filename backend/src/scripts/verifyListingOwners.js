/**
 * Script to verify listing-owner relationships
 * Run: node src/scripts/verifyListingOwners.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');

async function verifyListingOwners() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatch';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
    console.log(`  Database: ${mongoose.connection.db.databaseName}`);
    console.log(`  Connection: ${mongoUri}\n`);

    // Check raw collection first
    const rawListingsCount = await mongoose.connection.db.collection('listings').countDocuments();
    console.log(`Raw collection "listings": ${rawListingsCount} documents`);
    
    // Check via Mongoose model
    const mongooseListingsCount = await Listing.countDocuments();
    console.log(`Mongoose model "Listing": ${mongooseListingsCount} documents\n`);

    if (rawListingsCount > 0 && mongooseListingsCount === 0) {
      console.log('⚠ Warning: Documents exist in "listings" collection but Mongoose model finds 0');
      console.log('  This might indicate a schema mismatch or data format issue\n');
      
      // Show a sample raw document
      const rawSample = await mongoose.connection.db.collection('listings').findOne();
      if (rawSample) {
        console.log('Sample raw document structure:');
        console.log(JSON.stringify(rawSample, null, 2).substring(0, 500) + '...\n');
      }
    }

    // Get all listings with owners
    const listings = await Listing.find().populate('ownerId', 'email _id');
    
    console.log(`Found ${listings.length} listings via Mongoose model\n`);
    console.log('Listing-Owner Relationships:');
    console.log('='.repeat(60));

    let validCount = 0;
    let invalidCount = 0;

    for (const listing of listings) {
      if (listing.ownerId && listing.ownerId._id) {
        console.log(`✓ Listing: "${listing.title}"`);
        console.log(`  Owner: ${listing.ownerId.email} (${listing.ownerId._id})`);
        console.log(`  Type: ${listing.type}`);
        console.log(`  Status: ${listing.status}`);
        console.log('');
        validCount++;
      } else {
        console.log(`✗ Listing: "${listing.title}"`);
        console.log(`  Owner: INVALID or MISSING`);
        console.log(`  ownerId: ${listing.ownerId}`);
        console.log('');
        invalidCount++;
      }
    }

    console.log('='.repeat(60));
    console.log(`Valid relationships: ${validCount}`);
    console.log(`Invalid relationships: ${invalidCount}`);

    if (invalidCount > 0) {
      console.log('\n⚠ Some listings have invalid owner references');
      console.log('  Make sure users are imported before listings');
    } else {
      console.log('\n✓ All listings have valid owner relationships');
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

verifyListingOwners();
