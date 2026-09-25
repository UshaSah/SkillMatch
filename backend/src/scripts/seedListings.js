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
      const convertedListing = { ...listing };
      
      // Convert _id if it exists
      if (convertedListing._id && convertedListing._id.$oid) {
        convertedListing._id = new mongoose.Types.ObjectId(convertedListing._id.$oid);
      }
      
      // Convert ownerId if it exists
      if (convertedListing.ownerId && convertedListing.ownerId.$oid) {
        convertedListing.ownerId = new mongoose.Types.ObjectId(convertedListing.ownerId.$oid);
      }

      // Ensure location.coordinates is properly formatted
      if (convertedListing.location && convertedListing.location.coordinates) {
        convertedListing.location.coordinates = convertedListing.location.coordinates.map(Number);
      }

      // Convert date fields
      if (convertedListing.createdAt && convertedListing.createdAt.$date) {
        convertedListing.createdAt = new Date(convertedListing.createdAt.$date);
      }
      if (convertedListing.updatedAt && convertedListing.updatedAt.$date) {
        convertedListing.updatedAt = new Date(convertedListing.updatedAt.$date);
      }
      // Drop the stale expiresAt so the schema default (+30 days) applies;
      // otherwise the TTL index (expireAfterSeconds: 0) purges these rows within ~60s.
      delete convertedListing.expiresAt;

      return convertedListing;
    });

    // Validate first listing as a test
    console.log('\nValidating listing data...');
    try {
      const testListing = new Listing(listings[0]);
      await testListing.validate();
      console.log('  ✓ Sample listing validation passed');
    } catch (validationError) {
      console.error('  ✗ Validation error in sample listing:');
      console.error('    ', validationError.message);
      if (validationError.errors) {
        Object.keys(validationError.errors).forEach(key => {
          console.error(`    - ${key}: ${validationError.errors[key].message}`);
        });
      }
      throw validationError;
    }

    // Insert listings
    console.log('\nInserting listings into database...');
    try {
      const result = await Listing.insertMany(listings, { ordered: false });
      if (result.length === 0) {
        console.error('✗ Warning: insertMany returned 0 listings');
        console.error('  This might indicate all listings failed validation or are duplicates');
        // Try inserting one at a time to see the actual error
        console.log('\n  Attempting to insert listings one by one to diagnose...');
        let successCount = 0;
        for (let i = 0; i < listings.length; i++) {
          try {
            const listing = new Listing(listings[i]);
            await listing.save();
            successCount++;
            console.log(`  ✓ Inserted listing ${i + 1}: ${listing.title}`);
          } catch (err) {
            console.error(`  ✗ Failed to insert listing ${i + 1}: ${listings[i].title}`);
            console.error(`    Error: ${err.message}`);
            if (err.code === 11000) {
              console.error(`    → Duplicate key (listing already exists)`);
            }
          }
        }
        console.log(`\n✓ Successfully inserted ${successCount} out of ${listings.length} listings`);
      } else {
        console.log(`✓ Successfully inserted ${result.length} listings`);
      }
    } catch (error) {
      if (error.writeErrors) {
        console.error(`\n✗ Failed to insert ${error.writeErrors.length} listings`);
        error.writeErrors.slice(0, 10).forEach((err, i) => {
          console.error(`  Error ${i + 1}:`, err.errmsg || err.message);
          if (err.err && err.err.code === 11000) {
            console.error(`    → Duplicate key error`);
          }
        });
        if (error.writeErrors.length > 10) {
          console.error(`  ... and ${error.writeErrors.length - 10} more errors`);
        }
        // Count successful inserts
        const successCount = listings.length - error.writeErrors.length;
        if (successCount > 0) {
          console.log(`\n✓ Successfully inserted ${successCount} listings`);
        }
      } else {
        console.error('✗ Error inserting listings:', error.message);
        if (error.errors) {
          Object.keys(error.errors).forEach(key => {
            console.error(`  - ${key}: ${error.errors[key].message}`);
          });
        }
      }
      // Don't throw - allow script to continue
    }

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
