const Joi = require('joi');

// Attachment validation schema
const attachmentSchema = Joi.object({
  url: Joi.string().uri().required(),
  filename: Joi.string().trim().required(),
  mimetype: Joi.string().trim().required(),
  size: Joi.number().min(0).required()
});

// Create thread validation schema
const createThreadSchema = Joi.object({
  recipientId: Joi.string().hex().length(24).required()
    .messages({
      'string.hex': 'Invalid recipient ID format',
      'string.length': 'Recipient ID must be 24 characters'
    }),
  listingId: Joi.string().hex().length(24).optional()
    .messages({
      'string.hex': 'Invalid listing ID format',
      'string.length': 'Listing ID must be 24 characters'
    }),
  subject: Joi.string().trim().max(200).optional(),
  content: Joi.string().trim().min(1).max(2000).required()
    .messages({
      'string.min': 'Message content is required',
      'string.max': 'Message cannot exceed 2000 characters'
    })
});

// Send message validation schema
const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required()
    .messages({
      'string.min': 'Message content is required',
      'string.max': 'Message cannot exceed 2000 characters'
    }),
  type: Joi.string().valid('text', 'image', 'file', 'system').default('text'),
  attachments: Joi.array().items(attachmentSchema).optional(),
  replyTo: Joi.string().hex().length(24).optional()
    .messages({
      'string.hex': 'Invalid reply-to message ID format',
      'string.length': 'Reply-to message ID must be 24 characters'
    })
});

// Get threads query validation schema
const getThreadsSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20)
});

// Get messages query validation schema
const getMessagesSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(50)
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    // For query params, validate req.query; for body, validate req.body
    const dataToValidate = [getThreadsSchema, getMessagesSchema].includes(schema) 
      ? req.query 
      : req.body;
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Replace with validated and sanitized value
    if ([getThreadsSchema, getMessagesSchema].includes(schema)) {
      req.query = value;
    } else {
      req.body = value;
    }
    
    next();
  };
};

module.exports = {
  validate,
  createThreadSchema,
  sendMessageSchema,
  getThreadsSchema,
  getMessagesSchema
};
