// routes/pronostics.js
const express = require('express');
const router = express.Router();
const { Pronostic, Match } = require('../models');

router.get('/', async (req, res) => {
  try {
    const pronos = await Pronostic.find().populate('matchId').sort({ generatedAt: -1 }).limit(50);
    res.json(pronos);
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.get('/history', async (req, res) => {
  try {
    const { sport, result, page=1, limit=20 } = req.query;
    const filter = { result: { $ne: 'pending' } };
    if (result) filter.result = result;
    const pronos = await Pronostic.find(filter).populate('matchId').sort({ generatedAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
    const total = await Pronostic.countDocuments(filter);
    const wins = await Pronostic.countDocuments({ result: 'win' });
    const all = await Pronostic.countDocuments({ result: { $ne: 'pending' } });
    res.json({ pronos, total, winRate: all > 0 ? ((wins/all)*100).toFixed(1) : 0 });
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
