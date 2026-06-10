const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt(match) {
  return `Analyse ce match ${match.sport?.toUpperCase()}:
MATCH: ${match.home?.name} vs ${match.away?.name}
COMPETITION: ${match.league}
DATE: ${new Date(match.date).toLocaleString('fr-FR')}
COTES: Domicile ${match.odds?.h2h?.home || 'N/A'} | Nul ${match.odds?.h2h?.draw || 'N/A'} | Exterieur ${match.odds?.h2h?.away || 'N/A'}

Reponds UNIQUEMENT en JSON:
{
  "tip": "Pronostic",
  "type": "1|2|X|1X|12|2X|BTTS|O/U|HDP",
  "cote": 1.80,
  "confiance": 70,
  "raison": "Justification courte"
}`;
}

function generateFallbackPronostic(match) {
  const h = match.odds?.h2h?.home || 2.0;
  const a = match.odds?.h2h?.away || 3.0;
  if (h < a) {
    return {
      tip: `Victoire ${match.home?.name}`,
      type: '1',
      cote: Number(h.toFixed(2)),
      confiance: 68,
      raison: 'Equipe domicile legerement favorite selon les cotes.',
      aiModel: 'fallback',
      generatedAt: new Date(),
    };
  }
  return {
    tip: `Victoire ${match.away?.name}`,
    type: '2',
    cote: Number(a.toFixed(2)),
    confiance: 64,
    raison: 'Equipe exterieure competitive selon les cotes.',
    aiModel: 'fallback',
    generatedAt: new Date(),
  };
}

function validateAndFormat(result) {
  return {
    tip: result.tip || 'Match equilibre',
    type: result.type || '1X',
    cote: parseFloat(result.cote) || 1.8,
    confiance: Math.min(90, Math.max(40, parseInt(result.confiance, 10) || 65)),
    raison: result.raison || 'Analyse basee sur les donnees disponibles.',
    aiModel: 'gpt-4o-mini',
    generatedAt: new Date(),
  };
}

async function generatePronostic(matchData) {
  if (!process.env.OPENAI_API_KEY) return generateFallbackPronostic(matchData);
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Tu es expert en paris sportifs. Reponds uniquement en JSON valide.' },
        { role: 'user', content: buildPrompt(matchData) },
      ],
    });
    const parsed = JSON.parse(response.choices[0].message.content);
    return validateAndFormat(parsed);
  } catch (err) {
    console.error('AI generation error:', err.message);
    return generateFallbackPronostic(matchData);
  }
}

async function generateBatchPronostics(matches) {
  const results = [];
  for (let i = 0; i < matches.length; i += 5) {
    const chunk = matches.slice(i, i + 5);
    const chunkResults = await Promise.allSettled(chunk.map(m => generatePronostic(m)));
    results.push(...chunkResults.map(r => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean));
    if (i + 5 < matches.length) await new Promise(r => setTimeout(r, 500));
  }
  return results;
}

module.exports = { generatePronostic, generateBatchPronostics };
