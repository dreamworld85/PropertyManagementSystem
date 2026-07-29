import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function initDB() {
  try {
    console.log('Connecting to MySQL root...');
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3307,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('Creating database dgec_db if not exists...');
    await conn.query('CREATE DATABASE IF NOT EXISTS dgec_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    await conn.query('USE dgec_db;');

    // Read and run dgec_schema.sql
    const schemaPath = path.join(process.cwd(), 'dgec_db.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      console.log('✅ Schema imported successfully.');
    }

    // Create admin table if not exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const pwdHash = bcrypt.hashSync('Welcome_2026@', 10);
    const uid = (prefix) => prefix + '_' + Math.random().toString(36).slice(2, 9);

    const accounts = [
      { username: 'admin', name: 'Administrator', email: 'admin@dgec.com', role: 'admin', user_type: 'admin' },
      { username: 'client', name: 'Client User', email: 'client@dgec.com', role: 'client', user_type: 'client' },
      { username: 'staff', name: 'Staff Engineer', email: 'staff@dgec.com', role: 'staff', user_type: 'staff' },
      { username: 'projectmanager', name: 'Project Manager', email: 'pm@dgec.com', role: 'project_manager', user_type: 'project_manager' }
    ];

    for (const acc of accounts) {
      const [rows] = await conn.query('SELECT * FROM users WHERE username = ?', [acc.username]);
      if (rows.length === 0) {
        await conn.query(
          `INSERT INTO users (uuid, name, username, email, password_hash, role, user_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [uid('u'), acc.name, acc.username, acc.email, pwdHash, acc.role, acc.user_type]
        );
      } else {
        await conn.query(
          `UPDATE users SET password_hash = ?, role = ?, user_type = ? WHERE username = ?`,
          [pwdHash, acc.role, acc.user_type, acc.username]
        );
      }

      if (acc.username === 'admin') {
        const [adminRows] = await conn.query('SELECT * FROM admin WHERE username = ?', ['admin']);
        if (adminRows.length === 0) {
          await conn.query(
            `INSERT INTO admin (uuid, name, username, email, password, role) VALUES (?, ?, ?, ?, ?, ?)`,
            [uid('u'), 'Administrator', 'admin', 'admin@dgec.com', pwdHash, 'admin']
          );
        } else {
          await conn.query(`UPDATE admin SET password = ? WHERE username = ?`, [pwdHash, 'admin']);
        }
      }
    }

    console.log('🎉 ALL ACCOUNTS & TABLES CREATED AND SEEDED SUCCESSFULLY!');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    process.exit(1);
  }
}

initDB();
