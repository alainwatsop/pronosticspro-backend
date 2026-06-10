// services/notificationService.js
const axios = require('axios');

const TELEGRAM_BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID; // ex: @PronosticsPro ou -100xxxxxxxx

/**
 * Envoyer un message sur le canal Telegram
 */
async function sendTelegramMessage(text, parseMode = 'HTML') {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.warn('⚠️ Telegram non configuré (TELEGRAM_BOT_TOKEN manquant)');
    return;
  }
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      { chat_id: TELEGRAM_CHANNEL_ID, text, parse_mode: parseMode, disable_web_page_preview: true }
    );
    console.log('✅ Message Telegram envoyé');
  } catch (err) {
    console.error('❌ Telegram erreur:', err.response?.data || err.message);
  }
}

/**
 * Formater et publier les pronostics du jour sur Telegram
 */
async function publishDailyPronostics(matches) {
  if (!matches || matches.length === 0) return;

  const today = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

  let msg = `🏆 <b>PRONOSTICS DU JOUR – ${today.toUpperCase()}</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const sports = {};
  for (const m of matches) {
    if (!m.prono) continue;
    if (!sports[m.sport]) sports[m.sport] = [];
    sports[m.sport].push(m);
  }

  const sportIcons = { football:'⚽', basketball:'🏀', tennis:'🎾', hockey:'🏒' };

  for (const [sport, sportMatches] of Object.entries(sports)) {
    msg += `${sportIcons[sport] || '🏅'} <b>${sport.toUpperCase()}</b>\n\n`;
    for (const m of sportMatches) {
      const conf = m.prono.confiance;
      const confEmoji = conf >= 75 ? '🟢' : conf >= 60 ? '🟡' : '🔴';
      msg += `🆚 ${m.home.name} vs ${m.away.name}\n`;
      msg += `📋 ${m.league} · 🕐 ${m.time}\n`;
      msg += `✅ <b>Pronostic: ${m.prono.tip}</b>\n`;
      msg += `💰 Cote: <b>${m.prono.cote}</b> · ${confEmoji} Confiance: ${conf}%\n`;
      msg += `💡 ${m.prono.raison}\n\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  msg += `🔗 Voir tous les pronos: ${process.env.FRONTEND_URL}\n`;
  msg += `🎁 Code promo: <b>TAB6677</b>\n`;
  msg += `⚠️ Pariez responsablement. 18+ uniquement.`;

  await sendTelegramMessage(msg);
}

/**
 * Notifier les résultats de la veille sur Telegram
 */
async function publishResultsSummary(wins, losses, total) {
  const rate = total > 0 ? ((wins / total) * 100).toFixed(0) : 0;
  const emoji = rate >= 70 ? '🟢' : rate >= 50 ? '🟡' : '🔴';

  const msg = `📊 <b>RÉSULTATS D'HIER</b>\n\n`
    + `✅ Gagnés: <b>${wins}</b>\n`
    + `❌ Perdus: <b>${losses}</b>\n`
    + `📈 Taux: <b>${rate}%</b> ${emoji}\n\n`
    + `🔥 Continuez avec nous: ${process.env.FRONTEND_URL}\n`
    + `💎 Accès VIP: pronos premium chaque jour!`;

  await sendTelegramMessage(msg);
}

module.exports = { sendTelegramMessage, publishDailyPronostics, publishResultsSummary };
