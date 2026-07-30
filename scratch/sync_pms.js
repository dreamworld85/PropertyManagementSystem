import { exec, query } from '../src/utils/mysql.js';
import bcrypt from 'bcryptjs';

async function syncPMs() {
  try {
    const hash = bcrypt.hashSync('Welcome_2026@', 10);

    // Sync Tharun
    await exec(
      `INSERT INTO project_managers (uuid, name, username, email, phone, discipline, password_hash, role)
       VALUES (?, 'Tharun', 'tharun', 'tharun@dgec.com', '+968 9412 8899', 'MEP', ?, 'project_manager')
       ON DUPLICATE KEY UPDATE name = VALUES(name), role = 'project_manager'`,
      ['u_pm_k1eh5e4', hash]
    );

    // Sync Saurabh M.
    await exec(
      `INSERT INTO project_managers (uuid, name, username, email, phone, discipline, password_hash, role)
       VALUES (?, 'Saurabh M.', 'projectmanager', 'pm@dgec.com', '+968 9412 8899', 'MEP', ?, 'project_manager')
       ON DUPLICATE KEY UPDATE name = VALUES(name), role = 'project_manager'`,
      ['u_vrat7l8', hash]
    );

    console.log('✅ Synchronized project_managers table with existing PMs!');
    const rows = await query('SELECT id, uuid, name, username, role FROM project_managers');
    console.log('project_managers rows:', rows);
  } catch (e) {
    console.error('Error syncing PMs:', e);
  }
}

syncPMs();
