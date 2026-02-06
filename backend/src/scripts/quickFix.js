/**
 * Quick fix: Make listings active and ensure geospatial index
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/Listing');

async function quickFix() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatch';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Fix listings
    const updateResult = await Listing.updateMany(
      {},
      { $set: { status: 'active', isActive: true } }
    );
    console.log(`✓ Updated ${updateResult.modifiedCount} listings to active\n`);

    // Ensure geospatial index
    console.log('Creating geospatial index...');
    await Listing.collection.createIndex(
      { 'location.coordinates': '2dsphere' },
      { name: 'location.coordinates_2dsphere' }
    );
    console.log('✓ Geospatial index created\n');

    // Verify
    const activeCount = await Listing.countDocuments({ status: 'active', isActive: true });
    console.log(`✓ Active listings: ${activeCount}`);

    // Test geospatial query
    const geoResults = await Listing.find({
      status: 'active',
      isActive: true,
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] },
          $maxDistance: 80467.2 // 50 miles
        }
      }
    }).limit(5);

    console.log(`✓ Geospatial query found ${geoResults.length} listings\n`);

    if (geoResults.length > 0) {
      console.log('Sample result:');
      console.log(`  Title: ${geoResults[0].title}`);
      console.log(`  Location: [${geoResults[0].location.coordinates.join(', ')}]`);
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

quickFix();
