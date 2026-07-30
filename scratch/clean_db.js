import { exec, query } from '../src/utils/mysql.js';

async function cleanAndTagDB() {
  console.log('=== 🧹 STARTING MYSQL DATABASE CLEANUP & AUTO-TAGGING ===');

  try {
    // 1. Tag all un-tagged demo projects with Saurabh M.'s UUID ('u_vrat7l8')
    await exec("UPDATE projects SET pm_id = 'u_vrat7l8' WHERE pm_id IS NULL OR pm_id = ''");
    console.log('✅ Tagged all un-tagged demo projects with Saurabh M. (u_vrat7l8)');

    // 2. Tag all un-tagged demo clients with Saurabh M.'s UUID ('u_vrat7l8')
    await exec("UPDATE clients SET pm_id = 'u_vrat7l8' WHERE pm_id IS NULL OR pm_id = ''");
    console.log('✅ Tagged all un-tagged demo clients with Saurabh M. (u_vrat7l8)');

    // 3. Update invoices pm_id from parent project pm_id
    await exec(`
      UPDATE invoices i
      JOIN projects p ON (i.project_id = p.uuid OR CAST(i.project_id AS CHAR) = CAST(p.id AS CHAR))
      SET i.pm_id = p.pm_id
      WHERE i.pm_id IS NULL OR i.pm_id = ''
    `);
    console.log('✅ Updated invoice pm_ids from parent projects');

    // 4. Remove duplicate clients keeping the lowest ID for each name + pm_id
    await exec(`
      DELETE c1 FROM clients c1
      INNER JOIN clients c2 
      ON LOWER(TRIM(c1.name)) = LOWER(TRIM(c2.name)) AND c1.id > c2.id AND COALESCE(c1.pm_id, '') = COALESCE(c2.pm_id, '')
    `);
    console.log('✅ Deduplicated MySQL clients table');

    const projCount = await query('SELECT COUNT(*) as cnt FROM projects');
    const clientCount = await query('SELECT COUNT(*) as cnt FROM clients');
    const invCount = await query('SELECT COUNT(*) as cnt FROM invoices');
    console.log(`📊 Post-cleanup counts: Projects: ${projCount[0].cnt}, Clients: ${clientCount[0].cnt}, Invoices: ${invCount[0].cnt}`);

  } catch (err) {
    console.error('Cleanup Error:', err);
  }
}

cleanAndTagDB();
