require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const User = require('./models/User.model');

  const existing = await User.findOne({ email: 'admin@skillkwiz.com' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const hash = await bcrypt.hash('Admin@1234', 12);

  await User.create({
    name: 'Super Admin',
    email: 'admin@skillkwiz.com',
    password: hash,
    role: 'admin',
  });

  console.log('✅ Admin created!');
  console.log('Email:    admin@skillkwiz.com');
  console.log('Password: Admin@1234');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });