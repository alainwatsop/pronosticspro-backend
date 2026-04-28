const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'pronosticspro_secret_2025';

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expire' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acces reserve aux administrateurs' });
  }
  next();
};

const requireVip = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifie' });
  if (req.user.role === 'admin') return next();
  if (req.user.role === 'vip' && req.user.vip?.active) return next();
  return res.status(403).json({ error: 'Acces VIP requis', upgrade: true });
};

module.exports = { authenticate, requireAdmin, requireVip };
