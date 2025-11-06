const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Accès interdit: droits insuffisants' 
      });
    }
    next();
  };
};

module.exports = requireRole;