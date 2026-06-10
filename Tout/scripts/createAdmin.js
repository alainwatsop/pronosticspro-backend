require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models');

async function run() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').toLowerCase();
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || '';
  const firstName = process.argv[4] || 'Super';
  const lastName = process.argv[5] || 'Admin';

  if (!email || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <password> [firstName] [lastName]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pronosticspro');

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    console.log(`Admin role applied to existing user: ${email}`);
  } else {
    await User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'admin',
      vip: { active: true, plan: 'pro', startDate: new Date() },
    });
    console.log(`Admin user created: ${email}`);
  }

  await mongoose.disconnect();
}

run().catch(async err => {
  console.error(err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
