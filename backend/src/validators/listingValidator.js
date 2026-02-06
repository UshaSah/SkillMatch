const Joi = require('joi');

// Skill validation schema (reused from profile)
const skillSchema = Joi.object({
  name: Joi.string().trim().required().max(50),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').default('intermediate'),
  category: Joi.string().trim().required().max(50)
});

// Location coordinates validation
// Accepts both string (JSON) and array formats for query parameters
const coordinatesSchema = Joi.alternatives().try(
  // Array format: [lng, lat]
  Joi.array()
    .items(Joi.number())
    .length(2)
    .custom((value, helpers) => {
      const [lng, lat] = value;
      if (lng < -180 || lng > 180) {
        return helpers.error('coordinates.longitude.invalid');
      }
      if (lat < -90 || lat > 90) {
        return helpers.error('coordinates.latitude.invalid');
      }
      return value;
    }, 'Coordinates validation'),
  // String format: "[lng, lat]" or "lng,lat"
  Joi.string()
    .custom((value, helpers) => {
      let parsed;
      try {
        // Try parsing as JSON string
        parsed = JSON.parse(value);
      } catch (e) {
        // Try splitting by comma
        const parts = value.split(',');
        if (parts.length === 2) {
          parsed = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
        } else {
          return helpers.error('coordinates.invalid');
        }
      }
      
      // Validate parsed coordinates
      if (!Array.isArray(parsed) || parsed.length !== 2) {
        return helpers.error('coordinates.invalid');
      }
      
      const [lng, lat] = parsed;
      if (isNaN(lng) || isNaN(lat)) {
        return helpers.error('coordinates.invalid');
      }
      if (lng < -180 || lng > 180) {
        return helpers.error('coordinates.longitude.invalid');
      }
      if (lat < -90 || lat > 90) {
        return helpers.error('coordinates.latitude.invalid');
      }
      
      return parsed; // Return parsed array
    }, 'String coordinates parsing')
)
.messages({
  'coordinates.longitude.invalid': 'Longitude must be between -180 and 180',
  'coordinates.latitude.invalid': 'Latitude must be between -90 and 90',
  'coordinates.invalid': 'Invalid coordinates format. Use [longitude, latitude] or "longitude,latitude"'
});

// Location address validation
const addressSchema = Joi.object({
  street: Joi.string().trim().max(200).allow('', null),
  city: Joi.string().trim().max(100).allow('', null),
  state: Joi.string().trim().max(100).allow('', null),
  zipCode: Joi.string().trim().max(20).allow('', null),
  country: Joi.string().trim().max(100).allow('', null)
});

// Location validation
const locationSchema = Joi.object({
  coordinates: coordinatesSchema.required(),
  address: addressSchema.optional()
});


// Image validation
const imageSchema = Joi.object({
  url: Joi.string().uri().required(),
  caption: Joi.string().trim().max(200).allow('', null),
  order: Joi.number().min(0).default(0)
});

// Create listing validation schema
const createListingSchema = Joi.object({
  type: Joi.string().valid('offer', 'request').required(),
  title: Joi.string().min(5).max(100).trim().required(),
  description: Joi.string().min(10).max(1000).trim().required(),
  skills: Joi.array().items(skillSchema).min(1).required(),
  location: locationSchema.required(),
  // compensation: compensationSchema.optional(), // Removed - not using compensation yet
  timeCommitment: Joi.string().valid('one-time', 'short-term', 'long-term', 'ongoing').default('one-time'),
  estimatedHours: Joi.object({
    min: Joi.number().min(0).optional(),
    max: Joi.number().min(0).optional()
  }).optional(),
  requirements: Joi.array().items(Joi.string().trim().max(200)).optional(),
  benefits: Joi.array().items(Joi.string().trim().max(200)).optional(),
  images: Joi.array().items(imageSchema).max(10).optional(),
  contactMethod: Joi.string().valid('message', 'email', 'phone').default('message'),
  isRemote: Joi.boolean().default(false)
});

// Update listing validation schema
const updateListingSchema = Joi.object({
  title: Joi.string().min(5).max(100).trim().optional(),
  description: Joi.string().min(10).max(1000).trim().optional(),
  skills: Joi.array().items(skillSchema).min(1).optional(),
  location: locationSchema.optional(),
  // compensation: compensationSchema.optional(), // Removed - not using compensation yet
  timeCommitment: Joi.string().valid('one-time', 'short-term', 'long-term', 'ongoing').optional(),
  estimatedHours: Joi.object({
    min: Joi.number().min(0).optional(),
    max: Joi.number().min(0).optional()
  }).optional(),
  status: Joi.string().valid('active', 'inactive', 'completed', 'cancelled').optional(),
  requirements: Joi.array().items(Joi.string().trim().max(200)).optional(),
  benefits: Joi.array().items(Joi.string().trim().max(200)).optional(),
  images: Joi.array().items(imageSchema).max(10).optional(),
  contactMethod: Joi.string().valid('message', 'email', 'phone').optional(),
  isRemote: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Search/query validation schema
const searchListingSchema = Joi.object({
  type: Joi.string().valid('offer', 'request').optional(),
  skills: Joi.alternatives().try(
    Joi.string().trim(),
    Joi.array().items(Joi.string().trim())
  ).optional(),
  category: Joi.string().trim().optional(),
  location: coordinatesSchema.optional(),
  radius: Joi.number().min(1).max(100).default(25),
  status: Joi.string().valid('active', 'inactive', 'completed', 'cancelled').default('active'),
  // compensationType: Joi.string().valid('free', 'paid', 'trade', 'negotiable').optional(), // Removed - not using compensation yet
  timeCommitment: Joi.string().valid('one-time', 'short-term', 'long-term', 'ongoing').optional(),
  isRemote: Joi.boolean().optional(),
  ownerId: Joi.string().hex().length(24).optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('newest', 'oldest', 'distance', 'popularity').default('newest')
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    // For query params, validate req.query; for body, validate req.body
    const dataToValidate = schema === searchListingSchema ? req.query : req.body;
    
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
    if (schema === searchListingSchema) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bcb60e61-1699-40f7-b0b4-ed6304e32a64',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'listingValidator.js:184',message:'Validation successful, assigning to req.query',data:{location:value.location,locationType:typeof value.location,isArray:Array.isArray(value.location)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      req.query = value;
    } else {
      req.body = value;
    }
    
    next();
  };
};

module.exports = {
  createListingSchema,
  updateListingSchema,
  searchListingSchema,
  validate
};