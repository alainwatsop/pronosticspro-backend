// models/Match.js
const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  externalId: { type: String, required: true, unique: true },
  sport: { type: String, enum: ['football', 'basketball', 'tennis', 'hockey', 'baseball'], required: true },
  league: { type: String, required: true },
  leagueLogo: String,
  date: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'live', 'finished', 'postponed'], default: 'scheduled' },
  home: {
    name: String, logo: String, score: Number,
    stats: { goals: Number, shots: Number, possession: Number, xg: Number }
  },
  away: {
    name: String, logo: String, score: Number,
    stats: { goals: Number, shots: Number, possession: Number, xg: Number }
  },
  venue: String,
  odds: {
    h2h: { home: Number, draw: Number, away: Number },
    over25: Number,
    under25: Number,
    btts: { yes: Number, no: Number },
  },
  headToHead: [{
    date: Date,
    homeScore: Number,
    awayScore: Number,
    winner: { type: String, enum: ['home', 'away', 'draw'] }
  }],
  pronostic: { type: mongoose.Schema.Types.ObjectId, ref: 'Pronostic' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// models/Pronostic.js
const PronosticSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  tip: { type: String, required: true },
  type: { type: String, required: true }, // '1', '2', 'X', 'BTTS', 'O/U', 'Combo', ...
  cote: { type: Number, required: true },
  confiance: { type: Number, min: 0, max: 100, required: true },
  raison: String,
  analysis: String,
  isVipOnly: { type: Boolean, default: false },
  result: { type: String, enum: ['pending', 'win', 'loss', 'push', 'void'], default: 'pending' },
  aiModel: { type: String, default: 'gpt-4o' },
  generatedAt: { type: Date, default: Date.now },
});

// models/User.js
const bcrypt = require('bcryptjs');
const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8 },
  role: { type: String, enum: ['user', 'vip', 'admin'], default: 'user' },
  promoCode: { type: String, default: 'TAB6677' },
  vip: {
    active: { type: Boolean, default: false },
    plan: { type: String, enum: ['starter', 'expert', 'pro'] },
    startDate: Date,
    endDate: Date,
  },
  notifications: {
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    telegram: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function(pwd) {
  return bcrypt.compare(pwd, this.password);
};

// models/Subscription.js
const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['starter', 'expert', 'pro'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'FCFA' },
  paymentMethod: { type: String, enum: ['mtn', 'orange', 'card', 'crypto'] },
  status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled'], default: 'pending' },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = {
  Match: mongoose.model('Match', MatchSchema),
  Pronostic: mongoose.model('Pronostic', PronosticSchema),
  User: mongoose.model('User', UserSchema),
  Subscription: mongoose.model('Subscription', SubscriptionSchema),
};
