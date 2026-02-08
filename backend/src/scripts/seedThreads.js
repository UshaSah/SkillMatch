/**
 * Script to import threads and messages data into MongoDB
 * Uses actual user and listing data from data folder
 * Run: node src/scripts/seedThreads.js
 * 
 * Prerequisites:
 * - Users and listings must be imported into MongoDB first
 * - MongoDB must be running
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Thread = require('../models/Thread');
const Message = require('../models/Message');
const User = require('../models/User');
const Listing = require('../models/Listing');

async function seedThreads() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatch';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Check if users exist
    const userCount = await User.countDocuments();
    if (userCount < 2) {
      console.log('⚠ Need at least 2 users in database to create threads');
      console.log('  Please register users or import users data first');
      process.exit(1);
    }

    // Check if listings exist
    const listingCount = await Listing.countDocuments();
    if (listingCount === 0) {
      console.log('⚠ No listings found in database');
      console.log('  Run: npm run seed (to import listings)');
      process.exit(1);
    }

    // Check if threads already exist
    const existingThreadCount = await Thread.countDocuments();
    if (existingThreadCount > 0) {
      console.log(`\n⚠ Found ${existingThreadCount} existing threads in database`);
      console.log('  Use --clear flag to remove existing threads first');
      console.log('  Example: node src/scripts/seedThreads.js --clear');
      process.exit(0);
    }

    console.log('Loading data from files...\n');

    // Load users from JSON file to get IDs
    const usersPath = path.join(__dirname, '../../data/users.json');
    let usersData = [];
    if (fs.existsSync(usersPath)) {
      usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      console.log(`✓ Loaded ${usersData.length} users from JSON file`);
    }

    // Load listings from JSON file to get ownerId relationships
    const listingsPath = path.join(__dirname, '../../data/listings.json');
    let listingsData = [];
    if (fs.existsSync(listingsPath)) {
      listingsData = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
      console.log(`✓ Loaded ${listingsData.length} listings from JSON file`);
    }

    // Get users from database (to ensure they exist)
    const dbUsers = await User.find().limit(10).select('_id email');
    console.log(`✓ Found ${dbUsers.length} users in database\n`);

    if (dbUsers.length < 2) {
      console.log('⚠ Need at least 2 users in database');
      process.exit(1);
    }

    // Create a map of user IDs for quick lookup
    const userMap = new Map();
    dbUsers.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    // Get listings from database
    const dbListings = await Listing.find().limit(10).select('_id ownerId title type');
    console.log(`✓ Found ${dbListings.length} listings in database\n`);

    // Verify listing-owner relationships
    console.log('Verifying listing-owner relationships...');
    let validListings = [];
    for (const listing of dbListings) {
      const ownerId = listing.ownerId.toString();
      if (userMap.has(ownerId)) {
        const owner = userMap.get(ownerId);
        console.log(`  ✓ Listing "${listing.title}" owned by ${owner.email}`);
        validListings.push(listing);
      } else {
        console.log(`  ⚠ Listing "${listing.title}" has invalid ownerId: ${ownerId}`);
      }
    }

    if (validListings.length === 0) {
      console.log('\n⚠ No valid listings with existing owners found');
      process.exit(1);
    }

    console.log('\nCreating threads and messages...\n');

    const threads = [];
    const messages = [];

    // Create threads based on listings
    // Scenario: Other users message listing owners about their listings
    for (let i = 0; i < Math.min(validListings.length, dbUsers.length - 1); i++) {
      const listing = validListings[i];
      const ownerId = listing.ownerId;
      const owner = userMap.get(ownerId.toString());

      // Find a different user to be the message sender
      const sender = dbUsers.find(u => u._id.toString() !== ownerId.toString());
      if (!sender) continue;

      console.log(`Creating thread: ${sender.email} → ${owner.email} (about "${listing.title}")`);

      // Create thread linked to listing
      const thread = new Thread({
        participants: [
          {
            userId: sender._id,
            joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            lastReadAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
            isActive: true
          },
          {
            userId: ownerId,
            joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            lastReadAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
            isActive: true
          }
        ],
        listingId: listing._id, // Link to the listing
        subject: `Interested in: ${listing.title}`,
        messageCount: 0,
        unreadCount: 0,
        status: 'active',
        isActive: true
      });

      await thread.save();
      threads.push(thread);

      // Conversation starters based on listing type
      const conversationStarters = listing.type === 'offer' 
        ? [
            `Hi! I'm interested in your ${listing.title} offer.`,
            `Hello! I saw your listing for ${listing.title} and I'd like to learn more.`,
            `Hey there! Are you still available for ${listing.title}?`,
            `Hi! I'm interested in your ${listing.title}. When are you available?`,
            `Hello! I'd love to connect about your ${listing.title} offer.`
          ]
        : [
            `Hi! I can help you with ${listing.title}.`,
            `Hello! I saw your request for ${listing.title} and I'd like to help.`,
            `Hey there! I have experience with ${listing.title.split(' ')[0]}. Can we discuss?`,
            `Hi! I'm available to help with ${listing.title}.`,
            `Hello! I'd love to assist you with ${listing.title}.`
          ];

      // Create initial message (sender messages owner)
      const firstMessage = new Message({
        threadId: thread._id,
        senderId: sender._id,
        recipientId: ownerId,
        content: conversationStarters[i % conversationStarters.length],
        type: 'text',
        isRead: Math.random() > 0.3, // 70% chance of being read
        isActive: true
      });

      await firstMessage.save();
      messages.push(firstMessage);

      // Update thread with first message
      thread.lastMessage = {
        content: firstMessage.content,
        senderId: firstMessage.senderId,
        sentAt: firstMessage.createdAt
      };
      thread.messageCount = 1;
      thread.unreadCount = firstMessage.isRead ? 0 : 1;
      await thread.save();

      // Create additional messages (2-5 more) - conversation flow
      const additionalMessages = Math.floor(Math.random() * 4) + 2;
      const messageResponses = listing.type === 'offer'
        ? [
            "That sounds great! When are you available?",
            "Thanks for reaching out! I'm definitely interested.",
            "I'd love to discuss the details. What's your schedule like?",
            "Perfect! Let me know what works for you.",
            "That works for me! How about this weekend?",
            "I'm available most evenings. What about you?",
            "Great! I can do that. Let's set something up."
          ]
        : [
            "That would be amazing! Thank you so much.",
            "I really appreciate your help! When can we start?",
            "Perfect! I'd love to learn from you.",
            "That sounds great! What's the best way to proceed?",
            "Thank you! I'm excited to work together.",
            "I'm available most days. What works for you?",
            "Great! Let's schedule a time to discuss."
          ];

      let currentSender = ownerId; // Owner responds
      let currentRecipient = sender._id;

      for (let j = 0; j < additionalMessages; j++) {
        // Alternate sender
        [currentSender, currentRecipient] = [currentRecipient, currentSender];

        const message = new Message({
          threadId: thread._id,
          senderId: currentSender,
          recipientId: currentRecipient,
          content: messageResponses[j % messageResponses.length],
          type: 'text',
          isRead: j < additionalMessages - 2 || Math.random() > 0.4, // Last messages might be unread
          readAt: Math.random() > 0.4 ? new Date() : null,
          isActive: true
        });

        await message.save();
        messages.push(message);

        // Update thread
        thread.lastMessage = {
          content: message.content,
          senderId: message.senderId,
          sentAt: message.createdAt
        };
        thread.messageCount += 1;
        
        // Update unread count for the recipient
        if (!message.isRead) {
          thread.unreadCount = (thread.unreadCount || 0) + 1;
        }
      }

      await thread.save();
    }

    // Create a few threads without listings (general conversations)
    const generalThreadCount = Math.min(2, Math.floor(dbUsers.length / 2));
    for (let i = 0; i < generalThreadCount; i++) {
      const user1 = dbUsers[i % dbUsers.length];
      const user2 = dbUsers[(i + 1) % dbUsers.length];

      if (user1._id.toString() === user2._id.toString()) continue;

      console.log(`Creating general thread: ${user1.email} ↔ ${user2.email}`);

      const thread = new Thread({
        participants: [
          {
            userId: user1._id,
            joinedAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
            lastReadAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
            isActive: true
          },
          {
            userId: user2._id,
            joinedAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
            lastReadAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
            isActive: true
          }
        ],
        listingId: null, // No listing - general conversation
        subject: null,
        messageCount: 0,
        unreadCount: 0,
        status: 'active',
        isActive: true
      });

      await thread.save();
      threads.push(thread);

      const generalStarters = [
        "Hi! I'd love to connect and exchange skills.",
        "Hello! Are you interested in skill sharing?",
        "Hey! Would you like to collaborate?",
        "Hi there! Let's connect!"
      ];

      const firstMessage = new Message({
        threadId: thread._id,
        senderId: user1._id,
        recipientId: user2._id,
        content: generalStarters[i % generalStarters.length],
        type: 'text',
        isRead: Math.random() > 0.4,
        isActive: true
      });

      await firstMessage.save();
      messages.push(firstMessage);

      thread.lastMessage = {
        content: firstMessage.content,
        senderId: firstMessage.senderId,
        sentAt: firstMessage.createdAt
      };
      thread.messageCount = 1;
      thread.unreadCount = firstMessage.isRead ? 0 : 1;
      await thread.save();

      // Add 1-3 more messages
      const additionalMessages = Math.floor(Math.random() * 3) + 1;
      let currentSender = user2._id;
      let currentRecipient = user1._id;

      for (let j = 0; j < additionalMessages; j++) {
        [currentSender, currentRecipient] = [currentRecipient, currentSender];

        const message = new Message({
          threadId: thread._id,
          senderId: currentSender,
          recipientId: currentRecipient,
          content: "That sounds great! Let's do it.",
          type: 'text',
          isRead: j < additionalMessages - 1 || Math.random() > 0.5,
          isActive: true
        });

        await message.save();
        messages.push(message);

        thread.lastMessage = {
          content: message.content,
          senderId: message.senderId,
          sentAt: message.createdAt
        };
        thread.messageCount += 1;
        if (!message.isRead) {
          thread.unreadCount = (thread.unreadCount || 0) + 1;
        }
      }

      await thread.save();
    }

    // Ensure indexes
    console.log('\nEnsuring indexes...');
    await Thread.createIndexes();
    await Message.createIndexes();
    console.log('✓ Indexes created');

    console.log(`\n✓ Successfully created ${threads.length} threads`);
    console.log(`✓ Successfully created ${messages.length} messages`);

    // Show sample
    const sampleThread = await Thread.findOne()
      .populate('participants.userId', 'email')
      .populate('listingId', 'title type');
    if (sampleThread) {
      console.log('\n✓ Sample thread:');
      console.log(`  Thread ID: ${sampleThread._id}`);
      console.log(`  Participants: ${sampleThread.participants.map(p => p.userId.email).join(', ')}`);
      if (sampleThread.listingId) {
        console.log(`  Listing: ${sampleThread.listingId.title} (${sampleThread.listingId.type})`);
      } else {
        console.log(`  Listing: None (general conversation)`);
      }
      console.log(`  Messages: ${sampleThread.messageCount}`);
      console.log(`  Unread: ${sampleThread.unreadCount}`);
    }

    console.log('\n✓ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
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
      
      const deletedThreads = await Thread.deleteMany({});
      const deletedMessages = await Message.deleteMany({});
      console.log(`✓ Deleted ${deletedThreads.deletedCount} threads`);
      console.log(`✓ Deleted ${deletedMessages.deletedCount} messages`);
      
      await mongoose.disconnect();
      console.log('\n✓ Database cleared. Run seed again to import data.');
      process.exit(0);
    } catch (error) {
      console.error('✗ Error:', error.message);
      process.exit(1);
    }
  })();
} else {
  seedThreads();
}
