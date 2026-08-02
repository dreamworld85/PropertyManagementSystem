const mysql = require('./src/utils/mysql.js');
(async () => {
  try {
    const projects = await mysql.query('SELECT * FROM projects');
    const clients = await mysql.query('SELECT * FROM clients').catch(() => []);
    const users = await mysql.query('SELECT * FROM users');
    console.log('Projects in DB:', projects.map(p => ({ id: p.id, name: p.name, client_id: p.client_id, client_name: p.client_name })));
    console.log('Clients in DB:', clients);
    console.log('Users with Client role:', users.filter(u => String(u.role).includes('client') || String(u.user_type).includes('client')));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
