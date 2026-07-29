import bcrypt from 'bcryptjs';
import { query, exec } from './src/utils/mysql.js';
import { uid } from './src/utils/helpers.js';

async function seedThreeUsers() {
  try {
    console.log('Seeding requested user accounts into MySQL (dgec_db)...');
    
    const pwdHash = bcrypt.hashSync('Welcome_2026@', 10);

    const accounts = [
      {
        username: 'client',
        name: 'Client User',
        email: 'client@dgec.com',
        role: 'client',
        user_type: 'client'
      },
      {
        username: 'staff',
        name: 'Staff Engineer',
        email: 'staff@dgec.com',
        role: 'staff',
        user_type: 'staff'
      },
      {
        username: 'projectmanager',
        name: 'Project Manager',
        email: 'pm@dgec.com',
        role: 'project_manager',
        user_type: 'project_manager'
      }
    ];

    for (const acc of accounts) {
      // Check users table
      const existingUser = await query('SELECT * FROM users WHERE username = ?', [acc.username]);
      if (existingUser.length === 0) {
        await exec(
          `INSERT INTO users (uuid, name, username, email, password_hash, role, user_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [uid('u'), acc.name, acc.username, acc.email, pwdHash, acc.role, acc.user_type]
        );
        console.log(`✅ Created user: ${acc.username}`);
      } else {
        await exec(
          `UPDATE users SET password_hash = ?, role = ?, user_type = ? WHERE username = ?`,
          [pwdHash, acc.role, acc.user_type, acc.username]
        );
        console.log(`✅ Updated user: ${acc.username}`);
      }
    }

    console.log('🎉 ALL 3 ACCOUNTS CREATED / UPDATED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding accounts:', err);
    process.exit(1);
  }
}

seedThreeUsers();
