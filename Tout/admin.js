// routes/admin.js
const express = require('express');
const router = express.Router();
const { User, Match, Pronostic, Subscription } = require('../models');
const jwt = require('jsonwebtoken');
const { runDailyUpdate } = require('../cron/dailyCron');
const JWT_SECRET = process.env.JWT_SECRET || 'pronosticspro_secret_2025';

const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
    req.user = decoded; next();
  } catch { res.status(401).json({ error: 'Token invalide' }); }
};

// Dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [totalUsers, vipUsers, todayMatches, wins, totalPronos] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'vip.active': true }),
      Match.countDocuments({ date: { $gte: new Date().setHours(0,0,0,0) } }),
      Pronostic.countDocuments({ result: 'win' }),
      Pronostic.countDocuments({ result: { $ne: 'pending' } }),
    ]);
    res.json({ totalUsers, vipUsers, todayMatches, winRate: totalPronos > 0 ? ((wins/totalPronos)*100).toFixed(1) : 0, totalPronos });
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Manual cron trigger
router.post('/sync', adminAuth, async (req, res) => {
  try {
    runDailyUpdate().catch(console.error); // async, don't wait
    res.json({ message: 'Synchronisation lancée' });
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Update pronostic
router.put('/pronostics/:id', adminAuth, async (req, res) => {
  try {
    const prono = await Pronostic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(prono);
  } catch(e) { res.status(500).json({error:e.message}); }
});

// List users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page=1, limit=20 } = req.query;
    const users = await User.find().select('-password').sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
    const total = await User.countDocuments();
    res.json({ users, total });
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
