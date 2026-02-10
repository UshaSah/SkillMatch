const express = require('express');
const router = express.Router();
const {
  createThread,
  getThreads,
  getThread,
  sendMessage,
  getMessages,
  markThreadAsRead
} = require('../controllers/messageController');
const {
  validate,
  createThreadSchema,
  sendMessageSchema,
  getThreadsSchema,
  getMessagesSchema
} = require('../validators/messageValidator');
const { authenticate } = require('../middleware/auth');
const {
  messageRateLimiter,
  threadCreationRateLimiter,
  messagingApiRateLimiter
} = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticate);

// Apply general API rate limiting to all messaging routes
router.use(messagingApiRateLimiter);

// Thread routes
// Apply stricter rate limiting for thread creation (5 per 15 min)
router.post('/threads', threadCreationRateLimiter, validate(createThreadSchema), createThread);
router.get('/threads', validate(getThreadsSchema), getThreads);
router.get('/threads/:id', getThread);

// Message routes
// Apply stricter rate limiting for message sending (10 per minute)
router.post('/threads/:id/messages', messageRateLimiter, validate(sendMessageSchema), sendMessage);
router.get('/threads/:id/messages', validate(getMessagesSchema), getMessages);

// Mark thread as read
router.post('/threads/:id/read', markThreadAsRead);

module.exports = router;
