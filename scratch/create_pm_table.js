import { exec, query } from '../src/utils/mysql.js';

async function setupPMTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS project_managers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        discipline VARCHAR(100) DEFAULT 'MEP',
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(100) DEFAULT 'project_manager',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
    await exec(sql);
    console.log('✅ project_managers table created/verified successfully in MySQL!');

    const cols = await query('DESCRIBE project_managers');
    console.log('project_managers columns:', cols);
  } catch (e) {
    console.error('Error setting up project_managers table:', e);
  }
}

setupPMTable();
