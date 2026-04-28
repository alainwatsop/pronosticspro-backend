// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pronosticspro_secret_2025';

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Champs requis manquants' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });
    const user = await User.create({ firstName, lastName, email: email.toLowerCase(), password, promoCode: 'TAB6677' });
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' });
    user.lastLogin = new Date(); await user.save();
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, email: user.email, firstName: user.firstName, role: user.role, vip: user.vip } });
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
