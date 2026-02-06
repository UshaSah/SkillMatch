const express = require('express');
const router = express.Router();
const {
  createListing,
  getListing,
  searchListings,
  updateListing,
  deleteListing,
  getMyListings
} = require('../controllers/listingController');
const {
  validate,
  createListingSchema,
  updateListingSchema,
  searchListingSchema
} = require('../validators/listingValidator');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Public routes (search/browse)
router.get('/', optionalAuth, validate(searchListingSchema), searchListings);

// Protected routes (require authentication)
router.use(authenticate);

// Create listing
router.post('/', validate(createListingSchema), createListing);

// Get user's own listings (MUST come before /:id route)
router.get('/me', getMyListings);

// Get single listing (must come after /me to avoid matching /me as /:id)
router.get('/:id', getListing);

// Update listing
router.put('/:id', validate(updateListingSchema), updateListing);

// Delete listing
router.delete('/:id', deleteListing);

module.exports = router;
