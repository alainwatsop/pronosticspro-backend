const express = require('express');
const OpenAI = require('openai');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function chatSystem(language) {
  if (language === 'fr') {
    return "Tu es l'assistant PronosticsPro. Tu reponds uniquement sur les paris sportifs et l'utilisation du site.";
  }
  return 'You are PronosticsPro assistant. Answer only about sports betting and site usage.';
}

router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], language = 'fr' } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Message requis' });
    if (!process.env.OPENAI_API_KEY) return res.json({ reply: 'Assistant IA non configure cote serveur.' });

    const messages = [
      { role: 'system', content: chatSystem(language) },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 280,
      messages,
    });
    return res.json({ reply: completion.choices?.[0]?.message?.content?.trim() || '' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/translate', async (req, res) => {
  try {
    const { targetLanguage, texts } = req.body || {};
    if (!targetLanguage || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'targetLanguage et texts[] requis' });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'Service traduction indisponible (OPENAI_API_KEY manquante)' });
    }

    const payload = texts.slice(0, 400);
    const prompt = `Translate each item to language code "${targetLanguage}".
Return strict JSON object with key "translations" (array, same order, no omissions).
Input:\n${JSON.stringify(payload)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a translation engine. Preserve meaning, punctuation, and placeholders.' },
        { role: 'user', content: prompt },
      ],
    });
    const content = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const translations = Array.isArray(parsed.translations) ? parsed.translations : payload;
    return res.json({ translations });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
