import { query, exec } from '../src/utils/mysql.js';

async function main() {
  try {
    await exec('SET FOREIGN_KEY_CHECKS = 0');
    await exec("DELETE FROM clients WHERE name IN ('BEC', 'Malkai Developments', 'OQ EP', 'Sanvira Industries', 'Shell Development Oman')");
    await exec('SET FOREIGN_KEY_CHECKS = 1');

    const remaining = await query('SELECT id, uuid, name, sector, contact_name, email, username FROM clients ORDER BY id ASC');
    console.log('Successfully purged legacy dummy clients!');
    console.log('Real User Clients Count in MySQL:', remaining.length);
    console.log('Remaining Real Clients:', remaining);
  } catch (e) {
    console.error('Purge error:', e);
  }
}

main();
