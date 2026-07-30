import { exec, query } from '../src/utils/mysql.js';

async function fixPmSeparation() {
  console.log('=== 🎯 ASSIGNING CLIENTS & PROJECTS TO RESPECIVE PMs ===');

  try {
    const tharunUuid = 'u_pm_k1eh5e4';
    const saurabhUuid = 'u_vrat7l8';

    // 1. Saurabh M.'s Clients (Google, Microsoft, Reliance, Adidas, Medicare, uuuuuuuuuuu, MI, Mitra, HP-one, windows, milkymist, Maryland)
    const saurabhClientNames = [
      'google', 'microsoft', 'relaince', 'reliance', 'adidas', 'medicare',
      'uuuuuuuuuuu', 'mi', 'mitra', 'hp-one', 'windows', 'milkymist', 'maryland', 'green tea'
    ];

    for (const cName of saurabhClientNames) {
      await exec("UPDATE clients SET pm_id = ? WHERE LOWER(TRIM(name)) = ?", [saurabhUuid, cName]);
    }
    console.log('✅ Updated Saurabh M. clients in MySQL database');

    // 2. Tharun's Clients (Nike, Puma, HP, Maryland-construction, Jio, Green-building)
    const tharunClientNames = [
      'nike', 'puma', 'hp', 'maryland-construction', 'jio-building', 'green-building'
    ];

    for (const cName of tharunClientNames) {
      await exec("UPDATE clients SET pm_id = ? WHERE LOWER(TRIM(name)) = ?", [tharunUuid, cName]);
    }
    console.log('✅ Updated Tharun clients in MySQL database');

    // 3. Saurabh M.'s Projects
    const saurabhProjectNames = [
      'g-recovery', 'micro-design', 'bb-building-contract', 'adidas', 'puma-building', 'dev', 'milkymist'
    ];

    for (const pName of saurabhProjectNames) {
      await exec("UPDATE projects SET pm_id = ? WHERE LOWER(TRIM(name)) = ?", [saurabhUuid, pName]);
    }
    console.log('✅ Updated Saurabh M. projects in MySQL database');

    // 4. Tharun's Projects
    const tharunProjectNames = [
      'hp', 'hospital', 'maryland-construction', 'jio-building', 'green-building'
    ];

    for (const pName of tharunProjectNames) {
      await exec("UPDATE projects SET pm_id = ? WHERE LOWER(TRIM(name)) = ?", [tharunUuid, pName]);
    }
    console.log('✅ Updated Tharun projects in MySQL database');

    // Verification
    const sClients = await query("SELECT id, uuid, name, pm_id FROM clients WHERE pm_id = ?", [saurabhUuid]);
    console.log('\n--- SAURABH M. CLIENTS (', sClients.length, ') ---');
    console.log(sClients.map(c => c.name).join(', '));

    const tClients = await query("SELECT id, uuid, name, pm_id FROM clients WHERE pm_id = ?", [tharunUuid]);
    console.log('\n--- THARUN CLIENTS (', tClients.length, ') ---');
    console.log(tClients.map(c => c.name).join(', '));

    const sProjs = await query("SELECT id, uuid, name, pm_id FROM projects WHERE pm_id = ?", [saurabhUuid]);
    console.log('\n--- SAURABH M. PROJECTS (', sProjs.length, ') ---');
    console.log(sProjs.map(p => p.name).join(', '));

    const tProjs = await query("SELECT id, uuid, name, pm_id FROM projects WHERE pm_id = ?", [tharunUuid]);
    console.log('\n--- THARUN PROJECTS (', tProjs.length, ') ---');
    console.log(tProjs.map(p => p.name).join(', '));

  } catch (err) {
    console.error('Error during PM separation:', err);
  }
}

fixPmSeparation();
