import mysql from '../src/utils/mysql.js';

async function setupProjectManagersTable() {
  try {
    await mysql.query(`
      CREATE TABLE IF NOT EXISTS project_managers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) NULL,
        phone VARCHAR(50) NULL,
        password_hash VARCHAR(255) NULL,
        department VARCHAR(100) DEFAULT 'Engineering Management',
        status VARCHAR(50) DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ project_managers table created successfully in dgec_db!');

    // Check count
    const countRes = await mysql.query('SELECT COUNT(*) as cnt FROM project_managers');
    const cnt = (countRes && countRes[0]) ? countRes[0].cnt : 0;

    if (cnt === 0) {
      await mysql.query(`
        INSERT INTO project_managers (uuid, name, username, email, phone, password_hash, department)
        VALUES 
        ('pm_saurabh', 'Saurabh M.', 'projectmanager', 'pm@dgec.com', '+968 9123 4567', '$2b$10$GhtJJNxiykzs6FjHmv.q5eU8jb/rAfeD9zBIeOWLdizMyA.sLCivG', 'Engineering Management'),
        ('pm_tharun', 'Tharun', 'tharun_pm', 'tharun@dgec.com', '+968 9456 7890', '$2b$10$GhtJJNxiykzs6FjHmv.q5eU8jb/rAfeD9zBIeOWLdizMyA.sLCivG', 'Structural Management')
      `);
      console.log('✅ Seeded project_managers table!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error setting up project_managers table:', err);
    process.exit(1);
  }
}

setupProjectManagersTable();
