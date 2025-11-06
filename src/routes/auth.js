const express = require('express');
const { validateRegister, validateLogin, register, login } = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);

module.exports = router;