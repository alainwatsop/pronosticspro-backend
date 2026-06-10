const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

async function sendTelegramMessage(text, parseMode = 'HTML') {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) return;
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHANNEL_ID,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Telegram error:', err.response?.data || err.message);
  }
}

async function publishDailyPronostics(matches) {
  if (!matches?.length) return;
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  let msg = `🏆 <b>PRONOSTICS DU JOUR - ${today.toUpperCase()}</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  matches.slice(0, 12).forEach(m => {
    if (!m.prono) return;
    msg += `🆚 ${m.home.name} vs ${m.away.name}\n`;
    msg += `📋 ${m.league}\n`;
    msg += `✅ <b>${m.prono.tip}</b> @ ${m.prono.cote}\n`;
    msg += `📊 Confiance: ${m.prono.confiance}%\n\n`;
  });

  await sendTelegramMessage(msg);
}

async function publishResultsSummary(wins, losses, total) {
  const rate = total > 0 ? ((wins / total) * 100).toFixed(0) : 0;
  const msg = `📊 <b>RESULTATS D'HIER</b>\n✅ ${wins} | ❌ ${losses}\n📈 Taux: <b>${rate}%</b>`;
  await sendTelegramMessage(msg);
}

module.exports = { sendTelegramMessage, publishDailyPronostics, publishResultsSummary };
