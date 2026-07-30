import './bootstrap.js';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { uid } from './src/utils/helpers.js';
import { SEED } from './src/data/seed.js';
import { query, exec } from './src/utils/mysql.js';

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// MySQL connection is handled via src/utils/mysql.js. No file‑based DB is used.
// The SEED data can be imported once via a separate seed script if required.

// GET Database endpoint
app.get('/api/db', async (req, res) => {
  try {
    const users = await query('SELECT * FROM users').catch(() => []);
    let clients = await query('SELECT * FROM clients ORDER BY id DESC').catch(() => []);
    let projects = await query(`
      SELECT p.*, 
             c.name AS client_name, 
             c.sector AS client_sector, 
             c.email AS client_email, 
             c.phone AS client_phone 
      FROM projects p 
      LEFT JOIN clients c ON (CAST(p.client_id AS CHAR) = CAST(c.id AS CHAR) OR p.client_id = c.uuid OR LOWER(p.client_id) = LOWER(c.name)) 
      ORDER BY p.id DESC
    `).catch(() => []);
    const tasks = await query('SELECT * FROM tasks').catch(() => []);
    const invoices = await query('SELECT * FROM invoices').catch(() => []);
    const history = await query('SELECT * FROM history').catch(() => []);
    const settingsRows = await query('SELECT * FROM settings').catch(() => []);

    let settings = SEED.settings || {
      categories: ["Full Engineering", "MEP Design", "Structural Design", "Design Review", "PMC / As-Built", "Concept Design", "Value Engineering"],
      taskStatuses: ["Not Started", "In Progress", "On Hold", "TBC", "Done"],
      projectStatuses: ["Active", "On Hold", "Concept", "Closed"],
      disciplines: ["Architect of Record", "Architecture", "Structure", "HVAC", "Electrical", "Plumbing", "Fire", "Admin / Management"],
      approvalStatuses: ["Required", "Sent", "Pending", "Rejected", "Approved"]
    };

    if (settingsRows && settingsRows.length > 0) {
      settingsRows.forEach(row => {
        try {
          const val = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json;
          settings[row.key] = val;
        } catch (e) {}
      });
    }

    const uniqueProjectsMap = new Map();
    (projects || []).forEach(p => {
      const pId = p.uuid || String(p.id);
      if (pId && !uniqueProjectsMap.has(pId)) {
        let parsedDocs = [];
        if (p.doc_numbers) {
          try {
            parsedDocs = typeof p.doc_numbers === 'string' ? JSON.parse(p.doc_numbers) : p.doc_numbers;
          } catch(e) {
            parsedDocs = [p.doc_numbers];
          }
        } else if (p.docNumbers) {
          parsedDocs = p.docNumbers;
        }

        uniqueProjectsMap.set(pId, {
          ...p,
          db_id: p.id,
          id: pId,
          uuid: pId,
          clientId: p.client_id !== undefined ? p.client_id : p.clientId,
          client_id: p.client_id !== undefined ? p.client_id : p.clientId,
          clientName: p.client_name || p.clientName || '',
          clientSector: p.client_sector || p.clientSector || '',
          clientEmail: p.client_email || p.clientEmail || '',
          clientPhone: p.client_phone || p.clientPhone || '',
          start: p.start_date || p.start || '2026-06-08',
          end: p.end_date || p.end || '2026-12-31',
          approvalStatus: p.approval_status || p.approvalStatus || 'Required',
          docNumbers: parsedDocs,
          desc: p.description || p.desc || ''
        });
      }
    });
    const formattedProjects = Array.from(uniqueProjectsMap.values());

    // Deduplicate clients by lowercased name
    const uniqueClientsMap = new Map();
    (clients || []).forEach(c => {
      const key = (c.name || '').trim().toLowerCase();
      if (key && !uniqueClientsMap.has(key)) {
        uniqueClientsMap.set(key, {
          ...c,
          id: c.id,
          uuid: c.uuid || String(c.id),
          contactName: c.contact_name || c.contactName || c.name,
          contact: c.email || c.contact || ''
        });
      }
    });
    const formattedClients = Array.from(uniqueClientsMap.values());

    const allTasksRaw = tasks || [];

    const formattedTasks = allTasksRaw.map(t => {
      const proj = formattedProjects.find(p => 
        String(p.id) === String(t.project_id) || 
        String(p.uuid) === String(t.project_id) || 
        String(p.db_id) === String(t.project_id) ||
        String(p.id) === String(t.projectId) ||
        String(p.uuid) === String(t.projectId)
      );
      return {
        ...t,
        id: t.uuid || String(t.id),
        uuid: t.uuid || String(t.id),
        projectId: proj ? proj.id : (t.projectId || String(t.project_id)),
        start: t.start_date || t.start || '2026-06-08',
        target: t.target_date || t.target || '2026-12-31',
        status: t.status || 'In Progress',
        percent: t.percent !== undefined ? t.percent : 0
      };
    });

    const teammates = await query('SELECT * FROM teammates').catch(() => []);
    const staffMembers = await query('SELECT * FROM staff ORDER BY id DESC').catch(() => []);

    const formattedTeammates = teammates.map(tm => {
      const proj = formattedProjects.find(p => String(p.id) === String(tm.project_id) || String(p.db_id) === String(tm.project_id));
      return {
        id: tm.uuid || `tm_${tm.id}`,
        uuid: tm.uuid || `tm_${tm.id}`,
        name: tm.name,
        role: tm.role,
        discipline: tm.discipline,
        projectId: proj ? proj.id : String(tm.project_id),
        assignedProject: proj ? proj.id : String(tm.project_id),
        taskName: tm.task_name,
        email: tm.email,
        phone: tm.phone
      };
    });

    // Merge teammates into users so getProjectTeammates and user rosters include all teammates
    const allUsersRaw = (users && users.length > 0) ? users : SEED.users;
    const combinedUsers = [...allUsersRaw];
    formattedTeammates.forEach(tm => {
      if (!combinedUsers.some(u => String(u.id) === String(tm.id) || String(u.uuid) === String(tm.id) || u.name === tm.name)) {
        combinedUsers.push(tm);
      }
    });

    const responseDb = {
      users: combinedUsers,
      teammates: formattedTeammates,
      staff: staffMembers,
      clients: formattedClients,
      projects: formattedProjects,
      tasks: formattedTasks,
      invoices: (invoices && invoices.length > 0) ? invoices : (SEED.invoices || []),
      history: (history && history.length > 0) ? history : (SEED.history || []),
      settings
    };

    res.json(responseDb);
  } catch (err) {
    console.error('GET /api/db error:', err);
    res.status(500).json({ error: 'Failed to read database state', details: err.message });
  }
});

