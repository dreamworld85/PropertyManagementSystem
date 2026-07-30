import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('--- DATABASE DIAGNOSTIC START ---');
  
  // Use env variables or fall back to standard local host configurations
  const host = process.env.DB_HOST !== undefined ? process.env.DB_HOST : 'localhost';
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306;
  const user = process.env.DB_USER !== undefined ? process.env.DB_USER : 'u859202671_pmf_circle_us';
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'Welcome_2026@';
  const database = process.env.DB_NAME !== undefined ? process.env.DB_NAME : 'u859202671_pmf_circle_its';

  console.log(`Diagnostic: Connecting to ${database} at ${host}:${port} as ${user}...`);

  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 5000
    });
    console.log('✅ DIAGNOSTIC: CONNECTION SUCCESS!');
    await conn.end();
  } catch (err) {
    console.error('❌ DIAGNOSTIC: CONNECTION FAILED!', err.message);
  }
  console.log('--- DATABASE DIAGNOSTIC END ---');
}

testConnection();
