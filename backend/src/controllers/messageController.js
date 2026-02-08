const Thread = require('../models/Thread');
const Message = require('../models/Message');
const User = require('../models/User');
const Listing = require('../models/Listing');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Create or get a thread between two users
 * POST /api/messages/threads
 */
const createThread = async (req, res, next) => {
  try {
    const { recipientId, listingId, subject, content } = req.body;
    const userId = req.user._id;

    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new AppError('Recipient not found', 404);
    }

    // Can't create thread with yourself
    if (recipientId === userId.toString()) {
      throw new AppError('Cannot create thread with yourself', 400);
    }

    // Validate listing if provided
    if (listingId) {
      const listing = await Listing.findById(listingId);
      if (!listing) {
        throw new AppError('Listing not found', 404);
      }
    }

    // Find or create thread
    const thread = await Thread.findOrCreate(
      userId,
      recipientId,
      listingId || null,
      subject || null
    );

    // Create initial message if content provided
    let message = null;
    if (content) {
      message = new Message({
        threadId: thread._id,
        senderId: userId,
        recipientId: recipientId,
        content: content,
        type: 'text'
      });
      await message.save();

      // Update thread unread count for recipient
      const recipientParticipant = thread.participants.find(
        p => p.userId.toString() === recipientId
      );
      if (recipientParticipant) {
        thread.unreadCount = (thread.unreadCount || 0) + 1;
        await thread.save();
      }

      // TODO: Enable notifications after messaging is tested
      // const listing = listingId ? await Listing.findById(listingId) : null;
      // await createNewMessageNotification(
      //   recipient.email,
      //   req.user.email,
      //   thread._id.toString(),
      //   content,
      //   listing?.title || null
      // );
    }

    // Populate thread data
    await thread.populate('participants.userId', 'email');
    await thread.populate('listingId', 'title type');
    if (thread.lastMessage && thread.lastMessage.senderId) {
      await thread.populate('lastMessage.senderId', 'email');
    }

    logger.info('Thread created or retrieved', {
      requestId: req.requestId,
      threadId: thread._id,
      userId,
      recipientId
    });

    res.status(200).json({
      success: true,
      data: {
        thread: thread,
        message: message
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's threads
 * GET /api/messages/threads
 */
const getThreads = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get threads
    const threads = await Thread.getUserThreads(userId, parseInt(limit), skip);

    // Get total count
    const total = await Thread.countDocuments({
      'participants.userId': userId,
      'participants.isActive': true,
      status: 'active',
      isActive: true
    });

    // Calculate unread counts for each thread
    const threadsWithUnread = await Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await Message.countDocuments({
          threadId: thread._id,
          recipientId: userId,
          isRead: false,
          isActive: true
        });
        return {
          ...thread.toObject(),
          unreadCount
        };
      })
    );

    logger.info('Threads retrieved', {
      requestId: req.requestId,
      userId,
      count: threads.length
    });

    res.status(200).json({
      success: true,
      data: {
        threads: threadsWithUnread,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single thread
 * GET /api/messages/threads/:id
 */
const getThread = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const thread = await Thread.findById(id)
      .populate('participants.userId', 'email')
      .populate('listingId', 'title type')
      .populate('lastMessage.senderId', 'email');

    if (!thread) {
      throw new AppError('Thread not found', 404);
    }

    // Check if user is a participant
    const isParticipant = thread.participants.some(
      p => p.userId.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      throw new AppError('Unauthorized access to thread', 403);
    }

    // Get unread count for this user
    const unreadCount = await Message.countDocuments({
      threadId: thread._id,
      recipientId: userId,
      isRead: false,
      isActive: true
    });

    logger.info('Thread retrieved', {
      requestId: req.requestId,
      threadId: id,
      userId
    });

    res.status(200).json({
      success: true,
      data: {
        thread: {
          ...thread.toObject(),
          unreadCount
        }
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message in a thread
 * POST /api/messages/threads/:id/messages
 */
const sendMessage = async (req, res, next) => {
  try {
    const { id: threadId } = req.params;
    const { content, type = 'text', attachments, replyTo } = req.body;
    const userId = req.user._id;

    // Get thread and verify user is participant
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new AppError('Thread not found', 404);
    }

    const isParticipant = thread.participants.some(
      p => p.userId.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      throw new AppError('Unauthorized access to thread', 403);
    }

    // Get recipient (the other participant)
    const recipient = thread.participants.find(
      p => p.userId.toString() !== userId.toString() && p.isActive
    );

    if (!recipient) {
      throw new AppError('Recipient not found in thread', 404);
    }

    // Validate replyTo if provided
    if (replyTo) {
      const replyToMessage = await Message.findById(replyTo);
      if (!replyToMessage || replyToMessage.threadId.toString() !== threadId) {
        throw new AppError('Invalid reply-to message', 400);
      }
    }

    // Create message
    const message = new Message({
      threadId: threadId,
      senderId: userId,
      recipientId: recipient.userId,
      content: content,
      type: type,
      attachments: attachments || [],
      replyTo: replyTo || null
    });

    await message.save();

    // Update thread unread count for recipient
    thread.unreadCount = (thread.unreadCount || 0) + 1;
    await thread.save();

    // Populate message data
    await message.populate('senderId', 'email');
    await message.populate('recipientId', 'email');
    if (replyTo) {
      await message.populate('replyTo', 'content senderId');
    }

    // Get recipient user for notification
    const recipientUser = await User.findById(recipient.userId);

    // TODO: Enable notifications after messaging is tested
    // const listing = thread.listingId ? await Listing.findById(thread.listingId) : null;
    // await createNewMessageNotification(
    //   recipientUser.email,
    //   req.user.email,
    //   threadId,
    //   content,
    //   listing?.title || null
    // );

    logger.info('Message sent', {
      requestId: req.requestId,
      threadId: threadId,
      messageId: message._id,
      userId
    });

    res.status(201).json({
      success: true,
      data: {
        message: message
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages in a thread
 * GET /api/messages/threads/:id/messages
 */
const getMessages = async (req, res, next) => {
  try {
    const { id: threadId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify thread exists and user is participant
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new AppError('Thread not found', 404);
    }

    const isParticipant = thread.participants.some(
      p => p.userId.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      throw new AppError('Unauthorized access to thread', 403);
    }

    // Get messages
    const messages = await Message.getThreadMessages(threadId, parseInt(limit), skip);

    // Get total count
    const total = await Message.countDocuments({
      threadId: threadId,
      isActive: true
    });

    logger.info('Messages retrieved', {
      requestId: req.requestId,
      threadId: threadId,
      userId,
      count: messages.length
    });

    res.status(200).json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark thread as read
 * POST /api/messages/threads/:id/read
 */
const markThreadAsRead = async (req, res, next) => {
  try {
    const { id: threadId } = req.params;
    const userId = req.user._id;

    // Verify thread exists and user is participant
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new AppError('Thread not found', 404);
    }

    const isParticipant = thread.participants.some(
      p => p.userId.toString() === userId.toString() && p.isActive
    );

    if (!isParticipant) {
      throw new AppError('Unauthorized access to thread', 403);
    }

    // Mark all messages in thread as read
    await Message.markThreadAsRead(threadId, userId);

    // Update thread last read time
    await thread.updateLastRead(userId);

    // Recalculate unread count
    const unreadCount = await Message.countDocuments({
      threadId: threadId,
      recipientId: userId,
      isRead: false,
      isActive: true
    });

    thread.unreadCount = unreadCount;
    await thread.save();

    logger.info('Thread marked as read', {
      requestId: req.requestId,
      threadId: threadId,
      userId
    });

    res.status(200).json({
      success: true,
      data: {
        threadId: threadId,
        unreadCount: 0
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createThread,
  getThreads,
  getThread,
  sendMessage,
  getMessages,
  markThreadAsRead
};
