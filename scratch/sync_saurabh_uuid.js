import mysql from '../src/utils/mysql.js';

async function syncSaurabhUuid() {
  try {
    const targetUuid = 'u_vrat7l8';

    // 1. Update users
    await mysql.query(`
      UPDATE users 
      SET uuid = ?, role = 'project_manager', user_type = 'project_manager' 
      WHERE name LIKE '%Saurabh%' OR username = 'projectmanager'
    `, [targetUuid]);

    // 2. Update staff
    await mysql.query(`
      UPDATE staff 
      SET uuid = ?, role = 'Project Manager' 
      WHERE name LIKE '%Saurabh%'
    `, [targetUuid]);

    // 3. Update project_managers
    await mysql.query(`
      UPDATE project_managers 
      SET uuid = ? 
      WHERE name LIKE '%Saurabh%' OR username = 'projectmanager'
    `, [targetUuid]);

    // 4. Update projects
    await mysql.query(`
      UPDATE projects 
      SET pm_id = ?, project_manager = 'Saurabh M.' 
      WHERE LOWER(project_manager) LIKE '%saurabh%' OR pm_id = 'u_vrat7l8' OR pm_id = 'pm_saurabh' OR pm_id = '4'
    `, [targetUuid]);

    console.log('✅ Synchronized Saurabh M. UUID (u_vrat7l8) across users, staff, project_managers, and projects!');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing Saurabh UUID:', err);
    process.exit(1);
  }
}

syncSaurabhUuid();
