// services/sportsApi.js
const axios = require('axios');

const API_KEY = process.env.SPORTS_API_KEY;
const API_HOST = 'v3.football.api-sports.io'; // api-sports.io (supports football, basketball, tennis...)
const BASE_URL = 'https://v3.football.api-sports.io';

const sportsClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-rapidapi-host': API_HOST,
    'x-rapidapi-key': API_KEY,
  },
  timeout: 10000,
});

// Also support All Sports API as backup
const allSportsClient = axios.create({
  baseURL: 'https://allsportsapi.com/api/',
  params: { APIkey: process.env.ALL_SPORTS_API_KEY },
  timeout: 10000,
});

/**
 * Fetch today's football fixtures
 */
async function getTodayFootballMatches() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await sportsClient.get('/fixtures', {
      params: {
        date: today,
        timezone: 'Africa/Douala',
        // Filter top leagues
        league: '2,3,39,140,78,61,135,203', // UCL, UEL, EPL, LaLiga, Bundesliga, Ligue1, SerieA, Super Lig
      }
    });

    return res.data.response.map(fixture => ({
      externalId: `football_${fixture.fixture.id}`,
      sport: 'football',
      league: fixture.league.name,
      leagueLogo: fixture.league.logo,
      date: new Date(fixture.fixture.date),
      status: mapStatus(fixture.fixture.status.short),
      home: {
        name: fixture.teams.home.name,
        logo: fixture.teams.home.logo,
        score: fixture.goals.home,
      },
      away: {
        name: fixture.teams.away.name,
        logo: fixture.teams.away.logo,
        score: fixture.goals.away,
      },
      venue: fixture.fixture.venue?.name,
      odds: await getMatchOdds(fixture.fixture.id),
    }));
  } catch (err) {
    console.error('❌ Football API error:', err.message);
    return [];
  }
}

/**
 * Fetch today's basketball matches (NBA, etc.)
 */
async function getTodayBasketballMatches() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await axios.get('https://v1.basketball.api-sports.io/games', {
      headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v1.basketball.api-sports.io' },
      params: { date: today, league: '12', season: '2024-2025' }, // NBA
    });

    return res.data.response.map(game => ({
      externalId: `basketball_${game.id}`,
      sport: 'basketball',
      league: game.league.name,
      leagueLogo: game.league.logo,
      date: new Date(game.date),
      status: mapStatus(game.status.short),
      home: { name: game.teams.home.name, logo: game.teams.home.logo, score: game.scores?.home?.total },
      away: { name: game.teams.away.name, logo: game.teams.away.logo, score: game.scores?.away?.total },
    }));
  } catch (err) {
    console.error('❌ Basketball API error:', err.message);
    return [];
  }
}

/**
 * Fetch today's tennis matches
 */
async function getTodayTennisMatches() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await axios.get('https://v1.tennis.api-sports.io/games', {
      headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v1.tennis.api-sports.io' },
      params: { date: today },
    });

    return res.data.response.slice(0, 10).map(game => ({
      externalId: `tennis_${game.id}`,
      sport: 'tennis',
      league: game.tournament.name,
      date: new Date(game.date),
      status: mapStatus(game.status.short),
      home: { name: game.players[0]?.name, logo: game.players[0]?.flag },
      away: { name: game.players[1]?.name, logo: game.players[1]?.flag },
    }));
  } catch (err) {
    console.error('❌ Tennis API error:', err.message);
    return [];
  }
}

/**
 * Get match odds from bookmakers
 */
async function getMatchOdds(fixtureId) {
  try {
    const res = await sportsClient.get('/odds', {
      params: { fixture: fixtureId, bookmaker: '6' } // Bet365
    });

    const data = res.data.response[0]?.bookmakers[0]?.bets;
    if (!data) return {};

    const h2h = data.find(b => b.name === 'Match Winner')?.values;
    const over = data.find(b => b.name === 'Goals Over/Under')?.values;
    const btts = data.find(b => b.name === 'Both Teams Score')?.values;

    return {
      h2h: {
        home: parseFloat(h2h?.find(v => v.value === 'Home')?.odd || 0),
        draw: parseFloat(h2h?.find(v => v.value === 'Draw')?.odd || 0),
        away: parseFloat(h2h?.find(v => v.value === 'Away')?.odd || 0),
      },
      over25: parseFloat(over?.find(v => v.value === 'Over 2.5')?.odd || 0),
      under25: parseFloat(over?.find(v => v.value === 'Under 2.5')?.odd || 0),
      btts: {
        yes: parseFloat(btts?.find(v => v.value === 'Yes')?.odd || 0),
        no: parseFloat(btts?.find(v => v.value === 'No')?.odd || 0),
      },
    };
  } catch {
    return {};
  }
}

/**
 * Get team statistics for AI analysis
 */
async function getTeamStats(teamId, leagueId, season = 2024) {
  try {
    const res = await sportsClient.get('/teams/statistics', {
      params: { team: teamId, league: leagueId, season }
    });
    return res.data.response;
  } catch {
    return null;
  }
}

/**
 * Get head to head history
 */
async function getH2H(homeId, awayId) {
  try {
    const res = await sportsClient.get('/fixtures/headtohead', {
      params: { h2h: `${homeId}-${awayId}`, last: 10 }
    });
    return res.data.response.slice(0, 10).map(f => ({
      date: f.fixture.date,
      homeScore: f.goals.home,
      awayScore: f.goals.away,
      winner: f.goals.home > f.goals.away ? 'home' : f.goals.home < f.goals.away ? 'away' : 'draw'
    }));
  } catch {
    return [];
  }
}

/**
 * Get all today's matches from all sports
 */
async function getAllTodayMatches() {
  const [football, basketball, tennis] = await Promise.allSettled([
    getTodayFootballMatches(),
    getTodayBasketballMatches(),
    getTodayTennisMatches(),
  ]);

  return [
    ...(football.status === 'fulfilled' ? football.value : []),
    ...(basketball.status === 'fulfilled' ? basketball.value : []),
    ...(tennis.status === 'fulfilled' ? tennis.value : []),
  ];
}

function mapStatus(short) {
  const map = { 'NS': 'scheduled', '1H': 'live', 'HT': 'live', '2H': 'live', 'FT': 'finished', 'PST': 'postponed', 'LIVE': 'live', 'Q1': 'live', 'Q2': 'live', 'Q3': 'live', 'Q4': 'live' };
  return map[short] || 'scheduled';
}

module.exports = { getAllTodayMatches, getTodayFootballMatches, getTeamStats, getH2H, getMatchOdds };