// GET All Clients Endpoint (Deduplicated)
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await query('SELECT * FROM clients ORDER BY id DESC').catch(() => []);
    const uniqueMap = new Map();
    (clients || []).forEach(c => {
      const key = (c.name || '').trim().toLowerCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...c,
          id: c.id,
          uuid: c.uuid || String(c.id),
          contactName: c.contact_name || c.contactName || c.name,
          contact: c.email || c.contact || ''
        });
      }
    });
    res.json({ success: true, clients: Array.from(uniqueMap.values()) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients', details: err.message });
  }
});

// GET Single Client Details Endpoint (Includes linked committed projects)
app.get('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clientRows = await query('SELECT * FROM clients WHERE id = ? OR uuid = ? OR LOWER(name) = LOWER(?)', [id, id, id]).catch(() => []);
    if (!clientRows || clientRows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = clientRows[0];
    const clientIntId = client.id;
    const clientUuid = client.uuid;
    const clientName = client.name;

    const projectRows = await query(
      `SELECT p.*, 
              c.name AS client_name, 
              c.sector AS client_sector 
       FROM projects p 
       LEFT JOIN clients c ON (CAST(p.client_id AS CHAR) = CAST(c.id AS CHAR) OR p.client_id = c.uuid) 
       WHERE p.client_id = ? OR p.client_id = ? OR LOWER(p.client_id) = LOWER(?) 
       ORDER BY p.id DESC`,
      [clientIntId, clientUuid, clientName]
    ).catch(() => []);

    res.json({
      success: true,
      client: {
        ...client,
        id: client.id,
        uuid: client.uuid || String(client.id),
        contactName: client.contact_name || client.name,
        contact: client.email || ''
      },
      projects: projectRows.map(p => ({
        ...p,
        id: p.uuid || String(p.id),
        uuid: p.uuid || String(p.id),
        clientId: p.client_id,
        start: p.start_date || p.start || '2026-06-08',
        end: p.end_date || p.end || '2026-12-31',
        desc: p.description || p.desc || ''
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client details', details: err.message });
  }
});
app.post('/api/db', async (req, res) => {
  try {
    const db = req.body;
    if (db && db.projects && db.projects.length > 0) {
      for (const p of db.projects) {
        try {
          let cid = p.clientId;
          const cRows = await query('SELECT id FROM clients WHERE uuid = ? OR id = ? OR name = ?', [cid, cid, cid]);
          if (cRows && cRows.length > 0) cid = cRows[0].id;

          await query(
            'INSERT INTO projects (uuid, name, client_id, status, category, start_date, end_date, progress, approval_status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), progress=VALUES(progress), category=VALUES(category), description=VALUES(description)',
            [p.id || p.uuid, p.name, cid, p.status, p.category, p.start, p.end, p.progress || 0, p.approvalStatus || 'Required', p.desc || '']
          );
        } catch(e) {}
      }
    }
    if (db && db.clients && db.clients.length > 0) {
      for (const c of db.clients) {
        try {
          await query(
            'INSERT INTO clients (uuid, name, sector, contact_name, email, phone) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), phone=VALUES(phone)',
            [c.id || c.uuid, c.name, c.sector || 'General', c.contactName || c.name, c.email || c.contact, c.phone || '']
          );
        } catch(e) {}
      }
    }
    if (db && db.users && db.users.length > 0) {
      for (const u of db.users) {
        try {
          const uUuid = u.uuid || u.id;
          const uName = u.name;
          if (!uName) continue;
          const uUsername = u.username || uName.toLowerCase().replace(/\s+/g, '');
          const uRole = u.role || 'Staff';
          const uDiscipline = u.discipline || 'Structure';
          const uUserType = u.userType || 'staff';
          const uEmail = u.email || `${uUsername}@dgec.com`;
          const uPhone = u.phone || '+968 9400 0000';
          const hash = await bcrypt.hash('Welcome_2026@', 10);

          await query(
            'INSERT INTO users (uuid, name, username, email, phone, role, discipline, user_type, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), discipline=VALUES(discipline), user_type=VALUES(user_type)',
            [uUuid, uName, uUsername, uEmail, uPhone, uRole, uDiscipline, uUserType, hash]
          );

          if (u.projectId || u.assignedProject) {
            let pIntId = null;
            const pId = u.projectId || u.assignedProject;
            const pRows = await query('SELECT id FROM projects WHERE uuid = ? OR id = ? OR name = ?', [pId, pId, pId]);
            if (pRows && pRows.length > 0) pIntId = pRows[0].id;

            await query(
              'INSERT INTO teammates (uuid, project_id, name, role, discipline, task_name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), discipline=VALUES(discipline), project_id=VALUES(project_id)',
              [uUuid, pIntId, uName, uRole, uDiscipline, u.taskName || u.initialTask || 'General Project Assignment', uEmail, uPhone]
            ).catch(e => {});
          }
        } catch(e) {}
      }
    }
    if (db && db.tasks && db.tasks.length > 0) {
      for (const t of db.tasks) {
        try {
          let pIntId = null;
          const pRows = await query('SELECT id FROM projects WHERE uuid = ? OR id = ? OR name = ?', [t.projectId, t.projectId, t.projectId]);
          if (pRows && pRows.length > 0) pIntId = pRows[0].id;
          if (pIntId) {
            await query(
              'INSERT INTO tasks (uuid, project_id, discipline, title, assignee, start_date, target_date, status, percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), assignee=VALUES(assignee), status=VALUES(status), percent=VALUES(percent)',
              [t.id || t.uuid, pIntId, t.discipline || 'Structure', t.title, t.assignee, t.start || '2026-06-08', t.target || '2026-12-31', t.status || 'In Progress', t.percent || 0]
            ).catch(e => {});
          }
        } catch(e) {}
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write database state', details: err.message });
  }
});

// POST /api/create-project endpoint
app.post('/api/create-project', async (req, res) => {
  try {
    const { name, clientId, status, category, aor, start, end, progress, approvalStatus, desc } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const uuid = 'p_' + Math.random().toString(36).substring(2, 9);
    const projName = name.trim();
    const projCategory = category || 'Full Engineering';
    const projStatus = status || 'Active';
    const projAor = aor || 'DGEC';
    const projStart = start || new Date().toISOString().slice(0, 10);
    const projEnd = end || '2026-12-31';
    const projProgress = Number(progress) || 0;
    const projApproval = approvalStatus || 'Required';
    const projDesc = desc || '';
    const rawClientVal = clientId || 'c7';

    // Resolve numeric client ID to satisfy MySQL Foreign Key constraint
    let clientIntId = null;
    const clientRows = await query('SELECT id FROM clients WHERE uuid = ? OR id = ? OR name = ? ORDER BY id DESC', [rawClientVal, rawClientVal, rawClientVal]);
    if (clientRows && clientRows.length > 0) {
      clientIntId = clientRows[0].id;
    } else {
      const fallbackClient = await query('SELECT id FROM clients ORDER BY id DESC LIMIT 1');
      if (fallbackClient && fallbackClient.length > 0) clientIntId = fallbackClient[0].id;
    }

    await query(
      'INSERT INTO projects (uuid, name, client_id, status, category, start_date, end_date, progress, approval_status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid, projName, clientIntId, projStatus, projCategory, projStart, projEnd, projProgress, projApproval, projDesc]
    );

    const newProject = {
      id: uuid,
      uuid,
      name: projName,
      clientId: rawClientVal,
      status: projStatus,
      category: projCategory,
      aor: projAor,
      start: projStart,
      end: projEnd,
      progress: projProgress,
      approvalStatus: projApproval,
      desc: projDesc
    };

    res.json({ success: true, project: newProject });
  } catch (err) {
    console.error('Create Project Error:', err);
    res.status(500).json({ error: 'Failed to insert project into database', details: err.message });
  }
});

// POST /api/create-user endpoint
app.post('/api/create-user', async (req, res) => {
  try {
    const { name, username, password, role, roleTitle, discipline, disciplineGroup, userType, email, phone, projectId, taskName } = req.body;
    const uName = (name && name.trim()) ? name.trim() : (username && username.trim()) ? username.trim() : 'Staff Member';
    let uuid = req.body.uuid || req.body.id || ('u_' + Math.random().toString(36).substring(2, 9));
    let uUsername = (username && username.trim()) ? username.trim().toLowerCase() : uName.toLowerCase().replace(/\s+/g, '');
    
    // Check if username already exists in MySQL users table and resolve duplicate
    const existingU = await query('SELECT id FROM users WHERE username = ?', [uUsername]);
    if (existingU && existingU.length > 0) {
      uUsername = uUsername + '_' + Math.floor(100 + Math.random() * 900);
    }

    const uRole = role || roleTitle || 'Staff';
    const uDiscipline = discipline || disciplineGroup || 'Structure';
    const uUserType = userType || 'staff';
    const uEmail = email || `${uUsername}@dgec.com`;
    const uPhone = phone || '+968 9400 0000';
    const uPassword = password || 'Welcome_2026@';

    const hash = await bcrypt.hash(uPassword, 10);

    await query(
      `INSERT INTO users (uuid, name, username, email, phone, role, discipline, user_type, password_hash) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), discipline=VALUES(discipline), user_type=VALUES(user_type)`,
      [uuid, uName, uUsername, uEmail, uPhone, uRole, uDiscipline, uUserType, hash]
    );

    const newUser = {
      id: uuid,
      uuid,
      name: uName,
      username: uUsername,
      email: uEmail,
      phone: uPhone,
      role: uRole,
      discipline: uDiscipline,
      userType: uUserType
    };

    // If taskName & projectId provided, create task assigned to this new user
    let createdTask = null;
    let projIntId = null;
    if (projectId) {
      const pRows = await query('SELECT id FROM projects WHERE uuid = ? OR id = ? OR name = ? ORDER BY id DESC', [projectId, projectId, projectId]);
      if (pRows && pRows.length > 0) {
        projIntId = pRows[0].id;
      } else {
        const fallbackP = await query('SELECT id FROM projects ORDER BY id DESC LIMIT 1');
        if (fallbackP && fallbackP.length > 0) projIntId = fallbackP[0].id;
      }
    }

    if (projIntId && taskName && taskName.trim()) {
      const taskUuid = 't_' + Math.random().toString(36).substring(2, 9);
      await query(
        'INSERT INTO tasks (uuid, project_id, discipline, title, assignee, start_date, target_date, status, percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [taskUuid, projIntId, uDiscipline, taskName.trim(), uuid, new Date().toISOString().slice(0, 10), '2026-12-31', 'In Progress', 0]
      ).catch(e => console.error("Task insert error:", e));

      createdTask = {
        id: taskUuid,
        uuid: taskUuid,
        projectId,
        discipline: uDiscipline,
        title: taskName.trim(),
        assignee: uuid,
        start: new Date().toISOString().slice(0, 10),
        target: '2026-12-31',
        status: 'In Progress',
        percent: 0
      };
    }

    const createdTeammate = {
      id: uuid,
      uuid: uuid,
      name: uName,
      role: uRole,
      discipline: uDiscipline,
      projectId: projectId || (projIntId ? String(projIntId) : null),
      assignedProject: projectId || (projIntId ? String(projIntId) : null),
      taskName: taskName || 'General Project Assignment',
      email: uEmail,
      phone: uPhone
    };

    // Insert into teammates database table
    try {
      await query(
        'INSERT INTO teammates (uuid, project_id, name, role, discipline, task_name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), discipline=VALUES(discipline), project_id=VALUES(project_id)',
        [uuid, projIntId, uName, uRole, uDiscipline, taskName || 'General Project Assignment', uEmail, uPhone]
      );
      console.log(`Saved teammate ${uName} into MySQL teammates table`);
    } catch (e) {
      console.error("Teammates table insert error:", e.message);
    }

    res.json({ success: true, user: newUser, task: createdTask, teammate: createdTeammate });
  } catch (err) {
    console.error('POST /api/create-user error:', err);
    res.status(500).json({ error: 'Failed to create teammate', details: err.message });
  }
});

// POST /api/delete-teammate endpoint
app.post('/api/delete-teammate', async (req, res) => {
  try {
    const { userId, projectId, name } = req.body;
    let projIntId = null;
    if (projectId) {
      const pRows = await query('SELECT id FROM projects WHERE uuid = ? OR id = ? OR name = ?', [projectId, projectId, projectId]);
      if (pRows && pRows.length > 0) projIntId = pRows[0].id;
    }

    if (userId || name) {
      await query('DELETE FROM users WHERE (uuid = ? OR id = ? OR name = ?) AND name != ? AND name != ?', [userId || '', userId || '', name || '', 'Saurabh M.', 'Administrator']);
      await query('DELETE FROM teammates WHERE uuid = ? OR id = ? OR name = ?', [userId || '', userId || '', name || '']);
      if (projIntId) {
        await query('DELETE FROM tasks WHERE project_id = ? AND (assignee = ? OR assignee = ?)', [projIntId, userId || '', name || '']);
      } else {
        await query('DELETE FROM tasks WHERE assignee = ? OR assignee = ?', [userId || '', name || '']);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete Teammate Error:', err);
    res.status(500).json({ error: 'Failed to delete teammate', details: err.message });
  }
});

// Secure Password Authentication Login endpoint
const handleLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // 1. Check clients table first if username is a client
    let record = null;
    let isClient = false;

    const clientRows = await query('SELECT * FROM clients WHERE username = ? OR email = ? OR name = ?', [username, username, username]);
    if (clientRows && clientRows.length > 0) {
      record = clientRows[0];
      isClient = true;
    }

    // 2. Check admin table
    if (!record) {
      const adminRows = await query('SELECT * FROM admin WHERE username = ? OR email = ?', [username, username]);
      record = adminRows[0];
    }

    // 3. Check users table
    if (!record) {
      const userRows = await query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
      record = userRows[0];
      if (record && (record.role?.toLowerCase().includes('client') || record.user_type?.toLowerCase().includes('client'))) {
        isClient = true;
      }
    }

    if (!record) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passHash = record.password_hash || record.password;
    const isMatched = passHash && passHash.startsWith('$2')
      ? bcrypt.compareSync(password, passHash)
      : password === passHash;

    if (!isMatched) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const { password: _p, password_hash: _ph, ...userPayload } = record;
    if (isClient || username.toLowerCase() === 'anjana' || username.toLowerCase() === 'client') {
      userPayload.role = 'Client';
      userPayload.userType = 'Client';
      userPayload.clientId = record.id || record.uuid;
    } else if (username.toLowerCase() === 'projectmanager' || (userPayload.name && userPayload.name.toLowerCase() === 'saurabh m.') || userPayload.user_type === 'project_manager') {
      userPayload.role = 'project_manager';
      userPayload.userType = 'project_manager';
    } else if (!userPayload.role) {
      userPayload.role = 'Admin';
    }

    res.json({ success: true, user: userPayload });
  } catch (err) {
    console.error('Authentication Error:', err);
    res.status(500).json({ error: 'Server authentication failure', details: err.message });
  }
};

app.post('/api/login', handleLogin);
app.post('/api/client-login', handleLogin);

// --- STAFF MANAGEMENT API ENDPOINTS ---
app.get('/api/staff', async (req, res) => {
  try {
    const staffMembers = await query('SELECT * FROM staff ORDER BY id DESC');
    res.json({ success: true, staff: staffMembers });
  } catch (err) {
    console.error('GET /api/staff error:', err);
    res.status(500).json({ error: 'Failed to fetch staff members', details: err.message });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const { uuid, name, contact_number, email, role } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Staff Name is required' });
    }
    if (!role || !role.trim()) {
      return res.status(400).json({ error: 'Role in company is required' });
    }

    const staffUuid = uuid || ('s_' + Math.random().toString(36).substring(2, 9));

    await query(
      `INSERT INTO staff (uuid, name, contact_number, email, role) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE name = VALUES(name), contact_number = VALUES(contact_number), email = VALUES(email), role = VALUES(role)`,
      [staffUuid, name.trim(), contact_number || '', email || '', role.trim()]
    );

    const savedRows = await query('SELECT * FROM staff WHERE uuid = ?', [staffUuid]);
    res.json({ success: true, staff: savedRows[0] });
  } catch (err) {
    console.error('POST /api/staff error:', err);
    res.status(500).json({ error: 'Failed to save staff member', details: err.message });
  }
});

app.delete('/api/staff/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    await query('DELETE FROM staff WHERE id = ? OR uuid = ?', [staffId, staffId]);
    res.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/staff error:', err);
    res.status(500).json({ error: 'Failed to delete staff member', details: err.message });
  }
});

app.post('/api/send-credentials', async (req, res) => {
  const { name, email, username, password, role } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let loginUrl = process.env.PORTAL_URL || 'http://localhost:8080';
  const roleLower = (role || '').toLowerCase();
  
  if (roleLower.includes('client')) {
    loginUrl += '/client';
  } else if (roleLower.includes('admin')) {
    loginUrl += '/admin';
  } else {
    loginUrl += '/staff';
  }

  const mailOptions = {
    from: `"DGEC Portals" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your DGEC Portal Credentials & Access Link',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #1a2530; padding: 24px; text-align: center; color: #ffffff; border-bottom: 3px solid #10b981;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">DGEC Portal Registration</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #a0aec0;">Your account is ready for access</p>
        </div>
        
        <div style="padding: 30px; color: #2d3748; line-height: 1.6; font-size: 15px;">
          <p style="margin-top: 0;">Dear <strong>${name}</strong>,</p>
          <p>An administrator has created your account in the <strong>DGEC Multi-User Portal</strong>. Below are your secure login credentials to access your dashboard:</p>
          
          <div style="background-color: #f7fafc; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #718096; width: 130px; vertical-align: top;">Account Role:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1a2530; vertical-align: top;">${role}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #718096; vertical-align: top;">Username:</td>
                <td style="padding: 6px 0; font-family: 'Courier New', Courier, monospace; font-size: 15px; font-weight: 700; color: #1a2530; vertical-align: top;">${username}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #718096; vertical-align: top;">Password:</td>
                <td style="padding: 6px 0; font-family: 'Courier New', Courier, monospace; font-size: 15px; font-weight: 700; color: #1a2530; vertical-align: top;">${password}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0 0 0; font-weight: 600; color: #718096; vertical-align: middle;">Access URL:</td>
                <td style="padding: 8px 0 0 0; vertical-align: middle;">
                  <a href="${loginUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 6px 14px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">
                    Log Into Portal &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fffaf0; border: 1px solid #feebc8; padding: 14px 18px; border-radius: 8px; margin: 24px 0; font-size: 13px; color: #c05621; display: flex; align-items: start; gap: 8px;">
            <span>⚠️</span>
            <span><strong>Security Notice:</strong> For security reasons, please change this temporary password immediately upon logging in for the first time.</span>
          </div>

          <p style="margin-bottom: 0; border-top: 1px solid #edf2f7; padding-top: 20px;">Best Regards,<br/><span style="color: #4a5568; font-weight: 600;">DGEC IT Support Team</span></p>
        </div>

        <div style="background-color: #f7fafc; text-align: center; padding: 20px; font-size: 11px; color: #a0aec0; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">This is an automated system email. Please do not reply to this address.</p>
          <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} DGEC Engineering. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (err) {
    console.error('Nodemailer Error:', err);
    res.status(500).json({ error: 'Failed to send email notification', details: err.message });
  }
});

// -------------------------------------------------
// Invite‑link flow for Clients (Option 1)
// -------------------------------------------------

// Direct Client Creation Endpoint (Stored directly to database without email invites)
app.post('/api/create-client', async (req, res) => {
  try {
    const { name, sector, contactName, email, phone, contact, username, password, projectManagerId, pmId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const clientUuid = uid('c');
    const clientEmail = email || contact || '';
    const clientPhone = phone || '';
    const clientSector = sector || 'General';
    const clientContactName = contactName || name;
    const clientUsername = username?.trim() || '';
    const clientPassword = password?.trim() ? bcrypt.hashSync(password.trim(), 10) : '';
    const targetPmId = projectManagerId || pmId || null;

    // Insert directly into MySQL clients table
    await exec(
      `INSERT INTO clients (uuid, name, sector, contact_name, email, phone, username, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Client')`,
      [clientUuid, name.trim(), clientSector, clientContactName, clientEmail, clientPhone, clientUsername, clientPassword]
    ).catch(e => console.error("Client table insert error:", e));

    // If login credentials were provided, also store in users table
    if (clientUsername && clientPassword) {
      await exec(
        `INSERT INTO users (uuid, name, username, email, phone, password_hash, role, user_type, is_active) VALUES (?, ?, ?, ?, ?, ?, 'client', 'client', 1)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'client', user_type = 'client'`,
        [clientUuid, name.trim(), clientUsername, clientEmail, clientPhone, clientPassword]
      ).catch(e => console.error("Users table insert error:", e));
    }

    res.json({
      success: true,
      message: 'Client saved directly to database',
      client: {
        id: clientUuid,
        uuid: clientUuid,
        name: name.trim(),
        sector: clientSector,
        contactName: clientContactName,
        email: clientEmail,
        phone: clientPhone,
        username: clientUsername,
        projectManagerId: targetPmId
      }
    });
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Failed to save client to database', details: err.message });
  }
});

// GET All Clients Endpoint (Deduplicated)
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await query('SELECT * FROM clients ORDER BY id DESC').catch(() => []);
    const uniqueMap = new Map();
    (clients || []).forEach(c => {
      const key = (c.name || '').trim().toLowerCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...c,
          id: c.id,
          uuid: c.uuid || String(c.id),
          contactName: c.contact_name || c.contactName || c.name,
          contact: c.email || c.contact || ''
        });
      }
    });
    res.json({ success: true, clients: Array.from(uniqueMap.values()) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients', details: err.message });
  }
});

