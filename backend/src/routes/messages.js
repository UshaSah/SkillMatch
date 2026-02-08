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

// All routes require authentication
router.use(authenticate);

// Thread routes
router.post('/threads', validate(createThreadSchema), createThread);
router.get('/threads', validate(getThreadsSchema), getThreads);
router.get('/threads/:id', getThread);

// Message routes
router.post('/threads/:id/messages', validate(sendMessageSchema), sendMessage);
router.get('/threads/:id/messages', validate(getMessagesSchema), getMessages);

// Mark thread as read
router.post('/threads/:id/read', markThreadAsRead);

module.exports = router;
