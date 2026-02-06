/**
 * Simple script to check if listings exist in MongoDB
 * Run: node src/scripts/checkListings.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/Listing');

async function checkListings() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatch';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Count total listings
    const count = await Listing.countDocuments();
    console.log(`Total listings in database: ${count}\n`);

    if (count === 0) {
      console.log('✗ No listings found. You need to import them.');
      console.log('  Run: npm run seed');
    } else {
      console.log('✓ Listings are imported!');
      
      // Show a sample listing
      const sample = await Listing.findOne();
      if (sample) {
        console.log('\nSample listing:');
        console.log(`  Title: ${sample.title}`);
        console.log(`  Status: ${sample.status}`);
        console.log(`  isActive: ${sample.isActive}`);
        if (sample.location && sample.location.coordinates) {
          console.log(`  Location: [${sample.location.coordinates.join(', ')}]`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

checkListings();
