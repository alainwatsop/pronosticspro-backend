// services/cacheService.js
/**
 * Cache service avec support Redis (production) et Map in-memory (dev/fallback)
 * Évite de surcharger les APIs externes avec des appels répétés
 */

let redisClient = null;

// Essaie de connecter Redis si REDIS_URL est définie
async function initRedis() {
  if (!process.env.REDIS_URL) return;
  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', err => console.warn('⚠️ Redis erreur:', err.message));
    await redisClient.connect();
    console.log('✅ Redis connecté');
  } catch {
    console.warn('⚠️ Redis non disponible, utilisation du cache mémoire');
    redisClient = null;
  }
}

// Fallback: Map en mémoire avec TTL manuel
const memCache = new Map();

async function get(key) {
  if (redisClient?.isReady) {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  }
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memCache.delete(key); return null; }
  return entry.value;
}

async function set(key, value, ttlSeconds = 3600) {
  if (redisClient?.isReady) {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return;
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function del(key) {
  if (redisClient?.isReady) { await redisClient.del(key); return; }
  memCache.delete(key);
}

async function flush() {
  if (redisClient?.isReady) { await redisClient.flushDb(); return; }
  memCache.clear();
}

/**
 * Wrapper pratique: renvoie le cache si disponible, sinon exécute fn() et met en cache
 */
async function getOrSet(key, fn, ttlSeconds = 3600) {
  const cached = await get(key);
  if (cached !== null) {
    console.log(`📦 Cache HIT: ${key}`);
    return cached;
  }
  console.log(`🔄 Cache MISS: ${key} – appel API...`);
  const result = await fn();
  await set(key, result, ttlSeconds);
  return result;
}

// Nettoyage du cache mémoire toutes les heures
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memCache.entries()) {
    if (now > entry.expiresAt) memCache.delete(key);
  }
}, 3600 * 1000);

module.exports = { initRedis, get, set, del, flush, getOrSet };
