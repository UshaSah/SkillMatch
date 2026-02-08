const express = require('express');
const router = express.Router();
const { generatePresignedUrl, generateDownloadUrl } = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const Joi = require('joi');

// Validation middleware
const validatePresign = (req, res, next) => {
  const schema = Joi.object({
    filename: Joi.string().required(),
    contentType: Joi.string().required(),
    folder: Joi.string().optional().default('uploads')
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
      }
    });
  }

  req.body = value;
  next();
};

const validateDownload = (req, res, next) => {
  const schema = Joi.object({
    key: Joi.string().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
      }
    });
  }

  req.body = value;
  next();
};

// All routes require authentication
router.use(authenticate);

// Generate presigned upload URL
router.post('/presign', validatePresign, generatePresignedUrl);

// Generate presigned download URL
router.post('/download', validateDownload, generateDownloadUrl);

module.exports = router;
