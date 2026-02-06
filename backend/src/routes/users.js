const express = require('express');
const router = express.Router();
const { updateProfile, getProfile } = require('../controllers/userController');
const { validate, updateProfileSchema } = require('../validators/profileValidator');
const { authenticate } = require('../middleware/auth');

// All user routes require authentication
router.use(authenticate);

// Get user profile
router.get('/me', getProfile);

// Update user profile
router.put('/me', validate(updateProfileSchema), updateProfile);

module.exports = router;
