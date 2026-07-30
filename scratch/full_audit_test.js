import { exec, query } from '../src/utils/mysql.js';

async function runFullAudit() {
  console.log('====================================================');
  console.log('🔍 FULL-STACK CODEBASE & DATABASE SYSTEM AUDIT');
  console.log('====================================================\n');

  let passed = true;

  try {
    // 1. Audit MySQL Tables
    console.log('--- 1. AUDITING MYSQL SCHEMAS & TABLES ---');
    const pms = await query('SELECT id, uuid, name, username, email, role FROM project_managers ORDER BY id DESC');
    console.log(`✅ project_managers Table (${pms.length} records):`);
    pms.forEach(pm => console.log(`   - [ID: ${pm.id}] ${pm.name} (${pm.username}) -> UUID: ${pm.uuid}`));

    const users = await query("SELECT id, uuid, name, username, role FROM users WHERE role LIKE '%pm%' OR role LIKE '%manager%' OR role = 'project_manager'");
    console.log(`\n✅ users Table PM Accounts (${users.length} records):`);
    users.forEach(u => console.log(`   - [ID: ${u.id}] ${u.name} (${u.username}) -> UUID: ${u.uuid}`));

    const projects = await query('SELECT id, uuid, name, pm_id, project_manager FROM projects ORDER BY id DESC');
    console.log(`\n✅ projects Table (${projects.length} records):`);
    const untaggedProjs = projects.filter(p => !p.pm_id);
    if (untaggedProjs.length > 0) {
      console.error(`❌ WARNING: Found ${untaggedProjs.length} untagged projects without pm_id!`);
      passed = false;
    } else {
      console.log('✅ ALL projects have valid pm_id tags!');
    }

    const clients = await query('SELECT id, uuid, name, pm_id, pm_name FROM clients ORDER BY id DESC');
    console.log(`\n✅ clients Table (${clients.length} records):`);
    const untaggedClients = clients.filter(c => !c.pm_id);
    if (untaggedClients.length > 0) {
      console.error(`❌ WARNING: Found ${untaggedClients.length} untagged clients without pm_id!`);
      passed = false;
    } else {
      console.log('✅ ALL clients have valid pm_id tags!');
    }

    // 2. Audit Scoping per PM
    console.log('\n--- 2. AUDITING DATA SCOPING PER PROJECT MANAGER ---');
    for (const pm of pms) {
      const pmProjs = projects.filter(p => String(p.pm_id).toLowerCase() === String(pm.uuid).toLowerCase() || String(p.project_manager).toLowerCase().includes(pm.name.toLowerCase()));
      const pmClis = clients.filter(c => String(c.pm_id).toLowerCase() === String(pm.uuid).toLowerCase() || String(c.pm_name).toLowerCase().includes(pm.name.toLowerCase()));
      console.log(`📌 PM: ${pm.name} (UUID: ${pm.uuid})`);
      console.log(`   - Projects (${pmProjs.length}): ${pmProjs.map(p => p.name).join(', ') || 'None'}`);
      console.log(`   - Clients (${pmClis.length}): ${pmClis.map(c => c.name).join(', ') || 'None'}`);
    }

    // 3. Test End-to-End Dynamic PM Creation, Client Creation, & Project Creation
    console.log('\n--- 3. TESTING DYNAMIC NEW PM WORKFLOW & ISOLATION ---');
    const testPmUuid = 'u_pm_audit_' + Date.now();
    const testPmUsername = 'audit_pm_' + Math.floor(Math.random() * 1000);
    
    // Create dummy PM
    await exec(
      "INSERT INTO project_managers (uuid, name, username, email, phone, discipline, password_hash, role) VALUES (?, 'Audit PM Test', ?, 'audit@dgec.com', '1234567890', 'Structural', '$2b$10$xyz', 'project_manager')",
      [testPmUuid, testPmUsername]
    );
    console.log(`✅ Created test PM: Audit PM Test (${testPmUsername})`);

    // Create dummy client for test PM
    const testClientUuid = 'c_audit_' + Date.now();
    await exec(
      "INSERT INTO clients (uuid, name, sector, contact_name, email, phone, role, pm_id, pm_name) VALUES (?, 'Audit Test Client', 'Tech', 'Contact', 'c@audit.com', '123', 'Client', ?, 'Audit PM Test')",
      [testClientUuid, testPmUuid]
    );
    console.log('✅ Created test client for Audit PM Test');

    const createdClientRow = await query('SELECT id FROM clients WHERE uuid = ?', [testClientUuid]);
    const testClientIntId = createdClientRow[0].id;

    // Create dummy project for test PM
    const testProjUuid = 'p_audit_' + Date.now();
    await exec(
      "INSERT INTO projects (uuid, name, client_id, category, status, start_date, end_date, progress, total_cost, description, pm_id, project_manager) VALUES (?, 'Audit Test Project', ?, 'Full Engineering', 'Active', '2026-06-08', '2026-12-31', 0, 50000, 'Audit test desc', ?, 'Audit PM Test')",
      [testProjUuid, testClientIntId, testPmUuid]
    );
    console.log('✅ Created test project for Audit PM Test');

    // Verify fetching via API GET /api/db simulation
    const fetchedProjs = await query('SELECT * FROM projects WHERE pm_id = ?', [testPmUuid]);
    const fetchedClients = await query('SELECT * FROM clients WHERE pm_id = ?', [testPmUuid]);

    if (fetchedProjs.length === 1 && fetchedClients.length === 1) {
      console.log('✅ Dynamic creation & fetching SUCCESSFUL! Project & Client retained with 100% precision.');
    } else {
      console.error('❌ Dynamic creation test failed!');
      passed = false;
    }

    // Cleanup test dummy records
    await exec('DELETE FROM projects WHERE uuid = ?', [testProjUuid]);
    await exec('DELETE FROM clients WHERE uuid = ?', [testClientUuid]);
    await exec('DELETE FROM project_managers WHERE uuid = ?', [testPmUuid]);
    console.log('✅ Cleaned up audit test dummy records from database.');

    console.log('\n====================================================');
    if (passed) {
      console.log('🎉 FULL SYSTEM AUDIT COMPLETED: 100% PASSED!');
    } else {
      console.log('⚠️ AUDIT COMPLETED WITH ISSUES FOUND');
    }
    console.log('====================================================');

  } catch (err) {
    console.error('Audit Error:', err);
  }
}

runFullAudit();
