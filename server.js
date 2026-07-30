import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { uid } from './src/utils/helpers.js';
import { SEED } from './src/data/seed.js';
import { query, exec } from './src/utils/mysql.js';

dotenv.config();

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
          pm_id: p.pm_id || p.projectManagerId || null,
          pmId: p.pm_id || p.projectManagerId || null,
          projectManagerId: p.pm_id || p.projectManagerId || null,
          project_manager: p.project_manager || p.pm_name || '',
          pm_name: p.project_manager || p.pm_name || '',
          clientId: p.client_id !== undefined ? p.client_id : p.clientId,
          client_id: p.client_id !== undefined ? p.client_id : p.clientId,
          clientName: p.client_name || p.clientName || '',
          clientSector: p.client_sector || p.clientSector || '',
          clientEmail: p.client_email || p.clientEmail || '',
          clientPhone: p.client_phone || p.clientPhone || '',
          start: p.start_date || p.start || '2026-06-08',
          end: p.end_date || p.end || '2026-12-31',
          approvalStatus: p.approval_status || p.approvalStatus || 'Required',
          totalCost: Number(p.total_cost !== undefined ? p.total_cost : (p.totalCost || 0)),
          total_cost: Number(p.total_cost !== undefined ? p.total_cost : (p.totalCost || 0)),
          docNumbers: parsedDocs,
          desc: p.description || p.desc || ''
        });
      }
    });
    const formattedProjects = Array.from(uniqueProjectsMap.values());

    // Deduplicate clients by lowercased name (prioritizing non-null pm_id)
    const uniqueClientsMap = new Map();
    (clients || []).forEach(c => {
      const key = (c.name || '').trim().toLowerCase();
      if (!key) return;
      const existing = uniqueClientsMap.get(key);
      if (!existing || (!existing.pm_id && c.pm_id)) {
        uniqueClientsMap.set(key, {
          ...c,
          id: c.id,
          uuid: c.uuid || String(c.id),
          pm_id: c.pm_id || c.pmId || null,
          pmId: c.pm_id || c.pmId || null,
          pm_name: c.pm_name || c.pmName || c.project_manager || '',
          pmName: c.pm_name || c.pmName || c.project_manager || '',
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

    // Merge project_managers, staff members, and teammates into users
    const allUsersRaw = (users && users.length > 0) ? users : SEED.users;
    const combinedUsers = [...allUsersRaw];

    const projectManagers = await query('SELECT * FROM project_managers ORDER BY id DESC').catch(() => []);
    (projectManagers || []).forEach(pm => {
      if (pm.name && !combinedUsers.some(u => String(u.id) === String(pm.id) || String(u.uuid) === String(pm.uuid) || String(u.username || '').toLowerCase() === String(pm.username || '').toLowerCase())) {
        combinedUsers.push({
          id: pm.uuid || `pm_${pm.id}`,
          uuid: pm.uuid || `pm_${pm.id}`,
          name: pm.name,
          username: pm.username,
          role: 'project_manager',
          user_type: 'staff',
          userType: 'staff',
          discipline: pm.discipline || 'MEP',
          email: pm.email || '',
          phone: pm.phone || ''
        });
      }
    });

    (staffMembers || []).forEach(sm => {
      if (sm.name && !combinedUsers.some(u => String(u.id) === String(sm.id) || String(u.uuid) === String(sm.uuid) || String(u.name).toLowerCase() === String(sm.name).toLowerCase())) {
        combinedUsers.push({
          id: sm.uuid || `s_${sm.id}`,
          uuid: sm.uuid || `s_${sm.id}`,
          name: sm.name,
          role: sm.role || 'Staff',
          user_type: 'staff',
          userType: 'staff',
          discipline: sm.role || 'Engineering',
          email: sm.email || '',
          phone: sm.contact_number || sm.phone || ''
        });
      }
    });

    formattedTeammates.forEach(tm => {
      if (tm.name && !combinedUsers.some(u => String(u.id) === String(tm.id) || String(u.uuid) === String(tm.id) || String(u.name).toLowerCase() === String(tm.name).toLowerCase())) {
        combinedUsers.push(tm);
      }
    });

    const projectDocs = await query('SELECT * FROM project_documents ORDER BY id DESC').catch(() => []);
    const formattedProjectDocs = (projectDocs || []).map(doc => {
      const proj = formattedProjects.find(p => String(p.id) === String(doc.project_id) || String(p.db_id) === String(doc.project_id));
      return {
        id: doc.uuid || `doc_${doc.id}`,
        uuid: doc.uuid || `doc_${doc.id}`,
        db_id: doc.id,
        projectId: proj ? proj.id : String(doc.project_id),
        project_id: proj ? proj.id : String(doc.project_id),
        documentName: doc.document_name,
        fileName: doc.file_name || null,
        filePath: doc.file_path || null,
        status: doc.status || 'Pending',
        uploadedAt: doc.uploaded_at || null,
        createdAt: doc.created_at
      };
    });

    const dbInvoices = await query('SELECT * FROM invoices ORDER BY id DESC').catch(() => []);
    const formattedInvoices = (dbInvoices || []).map(inv => {
      const proj = formattedProjects.find(p => String(p.id) === String(inv.project_id) || String(p.db_id) === String(inv.project_id));
      return {
        id: inv.uuid || `inv_${inv.id}`,
        uuid: inv.uuid || `inv_${inv.id}`,
        db_id: inv.id,
        projectId: proj ? proj.id : String(inv.project_id),
        project_id: proj ? proj.id : String(inv.project_id),
        invoiceNo: inv.invoice_no,
        amount: Number(inv.amount) || 0,
        dueDate: inv.due_at || inv.due_date || '2026-12-31',
        status: inv.status || 'Pending',
        createdAt: inv.created_at
      };
    });

    const dbHistory = await query('SELECT * FROM history ORDER BY id DESC LIMIT 100').catch(() => []);
    const formattedHistory = (dbHistory || []).map(h => ({
      id: h.uuid || `h_${h.id}`,
      user: h.user_name || h.user || 'System',
      action: h.action,
      at: h.created_at ? new Date(h.created_at).toISOString().slice(0, 16).replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' '),
      ts: h.created_at ? new Date(h.created_at).toISOString().slice(0, 16).replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' ')
    }));

    const responseDb = {
      users: combinedUsers,
      teammates: formattedTeammates,
      staff: staffMembers,
      clients: formattedClients,
      projects: formattedProjects,
      tasks: formattedTasks,
      project_documents: formattedProjectDocs,
      documents: formattedProjectDocs,
      invoices: (formattedInvoices && formattedInvoices.length > 0) ? formattedInvoices : (SEED.invoices || []),
      history: (formattedHistory && formattedHistory.length > 0) ? formattedHistory : (SEED.history || []),
      settings
    };

    res.json(responseDb);
  } catch (err) {
    console.error('GET /api/db error:', err);
    res.status(500).json({ error: 'Failed to read database state', details: err.message });
  }
});

