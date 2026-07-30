import { exec, query } from '../src/utils/mysql.js';

async function cleanupTestData() {
  console.log('=== 🧹 CLEANING UP DUMMY TEST CLIENTS & UNTAGGED RECORDS ===');

  try {
    // 1. Delete all duplicate clients where pm_id is NULL
    await exec("DELETE FROM clients WHERE pm_id IS NULL OR pm_id = ''");
    console.log('✅ Deleted un-tagged dummy clients with NULL pm_id');

    // 2. Delete duplicate clients with identical names and pm_id
    await exec(`
      DELETE c1 FROM clients c1
      INNER JOIN clients c2 
      ON LOWER(TRIM(c1.name)) = LOWER(TRIM(c2.name)) AND c1.id > c2.id AND COALESCE(c1.pm_id, '') = COALESCE(c2.pm_id, '')
    `);
    console.log('✅ Deduplicated clients in MySQL database');

    const pms = await query('SELECT id, uuid, name, username FROM project_managers');
    console.log('Active PMs in database:', pms);

    const projs = await query('SELECT id, uuid, name, pm_id FROM projects');
    console.log('Active Projects in database:', projs);

    const clients = await query('SELECT id, uuid, name, pm_id FROM clients');
    console.log('Active Clients in database:', clients);

  } catch (err) {
    console.error('Cleanup Error:', err);
  }
}

cleanupTestData();
