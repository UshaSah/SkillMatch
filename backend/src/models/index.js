// Export all models
module.exports = {
  User: require('./User'),
  Profile: require('./Profile'),
  Listing: require('./Listing'),
  Thread: require('./Thread'),
  Message: require('./Message'),
  OutboxNotification: require('./OutboxNotification')
};
