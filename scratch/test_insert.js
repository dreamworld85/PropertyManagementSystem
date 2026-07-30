import { exec, query } from '../src/utils/mysql.js';

async function testFixInsert() {
  console.log('=== 🧪 TESTING RESOLVED PROJECT INSERTION ===');

  try {
    const rawClientVal = 'c1geemq';
    let clientIntId = null;
    const clientRows = await query('SELECT id FROM clients WHERE uuid = ? OR id = ? OR name = ? ORDER BY id DESC', [rawClientVal, rawClientVal, rawClientVal]);
    if (clientRows && clientRows.length > 0) {
      clientIntId = clientRows[0].id;
    } else {
      const fallbackClient = await query('SELECT id FROM clients ORDER BY id DESC LIMIT 1');
      if (fallbackClient && fallbackClient.length > 0) clientIntId = fallbackClient[0].id;
    }

    console.log('Resolved clientIntId:', clientIntId);

    const testUuid = 'p_test_' + Date.now();
    await exec(
      `INSERT INTO projects (uuid, name, client_id, category, status, start_date, end_date, progress, total_cost, description, pm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [testUuid, 'Test Safe Project', clientIntId, 'Full Engineering', 'Active', '2026-06-08', '2026-12-31', 0, 1000, 'Test desc', 'u_pm_k1eh5e4']
    );

    console.log('✅ SUCCESS! Project inserted into MySQL without foreign key failure!');

    const inserted = await query('SELECT * FROM projects WHERE uuid = ?', [testUuid]);
    console.log('Inserted record:', inserted);

    await exec('DELETE FROM projects WHERE uuid = ?', [testUuid]);
    console.log('✅ Cleaned up test record.');

  } catch (err) {
    console.error('❌ Insertion Error:', err);
  }
}

testFixInsert();
