import { exec, query } from '../src/utils/mysql.js';

async function dedupeClients() {
  console.log('=== 🧹 DEDUPLICATING CLIENTS IN MYSQL SAFELY ===');

  try {
    await exec('SET FOREIGN_KEY_CHECKS = 0');
    await exec(`
      DELETE c1 FROM clients c1
      INNER JOIN clients c2 
      ON LOWER(TRIM(c1.name)) = LOWER(TRIM(c2.name)) AND c1.id > c2.id AND COALESCE(c1.pm_id, '') = COALESCE(c2.pm_id, '')
    `);
    await exec('SET FOREIGN_KEY_CHECKS = 1');

    const saurabhUuid = 'u_vrat7l8';
    const tharunUuid = 'u_pm_k1eh5e4';

    const sClients = await query("SELECT id, uuid, name, pm_id FROM clients WHERE pm_id = ?", [saurabhUuid]);
    console.log('\n--- SAURABH M. CLEAN UNIQUE CLIENTS (', sClients.length, ') ---');
    console.log(sClients.map(c => c.name).join(', '));

    const tClients = await query("SELECT id, uuid, name, pm_id FROM clients WHERE pm_id = ?", [tharunUuid]);
    console.log('\n--- THARUN CLEAN UNIQUE CLIENTS (', tClients.length, ') ---');
    console.log(tClients.map(c => c.name).join(', '));

  } catch (err) {
    console.error('Deduplication Error:', err);
  }
}

dedupeClients();
