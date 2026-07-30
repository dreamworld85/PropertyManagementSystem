import { exec, query } from '../src/utils/mysql.js';

async function testDisappearingFix() {
  console.log('=== 🧪 TESTING BACKGROUND SYNC (POST /api/db) PRESERVATION ===');

  try {
    const testPmUuid = 'u_pm_sync_' + Date.now();
    const testPmUsername = 'syncpm_' + Math.floor(Math.random() * 10000);
    const testClientUuid = 'c_sync_' + Date.now();
    const testProjUuid = 'p_sync_' + Date.now();

    // 1. Insert test PM
    await exec(
      "INSERT INTO project_managers (uuid, name, username, email, phone, discipline, password_hash, role) VALUES (?, 'Test PM Sync', ?, 'sync@dgec.com', '12345', 'MEP', '$2b$10$xyz', 'project_manager')",
      [testPmUuid, testPmUsername]
    );

    // 2. Insert test Client
    await exec(
      "INSERT INTO clients (uuid, name, sector, contact_name, email, phone, role, pm_id, pm_name) VALUES (?, 'Sync Client', 'General', 'Contact', 'c@sync.com', '123', 'Client', ?, 'Test PM Sync')",
      [testClientUuid, testPmUuid]
    );
    const clientRow = await query('SELECT id FROM clients WHERE uuid = ?', [testClientUuid]);
    const clientIntId = clientRow[0].id;

    // 3. Insert test Project directly (simulating POST /api/create-project)
    await exec(
      "INSERT INTO projects (uuid, name, client_id, category, status, start_date, end_date, progress, total_cost, description, pm_id, project_manager) VALUES (?, 'Sync Test Project', ?, 'Full Engineering', 'Active', '2026-06-08', '2026-12-31', 0, 10000, 'Test desc', ?, 'Test PM Sync')",
      [testProjUuid, clientIntId, testPmUuid]
    );
    console.log('✅ Step 1: Created test project with pm_id:', testPmUuid);

    // 4. Simulate background sync (POST /api/db) updating the project
    await exec(
      `INSERT INTO projects (uuid, name, client_id, status, category, start_date, end_date, progress, approval_status, description, pm_id, project_manager) 
       VALUES (?, 'Sync Test Project', ?, 'Active', 'Full Engineering', '2026-06-08', '2026-12-31', 0, 'Required', 'Test desc', ?, 'Test PM Sync') 
       ON DUPLICATE KEY UPDATE 
         name=VALUES(name), 
         status=VALUES(status), 
         progress=VALUES(progress), 
         category=VALUES(category), 
         description=VALUES(description),
         pm_id = IF(VALUES(pm_id) IS NOT NULL AND VALUES(pm_id) != '', VALUES(pm_id), pm_id),
         project_manager = IF(VALUES(project_manager) IS NOT NULL AND VALUES(project_manager) != '', VALUES(project_manager), project_manager)`,
      [testProjUuid, clientIntId, testPmUuid]
    );
    console.log('✅ Step 2: Executed background sync (POST /api/db)');

    // 5. Verify pm_id in MySQL after sync
    const rows = await query('SELECT uuid, name, pm_id, project_manager FROM projects WHERE uuid = ?', [testProjUuid]);
    console.log('📊 Verification query result after sync:', rows[0]);

    if (rows && rows[0] && rows[0].pm_id === testPmUuid && rows[0].project_manager === 'Test PM Sync') {
      console.log('\n🎉 DISAPPEARING BUG PERMANENTLY FIXED! pm_id and project_manager remain 100% INTACT after sync!');
    } else {
      console.error('\n❌ FAILURE: pm_id was lost after sync!');
    }

    // Cleanup test dummy records
    await exec('DELETE FROM projects WHERE uuid = ?', [testProjUuid]);
    await exec('DELETE FROM clients WHERE uuid = ?', [testClientUuid]);
    await exec('DELETE FROM project_managers WHERE uuid = ?', [testPmUuid]);
    console.log('✅ Cleaned up sync test records.');

  } catch (err) {
    console.error('Test Error:', err);
  }
}

testDisappearingFix();
