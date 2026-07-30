import { exec, query } from '../src/utils/mysql.js';

async function testMariaWorkflow() {
  console.log('=== 🧪 TESTING MARIA NEW PM CREATION & DATA PERSISTENCE ===');

  try {
    const mariaUuid = 'u_pm_maria_' + Date.now();
    const mariaUsername = 'maria_' + Math.floor(Math.random() * 1000);

    // 1. Create PM Maria in MySQL
    await exec(
      "INSERT INTO project_managers (uuid, name, username, email, phone, discipline, password_hash, role) VALUES (?, 'Maria', ?, 'maria@dgec.com', '1234567890', 'MEP', '$2b$10$xyz', 'project_manager')",
      [mariaUuid, mariaUsername]
    );
    await exec(
      "INSERT INTO users (uuid, name, username, email, phone, role, discipline, user_type, password_hash) VALUES (?, 'Maria', ?, 'maria@dgec.com', '1234567890', 'project_manager', 'MEP', 'staff', '$2b$10$xyz')",
      [mariaUuid, mariaUsername]
    );
    console.log(`✅ Created PM Maria in MySQL with UUID: ${mariaUuid}`);

    // 2. Create client for Maria
    const clientUuid = 'c_maria_' + Date.now();
    await exec(
      "INSERT INTO clients (uuid, name, sector, contact_name, email, phone, role, pm_id, pm_name) VALUES (?, 'Maria Client 1', 'Engineering', 'Maria Client Contact', 'client@maria.com', '9876543210', 'Client', ?, 'Maria')",
      [clientUuid, mariaUuid]
    );
    console.log(`✅ Created client 'Maria Client 1' for Maria`);

    // 3. Create project for Maria
    const projUuid = 'p_maria_' + Date.now();
    const clientRow = await query('SELECT id FROM clients WHERE uuid = ?', [clientUuid]);
    const clientIntId = clientRow[0].id;

    await exec(
      "INSERT INTO projects (uuid, name, client_id, category, status, start_date, end_date, progress, total_cost, description, pm_id, project_manager) VALUES (?, 'Maria Project 1', ?, 'Full Engineering', 'Active', '2026-06-08', '2026-12-31', 0, 75000, 'Maria Project Description', ?, 'Maria')",
      [projUuid, clientIntId, mariaUuid]
    );
    console.log(`✅ Created project 'Maria Project 1' for Maria`);

    // 4. Test activeDb filtering logic for Maria
    const loggedInUser = {
      id: mariaUuid,
      uuid: mariaUuid,
      name: 'Maria',
      username: mariaUsername,
      role: 'project_manager'
    };

    const allProjects = await query('SELECT * FROM projects');
    const allClients = await query('SELECT * FROM clients');

    const pmIdVal = String(loggedInUser.id || '').toLowerCase();
    const pmUuidVal = String(loggedInUser.uuid || '').toLowerCase();
    const pmNameVal = String(loggedInUser.name || '').trim().toLowerCase();

    const mariaProjects = allProjects.filter(p => {
      const pPmId = String(p.pm_id || p.projectManagerId || p.pmId || '').toLowerCase();
      const pPmName = String(p.project_manager || p.pm_name || '').trim().toLowerCase();
      if (pPmId && (pPmId === pmIdVal || pPmId === pmUuidVal)) return true;
      if (pmNameVal && pPmName && (pPmName === pmNameVal || pmNameVal.includes(pPmName) || pPmName.includes(pmNameVal))) return true;
      return false;
    });

    const mariaClients = allClients.filter(c => {
      const cPmId = String(c.pm_id || c.pmId || '').toLowerCase();
      const cPmName = String(c.pm_name || c.pmName || c.project_manager || '').trim().toLowerCase();
      if (cPmId && (cPmId === pmIdVal || cPmId === pmUuidVal)) return true;
      if (pmNameVal && cPmName && (cPmName === pmNameVal || pmNameVal.includes(cPmName) || cPmName.includes(pmNameVal))) return true;
      return false;
    });

    console.log(`\n📊 ACTIVE DB FILTER RESULTS FOR MARIA:`);
    console.log(`   - Maria Projects (${mariaProjects.length}):`, mariaProjects.map(p => p.name).join(', '));
    console.log(`   - Maria Clients (${mariaClients.length}):`, mariaClients.map(c => c.name).join(', '));

    if (mariaProjects.length === 1 && mariaClients.length === 1) {
      console.log('\n🎉 SUCCESS: Maria\'s created project and client filter 100% PERFECTLY!');
    } else {
      console.error('\n❌ FAILURE: Maria data filtering failed!');
    }

    // Cleanup test dummy records
    await exec('DELETE FROM projects WHERE uuid = ?', [projUuid]);
    await exec('DELETE FROM clients WHERE uuid = ?', [clientUuid]);
    await exec('DELETE FROM users WHERE uuid = ?', [mariaUuid]);
    await exec('DELETE FROM project_managers WHERE uuid = ?', [mariaUuid]);
    console.log('✅ Cleaned up Maria test records from database.');

  } catch (err) {
    console.error('Maria Test Error:', err);
  }
}

testMariaWorkflow();
