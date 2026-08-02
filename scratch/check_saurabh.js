import mysql from '../src/utils/mysql.js';

async function checkSaurabh() {
  try {
    const u = await mysql.query("SELECT id, uuid, name, username, role FROM users WHERE name LIKE '%Saurabh%' OR username = 'projectmanager'");
    const s = await mysql.query("SELECT id, uuid, name, role FROM staff WHERE name LIKE '%Saurabh%'");
    const pm = await mysql.query("SELECT id, uuid, name, username FROM project_managers WHERE name LIKE '%Saurabh%' OR username = 'projectmanager'");
    console.log('Users:', u);
    console.log('Staff:', s);
    console.log('Project Managers:', pm);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSaurabh();
