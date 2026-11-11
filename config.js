require('dotenv').config({ quiet: true });

const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];
const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(
    `Missing required environment variable(s): ${missing.join(', ')}. ` +
    'Copy .env.example to .env and fill in the values.'
  );
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn('Warning: JWT_SECRET is shorter than 32 characters. Use a long random value outside local development.');
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
};
