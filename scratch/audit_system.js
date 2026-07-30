import { query } from '../src/utils/mysql.js';

async function auditDatabase() {
  console.log('=== 🔍 STARTING COMPREHENSIVE MYSQL DATABASE & SCHEMAS AUDIT ===\n');

  try {
    // 1. Audit Table Counts & Schemas
    const tables = ['projects', 'clients', 'users', 'project_managers', 'staff', 'tasks', 'invoices', 'project_documents', 'history', 'admin'];
    for (const t of tables) {
      const count = await query(`SELECT COUNT(*) as cnt FROM ${t}`).catch(() => [{ cnt: 'ERROR' }]);
      console.log(`📊 Table [${t}]: ${count[0].cnt} records`);
    }
    console.log('\n--- 1. Project Managers Audit ---');
    const pms = await query('SELECT id, uuid, name, username, role FROM project_managers');
    console.log('Project Managers registered in `project_managers` table:', pms);

    console.log('\n--- 2. Un-tagged Projects Audit (Missing pm_id) ---');
    const untaggedProjs = await query('SELECT id, uuid, name, pm_id FROM projects WHERE pm_id IS NULL OR pm_id = ""');
    console.log(`Projects with NULL/empty pm_id (${untaggedProjs.length}):`, untaggedProjs);

    console.log('\n--- 3. Un-tagged Clients Audit (Missing pm_id) ---');
    const untaggedClients = await query('SELECT id, uuid, name, pm_id FROM clients WHERE pm_id IS NULL OR pm_id = ""');
    console.log(`Clients with NULL/empty pm_id (${untaggedClients.length}):`, untaggedClients);

    console.log('\n--- 4. Un-tagged Invoices Audit (Missing pm_id) ---');
    const untaggedInvoices = await query('SELECT id, uuid, invoice_no, project_id, pm_id FROM invoices WHERE pm_id IS NULL OR pm_id = ""');
    console.log(`Invoices with NULL/empty pm_id (${untaggedInvoices.length}):`, untaggedInvoices);

    console.log('\n--- 5. Tasks Orphaned Audit (Missing project link) ---');
    const orphanedTasks = await query('SELECT t.id, t.uuid, t.title, t.project_id FROM tasks t LEFT JOIN projects p ON t.project_id = p.uuid OR t.project_id = CAST(p.id AS CHAR) WHERE p.id IS NULL');
    console.log(`Tasks without matching project (${orphanedTasks.length}):`, orphanedTasks.slice(0, 5));

    console.log('\n--- 6. Users Role Distribution Audit ---');
    const roles = await query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    console.log('User roles in `users` table:', roles);

    console.log('\n=== ✅ COMPLETED MYSQL DATABASE & SCHEMAS AUDIT ===');
  } catch (err) {
    console.error('Audit Error:', err);
  }
}

auditDatabase();
