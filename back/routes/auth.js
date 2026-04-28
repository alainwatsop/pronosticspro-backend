const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pronosticspro_secret_2025';

function signUser(user) {
  return jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Mot de passe minimum 8 caracteres' });
    }

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email deja utilise' });

    const user = await User.create({
      firstName,
      lastName,
      email: String(email).toLowerCase(),
      password,
      role: 'user',
    });

    const token = signUser(user);
    return res.status(201).json({
      token,
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

    user.lastLogin = new Date();
    await user.save();

    const token = signUser(user);
    return res.json({
      token,
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, vip: user.vip },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  return res.json({ user: req.user });
});

router.post('/bootstrap-admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });
    const user = await User.findOneAndUpdate(
      { email: String(email).toLowerCase() },
      { role: 'admin' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    return res.json({ message: 'Role admin applique', user });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
