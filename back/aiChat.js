const express = require('express');
const OpenAI = require('openai');

const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getSystemPrompt(language) {
  const base = `You are the official assistant for PronosticsPro.
You are strictly limited to sports betting topics and this platform:
- match analysis
- betting types (1X2, BTTS, over/under, handicap, bankroll)
- VIP plans and site usage
Never provide help for hacking, illegal topics, politics, health, or unrelated domains.
If out-of-scope, politely refuse and redirect to sports betting.`;

  if (language === 'fr') {
    return `Tu es l'assistant officiel de PronosticsPro.
Tu es strictement limité aux sujets paris sportifs et à la plateforme:
- analyse de match
- types de paris (1X2, BTTS, over/under, handicap, bankroll)
- plans VIP et utilisation du site
N'aide jamais pour le piratage, sujets illégaux, politique, santé ou hors domaine.
Si la question est hors sujet, refuse poliment et redirige vers les paris sportifs.`;
  }
  return base;
}

router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], language = 'fr' } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message requis' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        reply: "L'assistant IA n'est pas encore configure cote serveur. Ajoute OPENAI_API_KEY dans le .env backend.",
      });
    }

    const messages = [
      { role: 'system', content: getSystemPrompt(language) },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 280,
      messages,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    return res.json({ reply: reply || "Je n'ai pas pu generer de reponse." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