// DELETE Client Endpoint (Permanent deletion with safe constraint handling)
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // 1. Temporarily disable foreign key checks to safely clear project links
    await exec('SET FOREIGN_KEY_CHECKS = 0');

    // 2. Find target client row to resolve name
    const clientRows = await query('SELECT * FROM clients WHERE id = ? OR uuid = ?', [id, id]).catch(() => []);
    const clientName = clientRows[0]?.name;

    // 3. Unlink connected projects safely
    if (clientName) {
      await exec('UPDATE projects SET client_id = NULL WHERE client_id = ? OR client_id = ? OR LOWER(client_id) = LOWER(?)', [id, id, clientName]);
    } else {
      await exec('UPDATE projects SET client_id = NULL WHERE client_id = ? OR client_id = ?', [id, id]);
    }

    // 4. Delete permanently from clients table
    await exec('DELETE FROM clients WHERE id = ? OR uuid = ?', [id, id]);
    if (clientName) {
      await exec('DELETE FROM clients WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', [clientName]);
    }

    // 5. Re-enable foreign key checks
    await exec('SET FOREIGN_KEY_CHECKS = 1');

    res.json({ success: true, message: 'Client deleted permanently from database' });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Failed to delete client from database', details: err.message });
  }
});

// GET Single Client Details Endpoint (Includes linked committed projects)
app.get('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clientRows = await query('SELECT * FROM clients WHERE id = ? OR uuid = ? OR LOWER(name) = LOWER(?)', [id, id, id]).catch(() => []);
    if (!clientRows || clientRows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = clientRows[0];
    const clientIntId = client.id;
    const clientUuid = client.uuid;
    const clientName = client.name;

    const projectRows = await query(
      `SELECT p.*, 
              c.name AS client_name, 
              c.sector AS client_sector 
       FROM projects p 
       LEFT JOIN clients c ON (CAST(p.client_id AS CHAR) = CAST(c.id AS CHAR) OR p.client_id = c.uuid) 
       WHERE p.client_id = ? OR p.client_id = ? OR LOWER(p.client_id) = LOWER(?) 
       ORDER BY p.id DESC`,
      [clientIntId, clientUuid, clientName]
    ).catch(() => []);

    res.json({
      success: true,
      client: {
        ...client,
        id: client.id,
        uuid: client.uuid || String(client.id),
        contactName: client.contact_name || client.name,
        contact: client.email || ''
      },
      projects: projectRows.map(p => ({
        ...p,
        id: p.uuid || String(p.id),
        uuid: p.uuid || String(p.id),
        clientId: p.client_id,
        start: p.start_date || p.start || '2026-06-08',
        end: p.end_date || p.end || '2026-12-31',
        desc: p.description || p.desc || ''
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client details', details: err.message });
  }
});
app.post('/api/create-client-invite', (req, res) => {
  req.url = '/api/create-client';
  app._router.handle(req, res);
});

// Complete the invitation by setting a password
app.post('/api/complete-invite', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }
    // Update client password in MySQL and clear invitation token.
    await exec(
      `UPDATE clients SET password = ?, inviteToken = NULL, inviteCreatedAt = NULL WHERE inviteToken = ?`,
      [bcrypt.hashSync(password, 10), token]
    );
    res.json({ success: true, message: 'Password set, account activated' });
  } catch (err) {
    console.error('Complete invite error:', err);
    res.status(500).json({ error: 'Failed to complete invitation', details: err.message });
  }
});


// Direct Project Creation Endpoint (Stores project and maps assigned teammates in MySQL)
app.post('/api/create-project', async (req, res) => {
  try {
    const { name, clientId, client_id, category, projectManagerId, pmId, status, start, end, progress, desc, selectedTeammates } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const projUuid = uid('p');
    const targetCid = clientId || client_id || null;
    const targetPmId = projectManagerId || pmId || null;
    const projCategory = category || 'Full Engineering';
    const projStatus = status || 'Active';
    const projStart = start || '2026-06-08';
    const projEnd = end || '2026-12-31';
    const projProgress = Number(progress) || 0;
    const projDesc = desc || '';

    // 1. Insert into MySQL projects table
    await exec(
      `INSERT INTO projects (uuid, name, client_id, category, status, start_date, end_date, progress, description, pm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projUuid, name.trim(), targetCid, projCategory, projStatus, projStart, projEnd, projProgress, projDesc, targetPmId]
    ).catch(e => console.error("Projects table insert error:", e));

    // 2. Insert assigned teammates into tasks table in MySQL if provided
    const teammatesList = selectedTeammates || [];
    for (const tm of teammatesList) {
      const taskUuid = uid('t');
      const taskTitle = tm.taskTitle && tm.taskTitle.trim() ? tm.taskTitle.trim() : `${tm.name} - Project Work`;
      const taskDiscipline = tm.discipline || 'Structural';

      await exec(
        `INSERT INTO tasks (uuid, project_id, title, discipline, assignee_id, status, percent, start_date, target_date) VALUES (?, ?, ?, ?, ?, 'In Progress', 0, ?, ?)`,
        [taskUuid, projUuid, taskTitle, taskDiscipline, tm.id, projStart, projEnd]
      ).catch(e => console.error("Task insert error:", e));
    }

    res.json({
      success: true,
      message: 'Project created successfully with assigned teammates',
      project: {
        id: projUuid,
        uuid: projUuid,
        name: name.trim(),
        clientId: targetCid,
        category: projCategory,
        projectManagerId: targetPmId,
        status: projStatus,
        start: projStart,
        end: projEnd,
        progress: projProgress,
        desc: projDesc
      }
    });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
});
app.post('/api/create-task', async (req, res) => {
  try {
    const { title, discipline, assignee, projectId, project_id, status, percent, start, start_date, target, target_date, description } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task Title is required' });
    }

    const taskUuid = req.body.uuid || req.body.id || ('t_' + Math.random().toString(36).substring(2, 9));
    const pId = projectId || project_id;
    
    let projIntId = pId;
    if (pId) {
      const pRows = await query('SELECT id FROM projects WHERE id = ? OR uuid = ?', [pId, pId]);
      if (pRows && pRows.length > 0) projIntId = pRows[0].id;
    }

    let userIntId = null;
    if (assignee) {
      const uRows = await query('SELECT id FROM users WHERE id = ? OR uuid = ? OR username = ? OR name = ?', [assignee, assignee, assignee, assignee]);
      if (uRows && uRows.length > 0) userIntId = uRows[0].id;
    }

    const taskDiscipline = discipline || 'Structure';
    const taskAssignee = assignee || 'Unassigned';
    const taskStatus = status || 'In Progress';
    const taskPercent = percent !== undefined ? Number(percent) : 0;
    const startDate = start || start_date || '2026-06-08';
    const targetDate = target || target_date || '2026-12-31';

    await query(
      `INSERT INTO tasks (uuid, project_id, title, discipline, assignee, assignee_id, status, percent, start_date, target_date, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), discipline=VALUES(discipline), assignee=VALUES(assignee), assignee_id=VALUES(assignee_id), status=VALUES(status), percent=VALUES(percent)`,
      [taskUuid, projIntId, title.trim(), taskDiscipline, String(taskAssignee), userIntId, taskStatus, taskPercent, startDate, targetDate, description || '']
    );

    const savedTask = {
      id: taskUuid,
      uuid: taskUuid,
      projectId: projIntId ? String(projIntId) : pId,
      project_id: projIntId ? String(projIntId) : pId,
      title: title.trim(),
      discipline: taskDiscipline,
      assignee: taskAssignee,
      assignee_id: taskAssignee,
      status: taskStatus,
      percent: taskPercent,
      start: startDate,
      start_date: startDate,
      target: targetDate,
      target_date: targetDate
    };

    res.json({ success: true, task: savedTask });
  } catch (err) {
    console.error('POST /api/create-task error:', err);
    res.status(500).json({ error: 'Failed to create task', details: err.message });
  }
});

// PUT Endpoint to update Approval Status in MySQL
app.put('/api/projects/:id/approval-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;
    if (!id || !approvalStatus) {
      return res.status(400).json({ error: 'Project ID and approvalStatus are required' });
    }

    await exec(
      `UPDATE projects SET approval_status = ?, updated_at = NOW() WHERE id = ? OR uuid = ?`,
      [approvalStatus, id, id]
    );

    res.json({ success: true, message: 'Approval status updated in database', approvalStatus });
  } catch (err) {
    console.error('Update approval status error:', err);
    res.status(500).json({ error: 'Failed to update approval status', details: err.message });
  }
});

// POST Endpoint to update Document Numbers in MySQL
app.post('/api/projects/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const { docNumbers, docNumber } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    let docList = docNumbers;
    if (!docList && docNumber) {
      const rows = await query('SELECT doc_numbers FROM projects WHERE id = ? OR uuid = ?', [id, id]);
      let current = [];
      if (rows.length > 0 && rows[0].doc_numbers) {
        try {
          current = typeof rows[0].doc_numbers === 'string' ? JSON.parse(rows[0].doc_numbers) : rows[0].doc_numbers;
        } catch(e) {
          current = [rows[0].doc_numbers];
        }
      }
      docList = [...current, docNumber];
    }

    const docJson = JSON.stringify(docList || []);

    await exec(
      `UPDATE projects SET doc_numbers = ?, updated_at = NOW() WHERE id = ? OR uuid = ?`,
      [docJson, id, id]
    );

    res.json({ success: true, message: 'Document numbers stored in database', docNumbers: docList || [] });
  } catch (err) {
    console.error('Update document numbers error:', err);
    res.status(500).json({ error: 'Failed to store document numbers', details: err.message });
  }
});

// Ensure database schema and default records are initialized
async function ensureDatabaseSchema() {
  try {
    // Check if the users table exists
    await query('SELECT 1 FROM users LIMIT 1');
    console.log('✅ Database schema already exists');
  } catch (err) {
    console.log('⚠️ Database schema not found. Initializing database...');
    const schemaPath = path.resolve('dgec_db.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await exec(stmt);
        } catch (execErr) {
          // Ignore comments or empty statements that mysql2 might complain about
          if (!stmt.startsWith('--') && !stmt.startsWith('/*')) {
            console.error('Error executing statement:', stmt.substring(0, 50), execErr.message);
          }
        }
      }
      console.log('✅ Schema imported successfully.');
    } else {
      console.error('❌ Schema file dgec_db.sql not found!');
    }
  }
}

// Ensure a default admin user exists
async function ensureAdmin() {
  const rows = await query('SELECT * FROM users WHERE username = ?', ['admin']);
  if (rows.length === 0) {
    const hash = bcrypt.hashSync('Welcome_2026@', 10);
    await exec(
      `INSERT INTO users (uuid, name, username, email, password_hash, role, user_type, is_active) VALUES (?,?,?,?,?,?,?,?)`,
      [uid('u'), 'Administrator', 'admin', 'admin@example.com', hash, 'admin', 'admin', 1]
    );
    console.log('✅ Default admin user created');
  }
}

// Ensure default staff user John Doe exists
async function ensureJohnDoe() {
  const rows = await query('SELECT * FROM users WHERE username = ? OR uuid = ?', ['john', 'u7']);
  const hash = bcrypt.hashSync('Welcome_2026@', 10);
  if (rows.length === 0) {
    await exec(
      `INSERT INTO users (uuid, name, username, email, phone, password_hash, role, user_type, discipline, is_active) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      ['u7', 'John Doe', 'john', 'john.doe@dgec.com', '+968 9876 5432', hash, 'Senior Structural Engineer', 'staff', 'Structure', 1]
    );
    console.log('✅ Default staff user John Doe created');
  } else {
    await exec(
      `UPDATE users SET name = 'John Doe', password_hash = ?, role = 'Senior Structural Engineer', user_type = 'staff', discipline = 'Structure', email = 'john.doe@dgec.com', phone = '+968 9876 5432' WHERE username = 'john' OR uuid = 'u7'`,
      [hash]
    );
    console.log('✅ Staff user John Doe updated');
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
ensureDatabaseSchema()
  .then(() => Promise.all([ensureAdmin(), ensureJohnDoe()]))
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Server startup error:', err);
  });
