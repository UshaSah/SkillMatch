#!/usr/bin/env node

/**
 * Test script for Messaging API
 * Run: node test-messaging.js
 * 
 * Prerequisites:
 * - Server must be running (node src/app.js)
 * - MongoDB must be running
 * - At least 2 users must exist in the database
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let accessToken1 = null;
let accessToken2 = null;
let userId1 = null;
let userId2 = null;
let threadId = null;
let messageId = null;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = options.headers || {};
    
    // Use token1 by default, token2 if specified
    const token = options.useToken2 ? accessToken2 : accessToken1;
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('=== Messaging API Tests ===\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Register User 1
  console.log('1. Registering User 1...');
  try {
    const email1 = `testuser1_${Date.now()}@example.com`;
    const response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: email1,
        password: 'Test123!@#',
        displayName: 'Test User 1'
      }
    });

    if (response.status === 201 && response.body.success) {
      accessToken1 = response.body.data.accessToken;
      userId1 = response.body.data.user._id;
      console.log('   ✓ User 1 registered');
      console.log(`   ✓ User ID: ${userId1}`);
      passed++;
    } else {
      console.log('   ✗ User 1 registration failed:', response.body);
      failed++;
      return;
    }
  } catch (error) {
    console.log('   ✗ User 1 registration error:', error.message);
    failed++;
    return;
  }

  // Test 2: Register User 2
  console.log('\n2. Registering User 2...');
  try {
    const email2 = `testuser2_${Date.now()}@example.com`;
    const response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: email2,
        password: 'Test123!@#',
        displayName: 'Test User 2'
      }
    });

    if (response.status === 201 && response.body.success) {
      accessToken2 = response.body.data.accessToken;
      userId2 = response.body.data.user._id;
      console.log('   ✓ User 2 registered');
      console.log(`   ✓ User ID: ${userId2}`);
      passed++;
    } else {
      console.log('   ✗ User 2 registration failed:', response.body);
      failed++;
      return;
    }
  } catch (error) {
    console.log('   ✗ User 2 registration error:', error.message);
    failed++;
    return;
  }

  // Test 3: Create thread (User 1 to User 2)
  console.log('\n3. Creating thread (User 1 → User 2)...');
  try {
    const response = await makeRequest('/api/messages/threads', {
      method: 'POST',
      body: {
        recipientId: userId2,
        subject: 'Test Conversation',
        content: 'Hello! This is the first message in our conversation.'
      }
    });

    if (response.status === 200 && response.body.success) {
      threadId = response.body.data.thread._id;
      messageId = response.body.data.message?._id;
      console.log('   ✓ Thread created');
      console.log(`   ✓ Thread ID: ${threadId}`);
      if (messageId) {
        console.log(`   ✓ Initial message ID: ${messageId}`);
      }
      passed++;
    } else {
      console.log('   ✗ Thread creation failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Thread creation error:', error.message);
    failed++;
  }

  // Test 4: Get User 1's threads
  console.log('\n4. Getting User 1\'s threads...');
  try {
    const response = await makeRequest('/api/messages/threads', {
      method: 'GET'
    });

    if (response.status === 200 && response.body.success) {
      const threads = response.body.data.threads;
      console.log(`   ✓ Found ${threads.length} thread(s)`);
      if (threads.length > 0) {
        console.log(`   ✓ Thread subject: ${threads[0].subject || 'N/A'}`);
        console.log(`   ✓ Unread count: ${threads[0].unreadCount || 0}`);
      }
      passed++;
    } else {
      console.log('   ✗ Get threads failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Get threads error:', error.message);
    failed++;
  }

  // Test 5: Get User 2's threads (should see the same thread)
  console.log('\n5. Getting User 2\'s threads...');
  try {
    const response = await makeRequest('/api/messages/threads', {
      method: 'GET',
      useToken2: true
    });

    if (response.status === 200 && response.body.success) {
      const threads = response.body.data.threads;
      console.log(`   ✓ Found ${threads.length} thread(s)`);
      if (threads.length > 0) {
        console.log(`   ✓ Thread has unread message: ${threads[0].unreadCount > 0}`);
      }
      passed++;
    } else {
      console.log('   ✗ Get threads failed:', response.body);
      failed++;
    }
  } catch (error) {
    console.log('   ✗ Get threads error:', error.message);
    failed++;
  }

  // Test 6: Get single thread details
  console.log('\n6. Getting thread details...');
  try {
    if (!threadId) {
      console.log('   ⚠ Skipped (no thread ID)');
    } else {
      const response = await makeRequest(`/api/messages/threads/${threadId}`, {
        method: 'GET'
      });

      if (response.status === 200 && response.body.success) {
        const thread = response.body.data.thread;
        console.log('   ✓ Thread retrieved');
        console.log(`   ✓ Participants: ${thread.participants?.length || 0}`);
        console.log(`   ✓ Message count: ${thread.messageCount || 0}`);
        passed++;
      } else {
        console.log('   ✗ Get thread failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Get thread error:', error.message);
    failed++;
  }

  // Test 7: Send message (User 2 to User 1)
  console.log('\n7. Sending message (User 2 → User 1)...');
  try {
    if (!threadId) {
      console.log('   ⚠ Skipped (no thread ID)');
    } else {
      const response = await makeRequest(`/api/messages/threads/${threadId}/messages`, {
        method: 'POST',
        useToken2: true,
        body: {
          content: 'Hi! Thanks for reaching out. I\'m interested in your offer.',
          type: 'text'
        }
      });

      if (response.status === 201 && response.body.success) {
        messageId = response.body.data.message._id;
        console.log('   ✓ Message sent');
        console.log(`   ✓ Message ID: ${messageId}`);
        passed++;
      } else {
        console.log('   ✗ Send message failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Send message error:', error.message);
    failed++;
  }

  // Test 8: Get messages in thread
  console.log('\n8. Getting messages in thread...');
  try {
    if (!threadId) {
      console.log('   ⚠ Skipped (no thread ID)');
    } else {
      const response = await makeRequest(`/api/messages/threads/${threadId}/messages`, {
        method: 'GET'
      });

      if (response.status === 200 && response.body.success) {
        const messages = response.body.data.messages;
        console.log(`   ✓ Found ${messages.length} message(s)`);
        if (messages.length > 0) {
          console.log(`   ✓ Latest message: "${messages[0].content.substring(0, 50)}..."`);
        }
        passed++;
      } else {
        console.log('   ✗ Get messages failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Get messages error:', error.message);
    failed++;
  }

  // Test 9: Mark thread as read (User 1)
  console.log('\n9. Marking thread as read (User 1)...');
  try {
    if (!threadId) {
      console.log('   ⚠ Skipped (no thread ID)');
    } else {
      const response = await makeRequest(`/api/messages/threads/${threadId}/read`, {
        method: 'POST'
      });

      if (response.status === 200 && response.body.success) {
        console.log('   ✓ Thread marked as read');
        console.log(`   ✓ Unread count: ${response.body.data.unreadCount}`);
        passed++;
      } else {
        console.log('   ✗ Mark as read failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Mark as read error:', error.message);
    failed++;
  }

  // Test 10: Send another message (User 1 to User 2)
  console.log('\n10. Sending another message (User 1 → User 2)...');
  try {
    if (!threadId) {
      console.log('   ⚠ Skipped (no thread ID)');
    } else {
      const response = await makeRequest(`/api/messages/threads/${threadId}/messages`, {
        method: 'POST',
        body: {
          content: 'Great! Let\'s discuss the details. When are you available?',
          type: 'text'
        }
      });

      if (response.status === 201 && response.body.success) {
        console.log('   ✓ Message sent');
        passed++;
      } else {
        console.log('   ✗ Send message failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Send message error:', error.message);
    failed++;
  }

  // Test 11: Verify unread count for User 2
  console.log('\n11. Verifying unread count for User 2...');
  try {
    if (!threadId) {
      console.log('   ⚠ Skipped (no thread ID)');
    } else {
      const response = await makeRequest(`/api/messages/threads/${threadId}`, {
        method: 'GET',
        useToken2: true
      });

      if (response.status === 200 && response.body.success) {
        const unreadCount = response.body.data.thread.unreadCount || 0;
        console.log(`   ✓ Unread count: ${unreadCount}`);
        if (unreadCount > 0) {
          console.log('   ✓ Unread messages detected correctly');
        }
        passed++;
      } else {
        console.log('   ✗ Get thread failed:', response.body);
        failed++;
      }
    }
  } catch (error) {
    console.log('   ✗ Get thread error:', error.message);
    failed++;
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});
