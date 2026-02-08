const AWS = require('aws-sdk');
const logger = require('../../utils/logger');

// Configure AWS S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'skillmatch-assets';

/**
 * Generate presigned URL for file upload
 */
const generatePresignedUploadUrl = async (key, contentType, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Expires: expiresIn
    };

    const url = await s3.getSignedUrlPromise('putObject', params);

    logger.info('Presigned upload URL generated', {
      key,
      contentType
    });

    return {
      uploadUrl: url,
      fileUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
      expiresIn
    };
  } catch (error) {
    logger.error('Failed to generate presigned upload URL', {
      error: error.message,
      key
    });

    throw {
      code: 'S3_ERROR',
      message: error.message
    };
  }
};

/**
 * Generate presigned URL for file download
 */
const generatePresignedDownloadUrl = async (key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    };

    const url = await s3.getSignedUrlPromise('getObject', params);

    logger.info('Presigned download URL generated', {
      key
    });

    return {
      downloadUrl: url,
      expiresIn
    };
  } catch (error) {
    logger.error('Failed to generate presigned download URL', {
      error: error.message,
      key
    });

    throw {
      code: 'S3_ERROR',
      message: error.message
    };
  }
};

/**
 * Get email template from S3
 */
const getEmailTemplate = async (templateName) => {
  try {
    const key = `email-templates/${templateName}.html`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    const result = await s3.getObject(params).promise();
    const template = result.Body.toString('utf-8');

    logger.info('Email template retrieved from S3', {
      templateName
    });

    return template;
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      logger.warn('Email template not found in S3', {
        templateName
      });
      return null;
    }

    logger.error('Failed to get email template from S3', {
      error: error.message,
      templateName
    });

    throw {
      code: 'S3_ERROR',
      message: error.message
    };
  }
};

/**
 * Upload file to S3
 */
const uploadFile = async (key, body, contentType) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType
    };

    const result = await s3.upload(params).promise();

    logger.info('File uploaded to S3', {
      key,
      location: result.Location
    });

    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket
    };
  } catch (error) {
    logger.error('Failed to upload file to S3', {
      error: error.message,
      key
    });

    throw {
      code: 'S3_ERROR',
      message: error.message
    };
  }
};

/**
 * Delete file from S3
 */
const deleteFile = async (key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();

    logger.info('File deleted from S3', {
      key
    });

    return {
      success: true
    };
  } catch (error) {
    logger.error('Failed to delete file from S3', {
      error: error.message,
      key
    });

    throw {
      code: 'S3_ERROR',
      message: error.message
    };
  }
};

module.exports = {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  getEmailTemplate,
  uploadFile,
  deleteFile
};
