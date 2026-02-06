/**
 * Script to import listings data from JSON file into MongoDB
 * Run: node src/scripts/seedListings.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Listing = require('../models/Listing');

async function seedListings() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatch';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Read listings JSON file
    const listingsPath = path.join(__dirname, '../../data/listings.json');
    const listingsData = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
    console.log(`\n✓ Loaded ${listingsData.length} listings from JSON file`);

    // Check if listings already exist
    const existingCount = await Listing.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠ Found ${existingCount} existing listings in database`);
      console.log('  Use --clear flag to remove existing listings first');
      console.log('  Example: node src/scripts/seedListings.js --clear');
      process.exit(0);
    }

    // Convert MongoDB ObjectId format to actual ObjectIds
    const listings = listingsData.map(listing => {
      // Convert _id if it exists
      if (listing._id && listing._id.$oid) {
        listing._id = new mongoose.Types.ObjectId(listing._id.$oid);
      }
      
      // Convert ownerId if it exists
      if (listing.ownerId && listing.ownerId.$oid) {
        listing.ownerId = new mongoose.Types.ObjectId(listing.ownerId.$oid);
      }

      // Ensure location.coordinates is properly formatted
      if (listing.location && listing.location.coordinates) {
        listing.location.coordinates = listing.location.coordinates.map(Number);
      }

      return listing;
    });

    // Insert listings
    console.log('\nInserting listings into database...');
    const result = await Listing.insertMany(listings, { ordered: false });
    console.log(`✓ Successfully inserted ${result.length} listings`);

    // Ensure indexes are created
    console.log('\nEnsuring indexes...');
    await Listing.createIndexes();
    console.log('✓ Indexes created');

    // Verify geospatial index
    const indexes = await Listing.collection.getIndexes();
    const hasGeospatialIndex = Object.keys(indexes).some(key => {
      const index = indexes[key];
      return index['location.coordinates'] === '2dsphere';
    });

    if (hasGeospatialIndex) {
      console.log('✓ Geospatial index (2dsphere) exists');
    } else {
      console.log('⚠ Geospatial index not found, creating...');
      await Listing.collection.createIndex(
        { 'location.coordinates': '2dsphere' },
        { name: 'location.coordinates_2dsphere' }
      );
      console.log('✓ Geospatial index created');
    }

    // Show sample listing
    const sample = await Listing.findOne().populate('ownerId', 'email');
    if (sample) {
      console.log('\n✓ Sample listing:');
      console.log(`  Title: ${sample.title}`);
      console.log(`  Location: ${sample.location.coordinates}`);
      console.log(`  Status: ${sample.status}`);
    }

    console.log('\n✓ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    if (error.writeErrors) {
      console.error('  Write errors:', error.writeErrors.length);
    }
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Handle --clear flag
if (process.argv.includes('--clear')) {
  (async () => {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatch';
      await mongoose.connect(mongoUri);
      console.log('✓ Connected to MongoDB');
      
      const deleted = await Listing.deleteMany({});
      console.log(`✓ Deleted ${deleted.deletedCount} listings`);
      
      await mongoose.disconnect();
      console.log('\n✓ Database cleared. Run seed again to import data.');
      process.exit(0);
    } catch (error) {
      console.error('✗ Error:', error.message);
      process.exit(1);
    }
  })();
} else {
  seedListings();
}