// GET All Clients Endpoint (Deduplicated & Scoped by pm_id)
app.get('/api/clients', async (req, res) => {
  try {
    const { pm_id, pmId, userId } = req.query;
    const targetPmId = pm_id || pmId || userId;

    let clients = [];
    if (targetPmId) {
      clients = await query('SELECT * FROM clients WHERE pm_id = ? ORDER BY id DESC', [targetPmId]).catch(() => []);
    } else {
      clients = await query('SELECT * FROM clients ORDER BY id DESC').catch(() => []);
    }

    const uniqueMap = new Map();
    (clients || []).forEach(c => {
      const key = (c.name || '').trim().toLowerCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...c,
          id: c.id,
          uuid: c.uuid || String(c.id),
          pm_id: c.pm_id || null,
          pmId: c.pm_id || null,
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

// GET /api/projects Endpoint (Scoped strictly by pm_id when provided)
app.get('/api/projects', async (req, res) => {
  try {
    const { pm_id, pmId, userId } = req.query;
    const targetPmId = pm_id || pmId || userId;

    let projects = [];
    if (targetPmId) {
      projects = await query('SELECT * FROM projects WHERE pm_id = ? ORDER BY id DESC', [targetPmId]).catch(() => []);
    } else {
      projects = await query('SELECT * FROM projects ORDER BY id DESC').catch(() => []);
    }

    const formattedProjects = (projects || []).map(p => ({
      ...p,
      id: p.uuid || String(p.id),
      uuid: p.uuid || String(p.id),
      pm_id: p.pm_id || null,
      pmId: p.pm_id || null,
      projectManagerId: p.pm_id || null,
      project_manager: p.project_manager || null,
      clientId: p.client_id,
      totalCost: Number(p.total_cost) || 0,
      start: p.start_date || p.start || '2026-06-08',
      end: p.end_date || p.end || '2026-12-31',
      desc: p.description || p.desc || ''
    }));

    res.json({ success: true, projects: formattedProjects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
});

// GET /api/teams Endpoint (Scoped strictly to active PM projects)
app.get('/api/teams', async (req, res) => {
  try {
    const { pm_id, pmId, userId } = req.query;
    const targetPmId = pm_id || pmId || userId;

    let pmProjUuids = [];
    if (targetPmId) {
      const projs = await query('SELECT uuid, id FROM projects WHERE pm_id = ?', [targetPmId]).catch(() => []);
      pmProjUuids = projs.map(p => p.uuid || String(p.id));
    }

    let teammates = await query('SELECT * FROM teammates ORDER BY id DESC').catch(() => []);
    if (targetPmId && pmProjUuids.length > 0) {
      teammates = teammates.filter(tm => pmProjUuids.includes(String(tm.project_id)));
    } else if (targetPmId && pmProjUuids.length === 0) {
      teammates = [];
    }

    res.json({ success: true, teammates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teams', details: err.message });
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

          const pPmId = p.pm_id || p.pmId || p.projectManagerId || null;
          const pPmName = p.project_manager || p.pm_name || p.pmName || null;

          await query(
            `INSERT INTO projects (uuid, name, client_id, status, category, start_date, end_date, progress, approval_status, description, pm_id, project_manager) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
               name=VALUES(name), 
               status=VALUES(status), 
               progress=VALUES(progress), 
               category=VALUES(category), 
               description=VALUES(description),
               pm_id = IF(VALUES(pm_id) IS NOT NULL AND VALUES(pm_id) != '', VALUES(pm_id), pm_id),
               project_manager = IF(VALUES(project_manager) IS NOT NULL AND VALUES(project_manager) != '', VALUES(project_manager), project_manager)`,
            [p.id || p.uuid, p.name, cid, p.status, p.category, p.start, p.end, p.progress || 0, p.approvalStatus || 'Required', p.desc || '', pPmId, pPmName]
          );
        } catch(e) {}
      }
    }
    if (db && db.clients && db.clients.length > 0) {
      for (const c of db.clients) {
        try {
          const cPmId = c.pm_id || c.pmId || c.projectManagerId || null;
          const cPmName = c.pm_name || c.pmName || c.project_manager || null;

          await query(
            `INSERT INTO clients (uuid, name, sector, contact_name, email, phone, pm_id, pm_name) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
               name=VALUES(name), 
               email=VALUES(email), 
               phone=VALUES(phone),
               pm_id = IF(VALUES(pm_id) IS NOT NULL AND VALUES(pm_id) != '', VALUES(pm_id), pm_id),
               pm_name = IF(VALUES(pm_name) IS NOT NULL AND VALUES(pm_name) != '', VALUES(pm_name), pm_name)`,
            [c.id || c.uuid, c.name, c.sector || 'General', c.contactName || c.name, c.email || c.contact, c.phone || '', cPmId, cPmName]
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



// POST /api/create-pm endpoint (Admin View Only: Dedicated PM creation with credentials)
app.post('/api/create-pm', async (req, res) => {
  try {
    const { name, username, email, phone, password, discipline } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project Manager Name is required.' });
    }

    const pmName = name.trim();
    let pmUsername = (username && username.trim()) ? username.trim().toLowerCase() : pmName.toLowerCase().replace(/\s+/g, '');
    
    const existingU = await query('SELECT id FROM users WHERE username = ?', [pmUsername]);
    if (existingU && existingU.length > 0) {
      pmUsername = pmUsername + '_' + Math.floor(100 + Math.random() * 900);
    }

    const uuid = 'u_pm_' + Math.random().toString(36).substring(2, 9);
    const pmEmail = email ? email.trim() : `${pmUsername}@dgec.com`;
    const pmPhone = phone ? phone.trim() : '+968 9412 8899';
    const pmPassword = password || 'Welcome_2026@';
    const pmDiscipline = discipline || 'MEP';

    const hash = await bcrypt.hash(pmPassword, 10);

    // 1. Insert into project_managers table
    await query(
      `INSERT INTO project_managers (uuid, name, username, email, phone, discipline, password_hash, role) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'project_manager')`,
      [uuid, pmName, pmUsername, pmEmail, pmPhone, pmDiscipline, hash]
    ).catch(e => console.error("project_managers table insert error:", e));

    // 2. Insert into users table
    await query(
      `INSERT INTO users (uuid, name, username, email, phone, role, discipline, user_type, password_hash) 
       VALUES (?, ?, ?, ?, ?, 'project_manager', ?, 'staff', ?)`,
      [uuid, pmName, pmUsername, pmEmail, pmPhone, pmDiscipline, hash]
    ).catch(e => console.error("users table insert error:", e));

    const newPM = {
      id: uuid,
      uuid,
      name: pmName,
      username: pmUsername,
      email: pmEmail,
      phone: pmPhone,
      role: 'project_manager',
      discipline: pmDiscipline,
      userType: 'staff'
    };

    return res.status(200).json({ success: true, user: newPM });
  } catch (err) {
    console.error("Error creating PM:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/project-managers endpoint (Admin View: Fetch all PMs from project_managers table)
app.get('/api/project-managers', async (req, res) => {
  try {
    const pms = await query('SELECT id, uuid, name, username, email, phone, discipline, role, created_at FROM project_managers ORDER BY id DESC');
    res.json({ success: true, projectManagers: pms });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project managers', details: err.message });
  }
});

// POST /api/create-user endpoint
app.post('/api/create-user', async (req, res) => {
  try {
    const { name, username, password, role, roleTitle, discipline, disciplineGroup, userType, email, phone, projectId, taskName } = req.body;
    
    const uRole = role || roleTitle || 'Staff';

    // Single-Admin Hierarchy Security Check
    if (String(uRole).toLowerCase() === 'admin') {
      return res.status(403).json({ error: 'Cannot create additional Admin users. System enforces a single administrator hierarchy.' });
    }

    const uName = (name && name.trim()) ? name.trim() : (username && username.trim()) ? username.trim() : 'Staff Member';
    let uuid = req.body.uuid || req.body.id || ('u_' + Math.random().toString(36).substring(2, 9));
    let uUsername = (username && username.trim()) ? username.trim().toLowerCase() : uName.toLowerCase().replace(/\s+/g, '');
    
    // Check if username already exists in MySQL users table and resolve duplicate
    const existingU = await query('SELECT id FROM users WHERE username = ?', [uUsername]);
    if (existingU && existingU.length > 0) {
      uUsername = uUsername + '_' + Math.floor(100 + Math.random() * 900);
    }

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

    // 0. Check project_managers table first
    let record = null;
    let isClient = false;
    let isPM = false;

    const pmRows = await query('SELECT * FROM project_managers WHERE username = ? OR email = ?', [username, username]);
    if (pmRows && pmRows.length > 0) {
      record = pmRows[0];
      isPM = true;
    }

    // 1. Check clients table first if username is a client
    if (!record) {
      const clientRows = await query('SELECT * FROM clients WHERE username = ? OR email = ? OR name = ?', [username, username, username]);
      if (clientRows && clientRows.length > 0) {
        record = clientRows[0];
        isClient = true;
      }
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
    } else if (isPM || userPayload.role === 'project_manager' || username.toLowerCase() === 'projectmanager' || (userPayload.name && userPayload.name.toLowerCase() === 'saurabh m.') || userPayload.user_type === 'project_manager') {
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

    if (String(role).toLowerCase() === 'admin') {
      return res.status(403).json({ error: 'Cannot assign Admin role. System enforces a single administrator hierarchy.' });
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
    let targetPmId = req.body.pm_id || req.body.pmId || req.body.projectManagerId || req.headers['x-pm-id'] || null;
    let targetPmName = req.body.pm_name || req.body.pmName || req.body.project_manager || null;

    if (targetPmId && !targetPmName) {
      const pmRows = await query('SELECT name FROM project_managers WHERE uuid = ? OR id = ? UNION SELECT name FROM users WHERE uuid = ? OR id = ?', [targetPmId, targetPmId, targetPmId, targetPmId]).catch(() => []);
      if (pmRows && pmRows.length > 0) targetPmName = pmRows[0].name;
    }
    if (!targetPmId && targetPmName) {
      const pmRows = await query('SELECT uuid, id FROM project_managers WHERE name = ? UNION SELECT uuid, id FROM users WHERE name = ?', [targetPmName, targetPmName]).catch(() => []);
      if (pmRows && pmRows.length > 0) targetPmId = pmRows[0].uuid || String(pmRows[0].id);
    }
    if (!targetPmId) {
      const latestPm = await query('SELECT uuid, id, name FROM project_managers ORDER BY id DESC LIMIT 1').catch(() => []);
      if (latestPm && latestPm.length > 0) {
        targetPmId = latestPm[0].uuid || String(latestPm[0].id);
        targetPmName = targetPmName || latestPm[0].name;
      }
    }

    // Insert directly into MySQL clients table
    await exec(
      `INSERT INTO clients (uuid, name, sector, contact_name, email, phone, username, password, role, pm_id, pm_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Client', ?, ?)`,
      [clientUuid, name.trim(), clientSector, clientContactName, clientEmail, clientPhone, clientUsername, clientPassword, targetPmId, targetPmName]
    );

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

// GET All Clients Endpoint (Scoped strictly by pm_id when provided)
app.get('/api/clients', async (req, res) => {
  try {
    const { pm_id, pmId, userId } = req.query;
    const targetPmId = pm_id || pmId || userId;

    let clients = [];
    if (targetPmId) {
      clients = await query('SELECT * FROM clients WHERE pm_id = ? ORDER BY id DESC', [targetPmId]).catch(() => []);
    } else {
      clients = await query('SELECT * FROM clients ORDER BY id DESC').catch(() => []);
    }

    const uniqueMap = new Map();
    (clients || []).forEach(c => {
      const key = (c.name || '').trim().toLowerCase();
      if (!key) return;
      const existing = uniqueMap.get(key);
      if (!existing || (!existing.pm_id && c.pm_id)) {
        uniqueMap.set(key, {
          ...c,
          id: c.uuid || String(c.id),
          uuid: c.uuid || String(c.id),
          pm_id: c.pm_id || c.pmId || null,
          pmId: c.pm_id || c.pmId || null,
          pm_name: c.pm_name || c.pmName || '',
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

// Standard REST Alias Routes
app.get('/clients', (req, res) => {
  req.url = '/api/clients' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  app._router.handle(req, res);
});
app.get('/projects', (req, res) => {
  req.url = '/api/projects' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  app._router.handle(req, res);
});
app.post('/clients', (req, res) => {
  req.url = '/api/create-client';
  app._router.handle(req, res);
});
app.post('/projects', (req, res) => {
  req.url = '/api/create-project';
  app._router.handle(req, res);
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
    const { name, clientId, client_id, category, projectManagerId, pmId, status, start, end, progress, desc, totalCost, total_cost, selectedTeammates } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const projUuid = uid('p');
    const rawClientVal = clientId || client_id || null;
    let clientIntId = null;
    if (rawClientVal) {
      const clientRows = await query('SELECT id FROM clients WHERE uuid = ? OR id = ? OR name = ? ORDER BY id DESC', [rawClientVal, rawClientVal, rawClientVal]).catch(() => []);
      if (clientRows && clientRows.length > 0) {
        clientIntId = clientRows[0].id;
      } else {
        const fallbackClient = await query('SELECT id FROM clients ORDER BY id DESC LIMIT 1').catch(() => []);
        if (fallbackClient && fallbackClient.length > 0) clientIntId = fallbackClient[0].id;
      }
    }
    let targetPmId = req.body.pm_id || req.body.pmId || req.body.projectManagerId || req.headers['x-pm-id'] || null;
    let targetPmName = req.body.project_manager || req.body.pm_name || req.body.pmName || null;

    if (targetPmId && !targetPmName) {
      const pmRows = await query('SELECT name FROM project_managers WHERE uuid = ? OR id = ? UNION SELECT name FROM users WHERE uuid = ? OR id = ?', [targetPmId, targetPmId, targetPmId, targetPmId]).catch(() => []);
      if (pmRows && pmRows.length > 0) targetPmName = pmRows[0].name;
    }
    if (!targetPmId && targetPmName) {
      const pmRows = await query('SELECT uuid, id FROM project_managers WHERE name = ? UNION SELECT uuid, id FROM users WHERE name = ?', [targetPmName, targetPmName]).catch(() => []);
      if (pmRows && pmRows.length > 0) targetPmId = pmRows[0].uuid || String(pmRows[0].id);
    }
    if (!targetPmId) {
      const latestPm = await query('SELECT uuid, id, name FROM project_managers ORDER BY id DESC LIMIT 1').catch(() => []);
      if (latestPm && latestPm.length > 0) {
        targetPmId = latestPm[0].uuid || String(latestPm[0].id);
        targetPmName = targetPmName || latestPm[0].name;
      }
    }

    // Guarantee a valid clientIntId to prevent foreign key constraint failures (projects_ibfk_1)
    if (!clientIntId) {
      let defaultClientRows = await query('SELECT id FROM clients WHERE pm_id = ? OR name = ? ORDER BY id DESC LIMIT 1', [targetPmId, 'General Client']).catch(() => []);
      if (!defaultClientRows || defaultClientRows.length === 0) {
        const genClientUuid = uid('c');
        await exec(
          `INSERT INTO clients (uuid, name, sector, contact_name, email, phone, role, pm_id, pm_name) VALUES (?, 'General Client', 'General', 'General Contact', 'client@dgec.com', '+968 9000 0000', 'Client', ?, ?)`,
          [genClientUuid, targetPmId, targetPmName || 'Project Manager']
        ).catch(() => {});
        defaultClientRows = await query('SELECT id FROM clients WHERE uuid = ?', [genClientUuid]).catch(() => []);
      }
      if (defaultClientRows && defaultClientRows.length > 0) {
        clientIntId = defaultClientRows[0].id;
      }
    }

    const projCategory = category || 'Full Engineering';
    const projStatus = status || 'Active';
    const projStart = start || '2026-06-08';
    const projEnd = end || '2026-12-31';
    const projProgress = Number(progress) || 0;
    const projCost = Number(totalCost !== undefined ? totalCost : (total_cost || 0)) || 0;
    const projDesc = desc || '';

    // 1. Insert into MySQL projects table
    await exec(
      `INSERT INTO projects (uuid, name, client_id, category, status, start_date, end_date, progress, total_cost, description, pm_id, project_manager) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projUuid, name.trim(), clientIntId, projCategory, projStatus, projStart, projEnd, projProgress, projCost, projDesc, targetPmId, targetPmName]
    );

    console.log(`[POST /api/create-project] ✅ Inserted Project: '${name.trim()}' | pm_id: '${targetPmId}' | project_manager: '${targetPmName}' | client_id: ${clientIntId}`);

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
        clientId: clientIntId || rawClientVal,
        category: projCategory,
        projectManagerId: targetPmId,
        status: projStatus,
        start: projStart,
        end: projEnd,
        progress: projProgress,
        totalCost: projCost,
        total_cost: projCost,
        desc: projDesc
      }
    });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
});

// PUT Endpoint to update Total Project Cost in MySQL
app.put('/api/projects/:id/total-cost', async (req, res) => {
  try {
    const { id } = req.params;
    const { totalCost } = req.body;
    if (!id || totalCost === undefined) {
      return res.status(400).json({ error: 'Project ID and totalCost are required' });
    }

    const costNum = Number(totalCost) || 0;
    await exec(
      `UPDATE projects SET total_cost = ?, updated_at = NOW() WHERE id = ? OR uuid = ?`,
      [costNum, id, id]
    );

    res.json({ success: true, message: 'Total project cost updated in database', totalCost: costNum });
  } catch (err) {
    console.error('Update total cost error:', err);
    res.status(500).json({ error: 'Failed to update total cost', details: err.message });
  }
});

// -------------------------------------------------------------
// INVOICE PERSISTENCE API ENDPOINTS
// -------------------------------------------------------------

// POST Create Invoice
app.post('/api/create-invoice', async (req, res) => {
  try {
    const { projectId, invoiceNo, amount, dueDate, status } = req.body;
    if (!projectId || !invoiceNo || amount === undefined) {
      return res.status(400).json({ error: 'projectId, invoiceNo, and amount are required' });
    }

    const pRows = await query('SELECT id, pm_id FROM projects WHERE id = ? OR uuid = ?', [projectId, projectId]).catch(() => []);
    const projIntId = (pRows && pRows.length > 0) ? pRows[0].id : projectId;
    const targetPmId = req.body.pm_id || req.body.pmId || (pRows && pRows.length > 0 ? pRows[0].pm_id : null);

    const invUuid = 'inv_' + Math.random().toString(36).substring(2, 9);
    const invAmount = Number(amount) || 0;
    const invStatus = status || 'Pending';
    const invDueDate = dueDate || '2026-12-31';

    await query(
      `INSERT INTO invoices (uuid, project_id, invoice_no, amount, due_at, issued_at, status, pm_id) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [invUuid, projIntId, invoiceNo.trim(), invAmount, invDueDate, invStatus, targetPmId]
    );

    res.json({
      success: true,
      message: 'Invoice created successfully',
      invoice: {
        id: invUuid,
        uuid: invUuid,
        projectId: String(projectId),
        project_id: String(projIntId),
        invoiceNo: invoiceNo.trim(),
        amount: invAmount,
        dueDate: invDueDate,
        status: invStatus
      }
    });
  } catch (err) {
    console.error('POST /api/create-invoice error:', err);
    res.status(500).json({ error: 'Failed to create invoice', details: err.message });
  }
});

// PUT Update Invoice Status
app.put('/api/invoices/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!id || !status) {
      return res.status(400).json({ error: 'Invoice ID and status are required' });
    }

    await query(
      `UPDATE invoices SET status = ?, updated_at = NOW() WHERE uuid = ? OR id = ? OR invoice_no = ?`,
      [status, id, id, id]
    );

    res.json({ success: true, message: 'Invoice status updated in database', id, status });
  } catch (err) {
    console.error('PUT /api/invoices/:id/status error:', err);
    res.status(500).json({ error: 'Failed to update invoice status', details: err.message });
  }
});

// DELETE Invoice
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM invoices WHERE uuid = ? OR id = ?', [id, id]);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    console.error('DELETE /api/invoices/:id error:', err);
    res.status(500).json({ error: 'Failed to delete invoice', details: err.message });
  }
});

// -------------------------------------------------------------
// HISTORY LOG PERSISTENCE API ENDPOINTS
// -------------------------------------------------------------

// POST Create History Log Entry
app.post('/api/history', async (req, res) => {
  try {
    const { user, action } = req.body;
    if (!action || !action.trim()) {
      return res.status(400).json({ error: 'action text is required' });
    }

    const hUuid = 'h_' + Math.random().toString(36).substring(2, 9);
    const userName = (user && String(user).trim()) ? String(user).trim() : 'System';

    await query(
      `INSERT INTO history (uuid, user_name, action) VALUES (?, ?, ?)`,
      [hUuid, userName, action.trim()]
    );

    res.json({ success: true, message: 'History entry logged', id: hUuid });
  } catch (err) {
    console.error('POST /api/history error:', err);
    res.status(500).json({ error: 'Failed to create history entry', details: err.message });
  }
});

// DELETE Clear History Logs
app.delete('/api/history', async (req, res) => {
  try {
    await query('DELETE FROM history');
    res.json({ success: true, message: 'History logs cleared' });
  } catch (err) {
    console.error('DELETE /api/history error:', err);
    res.status(500).json({ error: 'Failed to clear history', details: err.message });
  }
});

// -------------------------------------------------------------
// TASK MANAGEMENT & PROGRESS LOGGING API ENDPOINT
// -------------------------------------------------------------

// PUT Update Task Status & Progress Endpoint
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, percent, title, assignee, user, actor } = req.body;

    const tRows = await query('SELECT * FROM tasks WHERE id = ? OR uuid = ?', [id, id]).catch(() => []);
    const existingTask = (tRows && tRows.length > 0) ? tRows[0] : null;

    const taskTitle = title || (existingTask ? existingTask.title : 'Task');
    const taskAssignee = assignee || (existingTask ? existingTask.assignee : 'Teammate');
    const activeActor = actor || user || req.body.userName || taskAssignee;

    if (status !== undefined || percent !== undefined) {
      const updates = [];
      const params = [];

      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
      }
      if (percent !== undefined) {
        updates.push('percent = ?');
        params.push(Number(percent));
      }
      params.push(id, id);

      await query(
        `UPDATE tasks SET ${updates.join(', ')}, updated_at = NOW() WHERE uuid = ? OR id = ?`,
        params
      );

      // Log to history table in MySQL!
      let logAction = '';
      if (percent !== undefined) {
        logAction = `Updated progress of task '${taskTitle}' to ${percent}%`;
      } else if (status !== undefined) {
        logAction = `Changed status of task '${taskTitle}' to ${status}`;
      }

      if (logAction) {
        const hUuid = 'h_' + Math.random().toString(36).substring(2, 9);
        await query(
          `INSERT INTO history (uuid, user_name, action) VALUES (?, ?, ?)`,
          [hUuid, activeActor, logAction]
        ).catch(e => console.error("Failed to insert history log:", e));
      }
    }

    res.json({ success: true, message: 'Task updated successfully', id, status, percent });
  } catch (err) {
    console.error('PUT /api/tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to update task', details: err.message });
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

// -------------------------------------------------------------
// REQUIRED DOCUMENTS MANAGEMENT & UPLOAD SYSTEM API ENDPOINTS
// -------------------------------------------------------------

// GET required documents for project
app.get('/api/projects/:id/documents-list', async (req, res) => {
  try {
    const { id } = req.params;
    const pRows = await query('SELECT id FROM projects WHERE id = ? OR uuid = ?', [id, id]).catch(() => []);
    const projIntId = (pRows && pRows.length > 0) ? pRows[0].id : id;

    const rows = await query(
      'SELECT * FROM project_documents WHERE project_id = ? OR project_id = ? ORDER BY id DESC',
      [projIntId, id]
    ).catch(() => []);

    res.json({ success: true, documents: rows });
  } catch (err) {
    console.error('GET /api/projects/:id/documents-list error:', err);
    res.status(500).json({ error: 'Failed to fetch project documents', details: err.message });
  }
});

// POST Required Documents for Project
app.post('/api/projects/:id/required-documents', async (req, res) => {
  try {
    const { id } = req.params;
    const { documentName, documentNames } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const pRows = await query('SELECT id FROM projects WHERE id = ? OR uuid = ?', [id, id]).catch(() => []);
    const projIntId = (pRows && pRows.length > 0) ? pRows[0].id : id;

    const names = Array.isArray(documentNames) ? documentNames : (documentName ? [documentName] : []);
    if (names.length === 0) {
      return res.status(400).json({ error: 'At least one documentName is required' });
    }

    const createdDocs = [];
    for (const name of names) {
      if (!name || !name.trim()) continue;
      const docUuid = 'doc_' + Math.random().toString(36).substring(2, 9);
      await query(
        `INSERT INTO project_documents (uuid, project_id, document_name, status)
         VALUES (?, ?, ?, 'Pending')`,
        [docUuid, projIntId, name.trim()]
      );
      createdDocs.push({
        id: docUuid,
        uuid: docUuid,
        projectId: String(id),
        project_id: String(projIntId),
        documentName: name.trim(),
        status: 'Pending',
        fileName: null,
        filePath: null
      });
    }

    res.json({ success: true, message: 'Required documents saved', documents: createdDocs });
  } catch (err) {
    console.error('POST /api/projects/:id/required-documents error:', err);
    res.status(500).json({ error: 'Failed to save required documents', details: err.message });
  }
});

// POST Upload Document File & Set Status
app.post('/api/projects/:id/upload-document', async (req, res) => {
  try {
    const { id } = req.params;
    const { docId, documentName, fileName, fileData, status } = req.body;

    const pRows = await query('SELECT id FROM projects WHERE id = ? OR uuid = ?', [id, id]).catch(() => []);
    const projIntId = (pRows && pRows.length > 0) ? pRows[0].id : id;

    const newStatus = status || 'Pending';
    const filePath = fileData || `uploads/${fileName || 'document.pdf'}`;
    let targetDocId = docId;

    if (targetDocId) {
      await query(
        `UPDATE project_documents SET file_name = ?, file_path = ?, status = ?, uploaded_at = NOW() WHERE uuid = ? OR id = ?`,
        [fileName || 'document.pdf', filePath, newStatus, targetDocId, targetDocId]
      );
    } else {
      targetDocId = 'doc_' + Math.random().toString(36).substring(2, 9);
      await query(
        `INSERT INTO project_documents (uuid, project_id, document_name, file_name, file_path, status, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [targetDocId, projIntId, documentName || 'Project Document', fileName || 'document.pdf', filePath, newStatus]
      );
    }

    const updatedRows = await query('SELECT * FROM project_documents WHERE uuid = ? OR id = ?', [targetDocId, targetDocId]).catch(() => []);

    res.json({ success: true, message: 'Document uploaded successfully', document: updatedRows[0] || null });
  } catch (err) {
    console.error('POST /api/projects/:id/upload-document error:', err);
    res.status(500).json({ error: 'Failed to upload document', details: err.message });
  }
});

// PUT Update Document Status
app.put('/api/documents/:docId/status', async (req, res) => {
  try {
    const { docId } = req.params;
    const { status } = req.body;

    if (!docId || !status) {
      return res.status(400).json({ error: 'docId and status are required' });
    }

    await query(
      `UPDATE project_documents SET status = ?, updated_at = NOW() WHERE uuid = ? OR id = ?`,
      [status, docId, docId]
    );

    res.json({ success: true, message: 'Document status updated', docId, status });
  } catch (err) {
    console.error('PUT /api/documents/:docId/status error:', err);
    res.status(500).json({ error: 'Failed to update document status', details: err.message });
  }
});

// DELETE Document
app.delete('/api/documents/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    await query('DELETE FROM project_documents WHERE uuid = ? OR id = ?', [docId, docId]);
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error('DELETE /api/documents/:docId error:', err);
    res.status(500).json({ error: 'Failed to delete document', details: err.message });
  }
});

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
Promise.all([ensureAdmin(), ensureJohnDoe()]).then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
});
