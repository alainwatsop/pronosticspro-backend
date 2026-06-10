const express = require('express');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  return res.json(req.user);
});

router.put('/me', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, notifications } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, notifications },
      { new: true }
    ).select('-password');
    return res.json(user);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
