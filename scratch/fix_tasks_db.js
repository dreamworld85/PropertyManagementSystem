const mysql = require('../src/utils/mysql.js');
(async () => {
  console.log('--- Fixing Tasks & Teammates in MySQL ---');

  // 1. Update task 1126 (make design) -> David
  await mysql.exec("UPDATE tasks SET assignee = 'David', assignee_id = 179 WHERE id = 1126 OR title = 'make design'");

  // 2. Update task 1125 (Make full plan) -> Tomas
  await mysql.exec("UPDATE tasks SET assignee = 'Tomas', assignee_id = 5815 WHERE id = 1125 OR title = 'Make full plan'");

  // 3. Update legacy candidate tasks: '4' -> Muhammed Iqbal, '93' -> David/Tomas if applicable
  await mysql.exec("UPDATE tasks SET assignee = 'Muhammed Iqbal', assignee_id = 8642 WHERE assignee = '4'");

  // 4. Ensure teammates table has entries for DairyMilk-Warehouse (project_id = 635)
  await mysql.exec(`
    INSERT INTO teammates (uuid, project_id, name, role, discipline, task_name, email, phone)
    VALUES 
      ('tm_david_635', 635, 'David', 'MEP Lead', 'MEP Lead', 'make design', 'daviid@gmail.com', '789456123'),
      ('tm_tomas_635', 635, 'Tomas', 'CAD Technician', 'CAD Technician', 'Make full plan', 'tom@gmail.com', '456123')
    ON DUPLICATE KEY UPDATE name=VALUES(name), task_name=VALUES(task_name)
  `).catch(e => console.log('Teammates insert warning:', e.message));

  console.log('✅ Database migration successfully executed!');

  const updatedTasks = await mysql.query("SELECT id, uuid, project_id, title, assignee, assignee_id FROM tasks WHERE project_id = 635");
  console.table(updatedTasks);

  const updatedTeammates = await mysql.query("SELECT * FROM teammates WHERE project_id = 635");
  console.table(updatedTeammates);

  process.exit(0);
})();
