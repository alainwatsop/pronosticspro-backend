let redisClient = null;
const memCache = new Map();

async function initRedis() {
  if (!process.env.REDIS_URL) return;
  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', err => console.warn('Redis error:', err.message));
    await redisClient.connect();
    console.log('Redis connected');
  } catch {
    redisClient = null;
    console.warn('Redis unavailable, fallback to memory cache');
  }
}

async function get(key) {
  if (redisClient?.isReady) {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  }
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
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
  if (redisClient?.isReady) {
    await redisClient.del(key);
    return;
  }
  memCache.delete(key);
}

async function flush() {
  if (redisClient?.isReady) {
    await redisClient.flushDb();
    return;
  }
  memCache.clear();
}

async function getOrSet(key, fn, ttlSeconds = 3600) {
  const cached = await get(key);
  if (cached !== null) return cached;
  const result = await fn();
  await set(key, result, ttlSeconds);
  return result;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memCache.entries()) {
    if (now > entry.expiresAt) memCache.delete(key);
  }
}, 3600 * 1000);

module.exports = { initRedis, get, set, del, flush, getOrSet };
