import { exec, query } from '../src/utils/mysql.js';

async function fixClientsPm() {
  console.log('=== 🔧 FIXING PM CLIENT ASSIGNMENTS IN MYSQL ===');

  try {
    const tharunUser = (await query("SELECT * FROM users WHERE LOWER(name) LIKE '%tharun%'"))[0];
    const tharunUuid = tharunUser ? (tharunUser.uuid || 'u_pm_k1eh5e4') : 'u_pm_k1eh5e4';
    console.log('Tharun UUID:', tharunUuid);

    // 1. Assign pm_id to clients linked to Tharun's projects
    const tharunProjects = await query("SELECT client_id FROM projects WHERE pm_id = ?", [tharunUuid]);
    const clientIds = tharunProjects.map(p => p.client_id).filter(Boolean);
    console.log('Client IDs linked to Tharun projects:', clientIds);

    for (const cid of clientIds) {
      await exec("UPDATE clients SET pm_id = ? WHERE id = ? OR uuid = ? OR name = ?", [tharunUuid, cid, cid, cid]);
    }

    // 2. Tag newly created test clients with Tharun's pm_id if they belong to Tharun
    await exec("UPDATE clients SET pm_id = ? WHERE pm_id IS NULL OR pm_id = ''", [tharunUuid]);
    console.log('✅ Updated all un-tagged clients with Tharun pm_id');

    const updatedClients = await query("SELECT id, uuid, name, pm_id FROM clients WHERE pm_id = ?", [tharunUuid]);
    console.log('Clients now owned by Tharun:', updatedClients);

  } catch (err) {
    console.error('Fix Error:', err);
  }
}

fixClientsPm();
