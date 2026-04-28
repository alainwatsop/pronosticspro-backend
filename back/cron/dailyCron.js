const { getAllTodayMatches } = require('../services/sportsApi');
const { generateBatchPronostics } = require('../services/aiService');
const { publishDailyPronostics, publishResultsSummary } = require('../services/notificationService');
const { deactivateExpiredSubscriptions } = require('../services/paymentService');
const { flush } = require('../services/cacheService');
const { Match, Pronostic } = require('../models');

async function runDailyUpdate() {
  try {
    await flush();
    const rawMatches = await getAllTodayMatches();
    if (rawMatches.length === 0) return;

    const savedMatches = [];
    for (const md of rawMatches) {
      const m = await Match.findOneAndUpdate(
        { externalId: md.externalId },
        { ...md, updatedAt: new Date() },
        { upsert: true, new: true, runValidators: false }
      );
      savedMatches.push(m);
    }

    const needProno = savedMatches.filter(m => !m.pronostic);
    if (needProno.length === 0) return;

    const pronos = await generateBatchPronostics(needProno.map(m => m.toObject()));
    for (let i = 0; i < pronos.length; i += 1) {
      const p = await Pronostic.create({ matchId: needProno[i]._id, ...pronos[i] });
      await Match.findByIdAndUpdate(needProno[i]._id, { pronostic: p._id });
    }

    const todayData = savedMatches.slice(0, 10).map((m, i) => ({ ...m.toObject(), prono: pronos[i] || null }));
    await publishDailyPronostics(todayData);
  } catch (err) {
    console.error('CRON daily update error:', err.message);
  }
}

async function verifyResults() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const todayMid = new Date();
    todayMid.setHours(0, 0, 0, 0);

    const matches = await Match.find({
      date: { $gte: yesterday, $lt: todayMid },
      status: 'finished',
      pronostic: { $exists: true },
    }).populate('pronostic');

    let wins = 0;
    let losses = 0;
    let pushes = 0;
    for (const m of matches) {
      if (!m.pronostic || m.pronostic.result !== 'pending') continue;
      const result = evaluateResult(m, m.pronostic);
      await Pronostic.findByIdAndUpdate(m.pronostic._id, { result });
      if (result === 'win') wins += 1;
      if (result === 'loss') losses += 1;
      if (result === 'push') pushes += 1;
    }

    if (wins + losses + pushes > 0) {
      await publishResultsSummary(wins, losses, wins + losses + pushes);
    }
  } catch (err) {
    console.error('CRON verify results error:', err.message);
  }
}

async function weeklyMaintenance() {
  try {
    await deactivateExpiredSubscriptions();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    await Match.deleteMany({ date: { $lt: cutoff } });
  } catch (err) {
    console.error('CRON weekly maintenance error:', err.message);
  }
}

function evaluateResult(match, prono) {
  const h = match.home.score;
  const a = match.away.score;
  if (h == null || a == null) return 'pending';
  const total = h + a;
  switch (prono.type) {
    case '1': return h > a ? 'win' : 'loss';
    case '2': return a > h ? 'win' : 'loss';
    case 'X': return h === a ? 'win' : 'loss';
    case '1X': return h >= a ? 'win' : 'loss';
    case '12': return h !== a ? 'win' : 'loss';
    case '2X': return a >= h ? 'win' : 'loss';
    case 'BTTS': return h > 0 && a > 0 ? 'win' : 'loss';
    case 'O/U': {
      const thr = parseFloat((prono.tip.match(/[\d.]+/) || ['2.5'])[0]);
      if (prono.tip.toLowerCase().includes('over')) return total > thr ? 'win' : total === thr ? 'push' : 'loss';
      if (prono.tip.toLowerCase().includes('under')) return total < thr ? 'win' : total === thr ? 'push' : 'loss';
      return 'void';
    }
    default: return 'void';
  }
}

module.exports = { runDailyUpdate, verifyResults, weeklyMaintenance };
