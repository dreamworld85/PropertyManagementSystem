const mysql = require('../src/utils/mysql.js');
(async () => {
  try {
    const users = await mysql.query('SELECT * FROM users');
    const staff = await mysql.query('SELECT * FROM staff').catch(() => []);
    const pms = await mysql.query('SELECT * FROM project_managers').catch(() => []);
    console.log('--- USERS TABLE ---');
    console.log(users.map(u => ({ id: u.id, name: u.name, username: u.username, email: u.email, role: u.role, passHash: u.password_hash })));
    console.log('--- STAFF TABLE ---');
    console.log(staff.map(s => ({ id: s.id, name: s.name, username: s.username, email: s.email, role: s.role, passHash: s.password_hash })));
    console.log('--- PMS TABLE ---');
    console.log(pms.map(p => ({ id: p.id, name: p.name, username: p.username, email: p.email, role: p.role, passHash: p.password_hash })));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
