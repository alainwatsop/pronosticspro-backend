// services/aiService.js
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate AI pronostic for a single match
 * @param {Object} matchData - Full match data including stats, H2H, odds
 * @returns {Object} Pronostic object
 */
async function generatePronostic(matchData) {
  const prompt = buildPrompt(matchData);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en analyse sportive et paris. Tu analyses des matchs sportifs et génères des pronostics précis basés sur des données statistiques.
          
RÈGLES IMPORTANTES:
- Analyse objectivement toutes les données fournies
- Ton pronostic doit être réaliste et bien justifié
- Tu réponds UNIQUEMENT en JSON valide, aucun texte autour
- Le taux de confiance doit refléter la certitude réelle (ne jamais dépasser 90%)`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return validateAndFormat(result, matchData);

  } catch (err) {
    console.error('❌ AI generation error:', err.message);
    return generateFallbackPronostic(matchData);
  }
}

/**
 * Build comprehensive prompt for AI analysis
 */
function buildPrompt(match) {
  const sport = match.sport;

  let statsSection = '';

  if (sport === 'football') {
    statsSection = `
STATISTIQUES FOOTBALL:
- Possession moyenne: ${match.home.name} ${match.homeStats?.avgPossession || 'N/A'}% | ${match.away.name} ${match.awayStats?.avgPossession || 'N/A'}%
- xG moyen par match: ${match.homeStats?.avgXG || 'N/A'} | ${match.awayStats?.avgXG || 'N/A'}
- Buts marqués/match: ${match.homeStats?.avgGoals || 'N/A'} | ${match.awayStats?.avgGoals || 'N/A'}
- Buts encaissés/match: ${match.homeStats?.avgConceded || 'N/A'} | ${match.awayStats?.avgConceded || 'N/A'}
- Forme récente (5 derniers): ${match.homeStats?.form || 'N/A'} | ${match.awayStats?.form || 'N/A'}
`;
  } else if (sport === 'basketball') {
    statsSection = `
STATISTIQUES BASKETBALL:
- Points par match: ${match.homeStats?.avgPoints || 'N/A'} | ${match.awayStats?.avgPoints || 'N/A'}
- Points encaissés/match: ${match.homeStats?.avgConceded || 'N/A'} | ${match.awayStats?.avgConceded || 'N/A'}
- Offensive Rating: ${match.homeStats?.ortg || 'N/A'} | ${match.awayStats?.ortg || 'N/A'}
`;
  }

  const h2hSection = match.headToHead?.length > 0 ? `
HISTORIQUE H2H (10 derniers matchs):
${match.headToHead.slice(0, 5).map(h =>
  `- ${new Date(h.date).toLocaleDateString('fr-FR')}: ${match.home.name} ${h.homeScore} - ${h.awayScore} ${match.away.name}`
).join('\n')}
Bilan: ${match.home.name} ${match.headToHead.filter(h => h.winner === 'home').length}W | Nul ${match.headToHead.filter(h => h.winner === 'draw').length}D | ${match.away.name} ${match.headToHead.filter(h => h.winner === 'away').length}W
` : '';

  const oddsSection = match.odds ? `
COTES BOOKMAKERS:
- Victoire ${match.home.name}: ${match.odds.h2h?.home || 'N/A'}
- Match nul: ${match.odds.h2h?.draw || 'N/A'}
- Victoire ${match.away.name}: ${match.odds.h2h?.away || 'N/A'}
- Over 2.5: ${match.odds.over25 || 'N/A'} | Under 2.5: ${match.odds.under25 || 'N/A'}
- BTTS Oui: ${match.odds.btts?.yes || 'N/A'} | BTTS Non: ${match.odds.btts?.no || 'N/A'}
` : '';

  return `Analyse ce match ${sport.toUpperCase()} et génère un pronostic:

MATCH: ${match.home.name} vs ${match.away.name}
COMPÉTITION: ${match.league}
DATE/HEURE: ${new Date(match.date).toLocaleString('fr-FR')}
LIEU: ${match.venue || 'Non précisé'}

${statsSection}
${h2hSection}
${oddsSection}

Génère un pronostic JSON avec cette structure EXACTE:
{
  "tip": "Description courte du pronostic (ex: Victoire ${match.home.name}, BTTS, Over 2.5, etc.)",
  "type": "code court (1, 2, X, 1X, 12, 2X, BTTS, O/U, Combo, HDP)",
  "cote": 1.85,
  "confiance": 74,
  "raison": "Justification en 1-2 phrases basée sur les données",
  "analyse_complete": "Analyse détaillée en 3-4 phrases couvrant forme, H2H, cotes et contexte",
  "paris_alternatifs": [
    { "tip": "Paris alternatif 1", "type": "X", "cote": 3.5, "confiance": 45 },
    { "tip": "Paris alternatif 2", "type": "BTTS", "cote": 1.75, "confiance": 60 }
  ]
}`;
}

function validateAndFormat(result, match) {
  return {
    tip: result.tip || `Match ${match.home.name} vs ${match.away.name}`,
    type: result.type || '1X',
    cote: parseFloat(result.cote) || 1.80,
    confiance: Math.min(90, Math.max(40, parseInt(result.confiance) || 65)),
    raison: result.raison || 'Analyse basée sur les statistiques récentes.',
    analyseComplete: result.analyse_complete || '',
    parisAlternatifs: result.paris_alternatifs || [],
    aiModel: 'gpt-4o',
    generatedAt: new Date(),
  };
}

/**
 * Fallback pronostic using simple heuristics (no AI API needed)
 */
function generateFallbackPronostic(match) {
  const sport = match.sport;
  const tips = {
    football: [
      { tip: 'Match Over 2.5 buts', type: 'O/U', cote: 1.75, confiance: 65 },
      { tip: 'BTTS – Les deux équipes marquent', type: 'BTTS', cote: 1.80, confiance: 62 },
      { tip: '1X – Victoire ou nul domicile', type: '1X', cote: 1.42, confiance: 70 },
    ],
    basketball: [
      { tip: 'Match Over total pts', type: 'O/U', cote: 1.90, confiance: 68 },
      { tip: 'Victoire équipe locale', type: '1', cote: 1.65, confiance: 62 },
    ],
    tennis: [
      { tip: 'Favori gagne en 2 sets', type: '1', cote: 1.60, confiance: 65 },
    ],
  };

  const sportTips = tips[sport] || tips.football;
  const selected = sportTips[Math.floor(Math.random() * sportTips.length)];

  return {
    ...selected,
    raison: 'Analyse basée sur les statistiques générales de la compétition.',
    analyseComplete: 'Données insuffisantes pour une analyse complète. Pronostic basé sur les tendances générales.',
    parisAlternatifs: [],
    aiModel: 'fallback',
    generatedAt: new Date(),
  };
}

/**
 * Batch generate pronostics for multiple matches
 */
async function generateBatchPronostics(matches) {
  const results = [];

  // Process in chunks of 5 to avoid rate limits
  for (let i = 0; i < matches.length; i += 5) {
    const chunk = matches.slice(i, i + 5);
    const chunkResults = await Promise.allSettled(
      chunk.map(m => generatePronostic(m))
    );
    results.push(...chunkResults.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean));

    // Small delay between chunks
    if (i + 5 < matches.length) await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}

module.exports = { generatePronostic, generateBatchPronostics };
