// routes/users.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'pronosticspro_secret_2025';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token invalide' }); }
};

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  res.json(user);
});

router.put('/me', auth, async (req, res) => {
  const { firstName, lastName, notifications } = req.body;
  const user = await User.findByIdAndUpdate(req.user.userId, { firstName, lastName, notifications }, { new: true }).select('-password');
  res.json(user);
});

module.exports = router;
