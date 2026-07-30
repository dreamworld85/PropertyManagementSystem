import dotenv from 'dotenv';

// 1. Load local .env if it exists
dotenv.config();

// 2. If DB_USER is not defined (e.g. running on the Hostinger server before dashboard variables are set),
// set the default production database details directly in memory.
if (!process.env.DB_USER) {
  console.log('⚠️ DB_USER not found in environment, applying in-memory production fallbacks...');
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '3306';
  process.env.DB_USER = 'u859202671_pmf_circle_us';
  process.env.DB_PASSWORD = 'Welcome_2026@';
  process.env.DB_NAME = 'u859202671_pmf_circle_its';
  process.env.PORTAL_URL = 'https://webapp.greensparrows.com';
  process.env.API_PORT = '3000';
  process.env.DISABLE_EMAIL = 'true';
  console.log('✅ In-memory production configuration applied.');
}
