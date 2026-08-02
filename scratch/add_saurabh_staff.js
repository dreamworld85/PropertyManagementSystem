import mysql from '../src/utils/mysql.js';

async function addSaurabhToStaff() {
  try {
    await mysql.query(`
      INSERT INTO staff (uuid, name, contact_number, email, role)
      VALUES ('pm_saurabh', 'Saurabh M.', '+968 9123 4567', 'pm@dgec.com', 'Project Manager')
      ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role);
    `);
    console.log('✅ Saurabh M. inserted into staff table in MySQL!');
    process.exit(0);
  } catch (err) {
    console.error('Error inserting Saurabh M. into staff table:', err);
    process.exit(1);
  }
}

addSaurabhToStaff();
