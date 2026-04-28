const express = require('express');
const { Match } = require('../models');

const router = express.Router();

router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const matches = await Match.find({ date: { $gte: today, $lt: tomorrow } })
      .populate('pronostic')
      .sort({ date: 1 })
      .limit(50);

    const sport = req.query.sport;
    const filtered = sport ? matches.filter(m => m.sport === sport) : matches;
    return res.json(filtered.map(formatMatch));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate('pronostic');
    if (!match) return res.status(404).json({ error: 'Match non trouve' });
    return res.json(formatMatch(match));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

function formatMatch(m) {
  return {
    id: m._id,
    sport: m.sport,
    league: m.league,
    league_logo: m.leagueLogo || '⚽',
    time: new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    status: m.status,
    home: { name: m.home?.name, logo: m.home?.logo, score: m.home?.score },
    away: { name: m.away?.name, logo: m.away?.logo, score: m.away?.score },
    odds: { h: m.odds?.h2h?.home, d: m.odds?.h2h?.draw, a: m.odds?.h2h?.away },
    prono: m.pronostic ? {
      tip: m.pronostic.tip,
      type: m.pronostic.type,
      cote: m.pronostic.cote,
      confiance: m.pronostic.confiance,
      raison: m.pronostic.raison,
    } : null,
  };
}

module.exports = router;
