import mysql from '../src/utils/mysql.js';

async function cleanup() {
  try {
    // Delete dummy users
    await mysql.query("DELETE FROM users WHERE name IN ('John Doe', 'lana', 'ria', 'kiran', 'Test PM Sync')");
    console.log('✅ Removed dummy test users');

    // Delete dummy client entries
    await mysql.query("DELETE FROM clients WHERE name IN ('www', 'ww-company', 'Tiago', 'WeTravel')");
    console.log('✅ Removed dummy test clients');

    // Make sure authentic staff members are in staff and users tables
    const authenticStaff = [
      { name: 'Tomas', role: 'CAD Technician', contact_number: '456123', email: 'tom@gmail.com' },
      { name: 'Tharun', role: 'Manager', contact_number: '7894561223', email: 'tharaun@gmail.com' },
      { name: 'Benny', role: 'Plumbing Lead', contact_number: '789456123', email: 'benny@gmail.com' },
      { name: 'Boby', role: 'Architect Lead', contact_number: '963322145', email: 'boby@gmail.com' },
      { name: 'David', role: 'MEP Lead', contact_number: '789456123', email: 'david@gmail.com' },
      { name: 'Ahmed Al-Kindi', role: 'Senior Structural Engineer', contact_number: '+968 9123 7890', email: 'ahmed.kindi@dgec.com' }
    ];

    for (const s of authenticStaff) {
      await mysql.query(
        "INSERT INTO staff (uuid, name, contact_number, email, role) VALUES (UUID(), ?, ?, ?, ?) ON DUPLICATE KEY UPDATE contact_number=VALUES(contact_number), email=VALUES(email), role=VALUES(role)",
        [s.name, s.contact_number, s.email, s.role]
      );
      await mysql.query(
        "INSERT INTO users (uuid, name, username, email, phone, role, discipline, user_type, password_hash) VALUES (UUID(), ?, ?, ?, ?, ?, ?, 'staff', '$2b$10$xyz') ON DUPLICATE KEY UPDATE role=VALUES(role)",
        [s.name, s.name.toLowerCase().replace(/\s+/g, ''), s.email, s.contact_number, s.role, s.role]
      );
    }

    console.log('✅ Synchronized authentic staff members into MySQL database');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup Error:', err);
    process.exit(1);
  }
}

cleanup();
