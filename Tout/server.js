// server.js — PronosticsPro Backend (version finale)
require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const cron     = require('node-cron');

const authRoutes      = require('./routes/auth');
const matchRoutes     = require('./routes/matches');
const pronoRoutes     = require('./routes/pronostics');
const userRoutes      = require('./routes/users');
const adminRoutes     = require('./routes/admin');
const bookmakerRoutes = require('./routes/bookmakers');
const paymentRoutes   = require('./routes/payments');
const aiRoutes        = require('./routes/ai');

const { runDailyUpdate, verifyResults, weeklyMaintenance } = require('./cron/dailyCron');
const { initRedis } = require('./services/cacheService');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pronosticspro')
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ MongoDB:', err.message));

initRedis().catch(() => {});

app.get('/',       (req, res) => res.json({ name: 'PronosticsPro API', version: '1.0.0', status: 'OK' }));
app.get('/health', (req, res) => res.json({ status: 'OK', uptime: process.uptime(), memory: process.memoryUsage() }));
app.use('/api/auth',       authRoutes);
app.use('/api/matches',    matchRoutes);
app.use('/api/pronostics', pronoRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/bookmakers', bookmakerRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/ai',         aiRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route non trouvée' }));
app.use((err, req, res, next) => {
  console.error('❌', err.stack);
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Erreur interne' : err.message });
});

const TZ = 'Africa/Douala';
cron.schedule('0 6 * * *',   () => runDailyUpdate().catch(console.error),    { timezone: TZ });
cron.schedule('30 23 * * *', () => verifyResults().catch(console.error),     { timezone: TZ });
cron.schedule('0 3 * * 1',   () => weeklyMaintenance().catch(console.error), { timezone: TZ });

app.listen(PORT, () => {
  console.log(`\n🚀 PronosticsPro API – port ${PORT} | env: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
