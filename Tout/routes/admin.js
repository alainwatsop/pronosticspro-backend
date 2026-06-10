const express = require('express');
const { User, Match, Pronostic } = require('../models');
const { runDailyUpdate } = require('../cron/dailyCron');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [totalUsers, vipUsers, todayMatches, wins, totalPronos] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'vip.active': true }),
      Match.countDocuments({ date: { $gte: start } }),
      Pronostic.countDocuments({ result: 'win' }),
      Pronostic.countDocuments({ result: { $ne: 'pending' } }),
    ]);

    return res.json({
      totalUsers,
      vipUsers,
      todayMatches,
      totalPronos,
      winRate: totalPronos > 0 ? Number(((wins / totalPronos) * 100).toFixed(1)) : 0,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/sync', authenticate, requireAdmin, async (_req, res) => {
  runDailyUpdate().catch(console.error);
  return res.json({ message: 'Synchronisation lancee' });
});

router.put('/pronostics/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const prono = await Pronostic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json(prono);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await User.countDocuments();
    return res.json({ users, total, page, limit });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
