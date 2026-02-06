const { v4: uuidv4 } = require('uuid');

const requestId = (req, res, next) => {
  // Generate or use existing request ID
  req.requestId = req.headers['x-request-id'] || uuidv4();
  
  // Set response header
  res.setHeader('x-request-id', req.requestId);
  
  // Add to response locals for logging
  res.locals.requestId = req.requestId;
  
  next();
};

module.exports = requestId;
