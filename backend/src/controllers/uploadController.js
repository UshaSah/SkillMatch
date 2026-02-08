const { generatePresignedUploadUrl, generatePresignedDownloadUrl } = require('../services/aws/s3Service');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * Generate presigned URL for file upload
 * POST /api/uploads/presign
 */
const generatePresignedUrl = async (req, res, next) => {
  try {
    const { filename, contentType, folder = 'uploads' } = req.body;
    const userId = req.user._id;

    if (!filename || !contentType) {
      throw new AppError('Filename and content type are required', 400);
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain'
    ];

    if (!allowedTypes.includes(contentType)) {
      throw new AppError('Invalid content type', 400);
    }

    // Generate unique key: folder/userId/timestamp-uuid.extension
    const extension = path.extname(filename);
    const baseName = path.basename(filename, extension);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const uniqueFilename = `${Date.now()}-${uuidv4()}${extension}`;
    const key = `${folder}/${userId}/${uniqueFilename}`;

    // Generate presigned URL
    const result = await generatePresignedUploadUrl(key, contentType, 3600); // 1 hour expiry

    logger.info('Presigned upload URL generated', {
      requestId: req.requestId,
      userId,
      key,
      contentType
    });

    res.status(200).json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        fileUrl: result.fileUrl,
        key: key,
        expiresIn: result.expiresIn
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate presigned URL for file download
 * POST /api/uploads/download
 */
const generateDownloadUrl = async (req, res, next) => {
  try {
    const { key } = req.body;
    const userId = req.user._id;

    if (!key) {
      throw new AppError('File key is required', 400);
    }

    // Verify user owns the file (key should contain userId)
    if (!key.includes(userId)) {
      throw new AppError('Unauthorized access to file', 403);
    }

    // Generate presigned download URL
    const result = await generatePresignedDownloadUrl(key, 3600); // 1 hour expiry

    logger.info('Presigned download URL generated', {
      requestId: req.requestId,
      userId,
      key
    });

    res.status(200).json({
      success: true,
      data: {
        downloadUrl: result.downloadUrl,
        expiresIn: result.expiresIn
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generatePresignedUrl,
  generateDownloadUrl
};
