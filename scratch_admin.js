import bcrypt from 'bcryptjs';
import { query, exec } from './src/utils/mysql.js';
import { uid } from './src/utils/helpers.js';

async function seedAdmin() {
  try {
    console.log('Connecting to MySQL and setting up admin table...');
    
    // 1. Create dedicated admin table
    await exec(`
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
    console.log(' Table "admin" created or verified.');

    const adminUsername = 'admin';
    const rawPassword = 'Welcome_2026@';
    const hash = bcrypt.hashSync(rawPassword, 10);
    const adminUuid = uid('u');
    const adminEmail = 'admin@dgec.com';

    // 2. Insert or update in admin table
    const existingAdmin = await query('SELECT * FROM admin WHERE username = ?', [adminUsername]);
    if (existingAdmin.length === 0) {
      await exec(
        `INSERT INTO admin (uuid, name, username, email, password, role) VALUES (?, ?, ?, ?, ?, ?)`,
        [adminUuid, 'Administrator', adminUsername, adminEmail, hash, 'admin']
      );
      console.log(' Admin user inserted into "admin" table.');
    } else {
      await exec(
        `UPDATE admin SET password = ? WHERE username = ?`,
        [hash, adminUsername]
      );
      console.log(' Admin password updated in "admin" table.');
    }

    // 3. Insert or update in users table as well
    const existingUser = await query('SELECT * FROM users WHERE username = ?', [adminUsername]);
    if (existingUser.length === 0) {
      await exec(
        `INSERT INTO users (uuid, name, username, email, password_hash, role, user_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminUuid, 'Administrator', adminUsername, adminEmail, hash, 'admin', 'admin', 1]
      );
      console.log(' Admin user inserted into "users" table.');
    } else {
      await exec(
        `UPDATE users SET password_hash = ? WHERE username = ?`,
        [hash, adminUsername]
      );
      console.log(' Admin password updated in "users" table.');
    }

    console.log(' SETUP COMPLETE!');
    process.exit(0);
  } catch (err) {
    console.error(' Error creating admin table/user:', err);
    process.exit(1);
  }
}

seedAdmin();
