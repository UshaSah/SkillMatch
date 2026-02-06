const Listing = require('../models/Listing');
const Profile = require('../models/Profile');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Create a new listing
 */
const createListing = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const listingData = {
      ...req.body,
      ownerId: userId
    };

    const listing = new Listing(listingData);
    await listing.save();

    // Populate owner info for response
    await listing.populate('ownerId', 'email');

    logger.info('Listing created', {
      requestId: req.requestId,
      userId: userId,
      listingId: listing._id,
      type: listing.type
    });

    res.status(201).json({
      success: true,
      data: {
        listing: listing
      },
      message: 'Listing created successfully',
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get listing by ID
 */
const getListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id).populate('ownerId', 'email');

    if (!listing) {
      throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');
    }

    // Get owner's profile if exists
    const ownerProfile = await Profile.findOne({ userId: listing.ownerId._id })
      .select('displayName avatarUrl skills rating reputation');

    // Increment view count (async, don't wait)
    listing.incrementViewCount().catch(err => {
      logger.error('Failed to increment view count', { error: err.message });
    });

    // Add owner profile to response
    const listingObj = listing.toObject();
    if (ownerProfile) {
      listingObj.owner = {
        email: listing.ownerId.email,
        profile: ownerProfile
      };
    }

    res.json({
      success: true,
      data: {
        listing: listingObj
      },
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search/browse listings with filters
 */
const searchListings = async (req, res, next) => {
  try {
    const {
      type,
      skills,
      category,
      location,
      radius = 25,
      status = 'active',
      timeCommitment,
      isRemote,
      ownerId,
      page = 1,
      limit = 20,
      sortBy = 'newest'
    } = req.query;

    // Build query
    const query = {
      status: status,
      isActive: true
    };

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by owner
    if (ownerId) {
      query.ownerId = ownerId;
    }

    // Filter by time commitment
    if (timeCommitment) {
      query.timeCommitment = timeCommitment;
    }

    // Filter by remote
    if (isRemote !== undefined) {
      query.isRemote = isRemote === 'true';
    }

    // Filter by skills
    if (skills) {
      const skillArray = Array.isArray(skills) ? skills : [skills];
      query['skills.name'] = { 
        $in: skillArray.map(s => new RegExp(s.trim(), 'i'))
      };
    }

    // Filter by category
    if (category) {
      query['skills.category'] = new RegExp(category.trim(), 'i');
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:145',message:'Location param received',data:{rawLocation:location,locationType:typeof location,radius:radius},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Parse location if provided as string "[lng,lat]" or array
    let parsedLocation = null;
    if (location) {
      if (typeof location === 'string') {
        try {
          parsedLocation = JSON.parse(location);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:151',message:'Location parsed via JSON.parse',data:{parsedLocation:parsedLocation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        } catch (e) {
          // Try splitting by comma
          const parts = location.split(',');
          if (parts.length === 2) {
            parsedLocation = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:156',message:'Location parsed via comma split',data:{parsedLocation:parsedLocation,parts:parts},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
          }
        }
      } else if (Array.isArray(location)) {
        parsedLocation = location;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:159',message:'Location already array',data:{parsedLocation:parsedLocation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:163',message:'After location parsing',data:{parsedLocation:parsedLocation,isArray:Array.isArray(parsedLocation),length:parsedLocation?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Parse and validate radius
    const parsedRadius = radius ? parseFloat(radius) : 25;
    const maxDistanceMeters = parsedRadius * 1609.34; // Convert miles to meters

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:168',message:'Radius parsed',data:{rawRadius:radius,parsedRadius:parsedRadius,isNaN:isNaN(parsedRadius),maxDistanceMeters:maxDistanceMeters},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Build sort object
    let sortObj = {};
    switch (sortBy) {
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'popularity':
        sortObj = { viewCount: -1, interestCount: -1 };
        break;
      case 'newest':
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    // Geospatial search
    let listings;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:184',message:'Checking geospatial branch condition',data:{hasParsedLocation:!!parsedLocation,isArray:Array.isArray(parsedLocation),length:parsedLocation?.length,willEnterGeospatial:parsedLocation && Array.isArray(parsedLocation) && parsedLocation.length === 2},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (parsedLocation && Array.isArray(parsedLocation) && parsedLocation.length === 2) {
      // Geospatial query with location
      const [longitude, latitude] = parsedLocation.map(Number);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:188',message:'Coordinates extracted',data:{longitude:longitude,latitude:latitude,isNaNLong:isNaN(longitude),isNaNLat:isNaN(latitude),longInRange:longitude >= -180 && longitude <= 180,latInRange:latitude >= -90 && latitude <= 90},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Validate coordinates
      if (isNaN(longitude) || isNaN(latitude) || 
          longitude < -180 || longitude > 180 || 
          latitude < -90 || latitude > 90) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:193',message:'Coordinates validation failed',data:{longitude:longitude,latitude:latitude,reason:'invalid_coords'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        logger.warn('Invalid coordinates provided for geospatial search', {
          requestId: req.requestId,
          coordinates: parsedLocation
        });
        // Fallback to regular query
        listings = await Listing.find(query)
          .populate('ownerId', 'email')
          .sort(sortObj)
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit));
      } else {
        // Use geospatial query
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:204',message:'Executing geospatial MongoDB query',data:{longitude:longitude,latitude:latitude,maxDistanceMeters:maxDistanceMeters,query:query},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        try {
          listings = await Listing.find({
            ...query,
            'location.coordinates': {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: [longitude, latitude]
                },
                $maxDistance: maxDistanceMeters
              }
            }
          })
          .populate('ownerId', 'email')
          .sort(sortBy === 'distance' ? {} : sortObj) // Distance sorting is automatic with $near
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit));
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:222',message:'Geospatial query succeeded',data:{resultsCount:listings.length,longitude:longitude,latitude:latitude,radius:parsedRadius},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          logger.info('Geospatial search executed', {
            requestId: req.requestId,
            coordinates: [longitude, latitude],
            radius: parsedRadius,
            results: listings.length
          });
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:232',message:'Geospatial query failed with error',data:{errorMessage:error.message,errorName:error.name,errorCode:error.code,stack:error.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          // Log the actual error for debugging
          logger.error('Geospatial search failed, falling back to regular query', {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack
          });
          // Fallback to regular query if geospatial fails (e.g., index not created)
          listings = await Listing.find(query)
            .populate('ownerId', 'email')
            .sort(sortObj)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        }
      }
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingController.js:245',message:'Using regular query (no geospatial)',data:{reason:'no_location_or_invalid'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Regular query without geospatial
      listings = await Listing.find(query)
        .populate('ownerId', 'email')
        .sort(sortObj)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));
    }

    // Get total count for pagination
    const total = await Listing.countDocuments(query);

    logger.info('Listings searched', {
      requestId: req.requestId,
      userId: req.user?._id,
      filters: Object.keys(query),
      results: listings.length
    });

    res.json({
      success: true,
      data: {
        listings: listings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update listing
 */
const updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
      throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');
    }

    // Check ownership or admin
    const isOwner = listing.ownerId.toString() === userId.toString();
    const isAdmin = req.user.roles?.includes('admin');

    if (!isOwner && !isAdmin) {
      throw new AppError(
        'You do not have permission to update this listing',
        403,
        'FORBIDDEN'
      );
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== 'ownerId' && key !== '_id') {
        listing[key] = updates[key];
      }
    });

    await listing.save();

    logger.info('Listing updated', {
      requestId: req.requestId,
      userId: userId,
      listingId: listing._id,
      updatedFields: Object.keys(updates)
    });

    res.json({
      success: true,
      data: {
        listing: listing
      },
      message: 'Listing updated successfully',
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete listing (soft delete - set status to cancelled)
 */
const deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const listing = await Listing.findById(id);

    if (!listing) {
      throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');
    }

    // Check ownership or admin
    const isOwner = listing.ownerId.toString() === userId.toString();
    const isAdmin = req.user.roles?.includes('admin');

    if (!isOwner && !isAdmin) {
      throw new AppError(
        'You do not have permission to delete this listing',
        403,
        'FORBIDDEN'
      );
    }

    // Soft delete - set status to cancelled
    listing.status = 'cancelled';
    listing.isActive = false;
    await listing.save();

    logger.info('Listing deleted', {
      requestId: req.requestId,
      userId: userId,
      listingId: listing._id
    });

    res.json({
      success: true,
      message: 'Listing deleted successfully',
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's own listings
 */
const getMyListings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, status } = req.query;

    const query = {
      ownerId: userId
    };

    if (status) {
      query.status = status;
    }

    const listings = await Listing.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Listing.countDocuments(query);

    res.json({
      success: true,
      data: {
        listings: listings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createListing,
  getListing,
  searchListings,
  updateListing,
  deleteListing,
  getMyListings
};