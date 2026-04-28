// cron/dailyCron.js  (version complète)
const { getAllTodayMatches }             = require('../services/sportsApi');
const { generateBatchPronostics }        = require('../services/aiService');
const { publishDailyPronostics,
        publishResultsSummary }          = require('../services/notificationService');
const { deactivateExpiredSubscriptions } = require('../services/paymentService');
const { flush }                          = require('../services/cacheService');
const { Match, Pronostic }               = require('../models');

// ─── 1. MISE À JOUR QUOTIDIENNE (06:00) ──────────────────────────────────────
async function runDailyUpdate() {
  console.log('\n🚀 [CRON 06:00] Démarrage mise à jour quotidienne...');
  const t0 = Date.now();
  try {
    await flush();

    console.log('📡 Récupération matchs...');
    const rawMatches = await getAllTodayMatches();
    console.log(`   → ${rawMatches.length} matchs récupérés`);
    if (rawMatches.length === 0) { console.log('ℹ️ Aucun match aujourd\'hui'); return; }

    const savedMatches = [];
    for (const md of rawMatches) {
      try {
        const m = await Match.findOneAndUpdate(
          { externalId: md.externalId },
          { ...md, updatedAt: new Date() },
          { upsert: true, new: true, runValidators: false }
        );
        savedMatches.push(m);
      } catch (e) { console.error(`   ✗ Sauvegarde match: ${e.message}`); }
    }
    console.log(`💾 ${savedMatches.length} matchs sauvegardés`);

    const needProno = savedMatches.filter(m => !m.pronostic);
    console.log(`🤖 Génération pronostics pour ${needProno.length} matchs...`);
    const pronos = await generateBatchPronostics(needProno.map(m => m.toObject()));

    let saved = 0;
    for (let i = 0; i < pronos.length; i++) {
      try {
        const p = await Pronostic.create({ matchId: needProno[i]._id, ...pronos[i] });
        await Match.findByIdAndUpdate(needProno[i]._id, { pronostic: p._id });
        saved++;
      } catch (e) { console.error(`   ✗ Pronostic: ${e.message}`); }
    }
    console.log(`✅ ${saved} pronostics générés`);

    // Publier sur Telegram
    const todayData = savedMatches.slice(0, 10).map((m, i) => ({
      ...m.toObject(), prono: pronos[i] || null,
    }));
    await publishDailyPronostics(todayData);

    console.log(`\n✅ [CRON] Terminé en ${((Date.now()-t0)/1000).toFixed(1)}s\n`);
  } catch (err) {
    console.error('❌ [CRON] Erreur fatale:', err.message);
  }
}

// ─── 2. VÉRIFICATION RÉSULTATS (23:30) ───────────────────────────────────────
async function verifyResults() {
  console.log('\n🔍 [CRON 23:30] Vérification résultats...');
  try {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1); yesterday.setHours(0,0,0,0);
    const todayMid  = new Date(); todayMid.setHours(0,0,0,0);

    const matches = await Match.find({
      date: { $gte: yesterday, $lt: todayMid },
      status: 'finished',
      pronostic: { $exists: true },
    }).populate('pronostic');

    let wins=0, losses=0, pushes=0;
    for (const m of matches) {
      if (!m.pronostic || m.pronostic.result !== 'pending') continue;
      const result = evaluateResult(m, m.pronostic);
      await Pronostic.findByIdAndUpdate(m.pronostic._id, { result });
      if (result==='win')  wins++;
      if (result==='loss') losses++;
      if (result==='push') pushes++;
    }
    console.log(`   ✅ ${wins}W / ❌ ${losses}L / ➖ ${pushes}P`);
    if (wins+losses+pushes > 0) await publishResultsSummary(wins, losses, wins+losses+pushes);
  } catch (err) {
    console.error('❌ [CRON] Vérification résultats:', err.message);
  }
}

// ─── 3. MAINTENANCE HEBDOMADAIRE (lundi 03:00) ───────────────────────────────
async function weeklyMaintenance() {
  console.log('\n🔧 [CRON] Maintenance hebdomadaire...');
  try {
    await deactivateExpiredSubscriptions();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-90);
    const del = await Match.deleteMany({ date: { $lt: cutoff } });
    console.log(`🗑️ ${del.deletedCount} anciens matchs supprimés`);
    console.log('✅ Maintenance terminée');
  } catch (err) {
    console.error('❌ [CRON] Maintenance:', err.message);
  }
}

// ─── ÉVALUATION DES RÉSULTATS ────────────────────────────────────────────────
function evaluateResult(match, prono) {
  const h = match.home.score, a = match.away.score;
  if (h == null || a == null) return 'pending';
  const total = h + a;
  switch (prono.type) {
    case '1':    return h > a   ? 'win' : 'loss';
    case '2':    return a > h   ? 'win' : 'loss';
    case 'X':    return h === a ? 'win' : 'loss';
    case '1X':   return h >= a  ? 'win' : 'loss';
    case '12':   return h !== a ? 'win' : 'loss';
    case '2X':   return a >= h  ? 'win' : 'loss';
    case 'BTTS': return (h > 0 && a > 0) ? 'win' : 'loss';
    case 'O/U': {
      const thr = parseFloat((prono.tip.match(/[\d.]+/)||['2.5'])[0]);
      if (prono.tip.toLowerCase().includes('over'))  return total > thr ? 'win' : total===thr ? 'push' : 'loss';
      if (prono.tip.toLowerCase().includes('under')) return total < thr ? 'win' : total===thr ? 'push' : 'loss';
      return 'void';
    }
    default: return 'void';
  }
}

module.exports = { runDailyUpdate, verifyResults, weeklyMaintenance, evaluateResult };
