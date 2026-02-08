/**
 * Quick script to check threads and messages in database
 * Run: node src/scripts/checkThreads.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Thread = require('../models/Thread');
const Message = require('../models/Message');
const User = require('../models/User');
const Listing = require('../models/Listing');

async function checkThreads() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatch';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
    console.log(`  Database: ${mongoose.connection.db.databaseName}\n`);

    // Check threads
    const threadCount = await Thread.countDocuments();
    console.log(`=== Threads ===`);
    console.log(`Total threads: ${threadCount}\n`);

    if (threadCount > 0) {
      const threads = await Thread.find()
        .populate('participants.userId', 'email')
        .populate('listingId', 'title type')
        .limit(5)
        .sort({ createdAt: -1 });

      console.log('Sample threads:');
      threads.forEach((thread, i) => {
        console.log(`\n${i + 1}. Thread ID: ${thread._id}`);
        console.log(`   Participants: ${thread.participants.map(p => p.userId.email).join(', ')}`);
        if (thread.listingId) {
          console.log(`   Listing: "${thread.listingId.title}" (${thread.listingId.type})`);
        } else {
          console.log(`   Listing: None (general conversation)`);
        }
        console.log(`   Messages: ${thread.messageCount}`);
        console.log(`   Unread: ${thread.unreadCount}`);
        console.log(`   Status: ${thread.status}`);
      });
    }

    // Check messages
    const messageCount = await Message.countDocuments();
    console.log(`\n=== Messages ===`);
    console.log(`Total messages: ${messageCount}\n`);

    if (messageCount > 0) {
      const messages = await Message.find()
        .populate('senderId', 'email')
        .populate('recipientId', 'email')
        .limit(5)
        .sort({ createdAt: -1 });

      console.log('Sample messages:');
      messages.forEach((msg, i) => {
        console.log(`\n${i + 1}. Message ID: ${msg._id}`);
        console.log(`   From: ${msg.senderId.email}`);
        console.log(`   To: ${msg.recipientId.email}`);
        console.log(`   Content: ${msg.content.substring(0, 50)}...`);
        console.log(`   Read: ${msg.isRead ? 'Yes' : 'No'}`);
        console.log(`   Type: ${msg.type}`);
      });
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Threads: ${threadCount}`);
    console.log(`Messages: ${messageCount}`);
    
    if (threadCount > 0 && messageCount > 0) {
      const avgMessagesPerThread = (messageCount / threadCount).toFixed(1);
      console.log(`Average messages per thread: ${avgMessagesPerThread}`);
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

checkThreads();
