import { exec, query } from '../src/utils/mysql.js';

async function clearDatabaseData() {
  console.log('=== 🧹 CLEARING ALL CLIENTS, PROJECTS, AND TEAMS DATA FROM MYSQL ===');

  try {
    // 1. Temporarily disable foreign key constraints for safe truncation
    await exec('SET FOREIGN_KEY_CHECKS = 0');

    // 2. Clear data from target tables
    await exec('TRUNCATE TABLE projects');
    console.log('✅ Cleared projects table data');

    await exec('TRUNCATE TABLE clients');
    console.log('✅ Cleared clients table data');

    await exec('TRUNCATE TABLE teammates');
    console.log('✅ Cleared teammates table data');

    await exec('TRUNCATE TABLE tasks');
    console.log('✅ Cleared tasks table data');

    await exec('TRUNCATE TABLE invoices');
    console.log('✅ Cleared invoices table data');

    await exec('TRUNCATE TABLE project_documents');
    console.log('✅ Cleared project_documents table data');

    // Remove client users from users table (keep PMs and Admins)
    await exec("DELETE FROM users WHERE role = 'client' OR role = 'Client' OR user_type = 'client'");
    console.log('✅ Cleared client users from users table');

    // Re-enable foreign key constraints
    await exec('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n--- VERIFYING CLEAN TABLE STATES ---');
    const projCount = (await query('SELECT COUNT(*) as cnt FROM projects'))[0].cnt;
    const clientCount = (await query('SELECT COUNT(*) as cnt FROM clients'))[0].cnt;
    const tmCount = (await query('SELECT COUNT(*) as cnt FROM teammates'))[0].cnt;
    const pmCount = (await query('SELECT COUNT(*) as cnt FROM project_managers'))[0].cnt;

    console.log(`Projects count: ${projCount}`);
    console.log(`Clients count: ${clientCount}`);
    console.log(`Teammates count: ${tmCount}`);
    console.log(`Project Managers count: ${pmCount}`);

    console.log('\n🎉 ALL CLIENTS, PROJECTS, AND TEAMS DATA CLEARED SUCCESSFULLY!');

  } catch (err) {
    console.error('Error clearing data:', err);
  }
}

clearDatabaseData();
