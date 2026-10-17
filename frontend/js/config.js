/**
 * SkillSwap - Frontend Global Configuration
 * Centralized API endpoints and constants.
 */

const CONFIG = {
  // Backend Express API URL
  API_BASE_URL: (typeof window !== 'undefined' && window.location.origin.includes(':5050'))
    ? `${window.location.origin}/api`
    : 'http://localhost:5050/api',

  // Static uploads URL
  UPLOADS_BASE_URL: (typeof window !== 'undefined' && window.location.origin.includes(':5050'))
    ? window.location.origin
    : 'http://localhost:5050',

  // LocalStorage keys
  TOKEN_KEY: 'skillswap_token',
  USER_KEY: 'skillswap_user'
};

// Expose globally for vanilla scripts
window.CONFIG = CONFIG;
