/**
 * Creates the first admin account and a few sample products.
 * Safe to run more than once: existing users and products are left unchanged.
 *
 *   npm run seed
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config');
const User = require('../models/User');
const Product = require('../models/Product');
const { MIN_PASSWORD_LENGTH } = require('../validators/user');

const SAMPLE_PRODUCTS = [
  { code: 'SH-001', name: 'Siamese', category: 'Shorthair', price: 3500, stock: 5,
    summary: 'Vocal, social, and very attached to its people.' },
  { code: 'SH-002', name: 'Korat', category: 'Shorthair', price: 4200, stock: 3,
    summary: 'Silver-blue Thai breed known as a symbol of good luck.' },
  { code: 'SH-003', name: 'Khao Manee', category: 'Shorthair', price: 6800, stock: 2,
    summary: 'All-white Thai breed, often with odd-colored eyes.' },
  { code: 'LH-001', name: 'Persian', category: 'Longhair', price: 5500, stock: 4,
    summary: 'Calm and quiet, with a long coat that needs daily grooming.' },
  { code: 'LH-002', name: 'Maine Coon', category: 'Longhair', price: 7900, stock: 2,
    summary: 'Large, gentle, and playful.' }
];

async function main() {
  const username = (process.env.SEED_ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Set SEED_ADMIN_PASSWORD in .env (at least ${MIN_PASSWORD_LENGTH} characters).`);
  }

  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([User.init(), Product.init()]);

  const existing = await User.findOne({ username });
  if (existing) {
    console.log(`User "${username}" already exists (role: ${existing.role}); left unchanged.`);
  } else {
    await User.create({
      username,
      passwordHash: await bcrypt.hash(password, 12),
      firstName: 'System',
      lastName: 'Admin',
      gender: 'unspecified',
      age: 0,
      role: 'admin'
    });
    console.log(`Admin "${username}" created.`);
  }

  let created = 0;
  for (const product of SAMPLE_PRODUCTS) {
    const result = await Product.updateOne(
      { code: product.code },
      { $setOnInsert: product },
      { upsert: true }
    );
    created += result.upsertedCount;
  }
  console.log(`Sample products: ${created} created, ${SAMPLE_PRODUCTS.length - created} already existed.`);
}

main()
  .catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
