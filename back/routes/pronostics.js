const express = require('express');
const { Pronostic } = require('../models');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const pronos = await Pronostic.find()
      .populate('matchId')
      .sort({ generatedAt: -1 })
      .limit(50);
    return res.json(pronos);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const { result, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const filter = { result: { $ne: 'pending' } };
    if (result) filter.result = result;

    const pronos = await Pronostic.find(filter)
      .populate('matchId')
      .sort({ generatedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Pronostic.countDocuments(filter);
    const wins = await Pronostic.countDocuments({ result: 'win' });
    const all = await Pronostic.countDocuments({ result: { $ne: 'pending' } });

    return res.json({
      pronos,
      total,
      winRate: all > 0 ? Number(((wins / all) * 100).toFixed(1)) : 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
