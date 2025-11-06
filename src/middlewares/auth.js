const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token manquant' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Utilisateur non trouvé' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'Token invalide ou expiré' 
    });
  }
};

module.exports = auth;