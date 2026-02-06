/**
 * Script to ensure all database indexes are created
 * Run this after importing data to ensure indexes exist
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/Listing');

async function ensureIndexes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatch';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Ensure indexes for Listing model
    console.log('\nCreating indexes for Listing model...');
    await Listing.createIndexes();
    console.log('✓ Listing indexes created');

    // Verify geospatial index exists
    const indexes = await Listing.collection.getIndexes();
    console.log('\nCurrent indexes:');
    console.log(JSON.stringify(indexes, null, 2));

    // Check if 2dsphere index exists
    const hasGeospatialIndex = Object.keys(indexes).some(key => {
      const index = indexes[key];
      return index['location.coordinates'] === '2dsphere';
    });

    if (hasGeospatialIndex) {
      console.log('\n✓ Geospatial index (2dsphere) exists');
    } else {
      console.log('\n⚠ Geospatial index (2dsphere) not found');
      console.log('Creating geospatial index manually...');
      await Listing.collection.createIndex(
        { 'location.coordinates': '2dsphere' },
        { name: 'location.coordinates_2dsphere' }
      );
      console.log('✓ Geospatial index created');
    }

    // Check sample listings for valid coordinates
    const sampleListing = await Listing.findOne({ 
      'location.coordinates': { $exists: true, $ne: null } 
    });
    
    if (sampleListing) {
      console.log('\n✓ Sample listing with coordinates found:');
      console.log(`  Title: ${sampleListing.title}`);
      console.log(`  Coordinates: ${sampleListing.location.coordinates}`);
    } else {
      console.log('\n⚠ No listings with coordinates found');
      console.log('  Make sure you have imported listings data');
    }

    console.log('\n✓ Index setup complete');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

ensureIndexes();
