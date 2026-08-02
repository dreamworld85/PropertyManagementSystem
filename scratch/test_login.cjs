const mysql = require('../src/utils/mysql.js');
(async () => {
  const allTasks = await mysql.query("SELECT id, uuid, project_id, title, assignee, assignee_id FROM tasks");
  console.log('--- ALL TASKS IN MYSQL ---');
  console.table(allTasks);
  process.exit(0);
})();
