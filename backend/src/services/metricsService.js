/**
 * Placeholder for auth/event metrics (Datadog, Prometheus, etc.).
 * No-op until a real metrics backend is wired.
 */
function trackAuth(_event, _success, _reason) {
  // intentionally empty
}

module.exports = {
  trackAuth,
};
