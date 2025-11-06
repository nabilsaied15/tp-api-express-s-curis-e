const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 100, 
  message: {
    status: 'error',
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: {
    status: 'error',
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { globalLimiter, authLimiter };