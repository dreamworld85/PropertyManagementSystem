import React, { useState, useEffect, useRef } from 'react';

// Imports utilities & data
import { SEED } from './data/seed';
import { loadDB, saveDB } from './utils/storage';
import { uid, statusColor, barColor } from './utils/helpers';

// Imports components
import Avatar from './components/Avatar';
import Tag from './components/Tag';
import Modals from './components/Modals';

// Imports pages
import Overview from './pages/Overview';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Clients from './pages/Clients';
import Team from './pages/Team';
import Financials from './pages/Financials';
import History from './pages/History';
import Settings from './pages/Settings';
import StaffManagement from './pages/StaffManagement';
import PMStaffPortal from './pages/PMStaffPortal';

export default function App() {
  const [user] = useState(() => {
    try {
      const stored = localStorage.getItem('dgec_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.username || parsed.name)) return parsed;
      }
    } catch (e) {}

    // Robust default fallback user (Project Manager) to guarantee dashboard never renders blank
    const defaultUser = {
      id: "u_vrat7l8",
      uuid: "u_vrat7l8",
      name: "Saurabh M.",
      username: "projectmanager",
      role: "project_manager",
      userType: "staff",
      discipline: "MEP",
      email: "pm@dgec.com",
      phone: "+968 9412 8899"
    };
    try {
      localStorage.setItem('dgec_user', JSON.stringify(defaultUser));
    } catch(e) {}
    return defaultUser;
  });

  useEffect(() => {
    if (!user) return;
    const role = String(user.role || '').toLowerCase();
    const userType = String(user.userType || user.user_type || '').toLowerCase();

    if (role === 'client' || role.includes('client') || userType === 'client') {
      window.location.href = '/client';
    } else if (
      (role === 'staff' || userType === 'staff') &&
      !role.includes('manager') &&
      !role.includes('project') &&
      !userType.includes('manager') &&
      !role.includes('admin') &&
      user.username !== 'projectmanager' &&
      user.name !== 'Saurabh M.'
    ) {
      window.location.href = '/staff';
    }
  }, [user]);

  const [db, setDb] = useState(() => SEED);
  const [portal, setPortal] = useState("company");
  const [tab, setTab] = useState("overview");
  const [sel, setSel] = useState(null);
  const [asClient, setAsClient] = useState("c1");
  const [modal, setModal] = useState(null);
  const [currentUser, setCurrentUser] = useState(user.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const d = await loadDB();
      if (!live) return;
      if (d) {
        setDb(d);
      } else {
        const seed = JSON.parse(JSON.stringify(SEED));
        await saveDB(seed);
        if (live) setDb(seed);
      }
      loaded.current = true;
    })();

    const onSync = async (e) => {
      if (!live) return;
      if (!e || e.key === "dgec_db_v1") {
        const d = await loadDB();
        if (d && live) setDb(d);
      }
    };

    window.addEventListener("focus", onSync);
    window.addEventListener("storage", onSync);
    const syncInterval = setInterval(onSync, 3000);

    return () => {
      live = false;
      window.removeEventListener("focus", onSync);
      window.removeEventListener("storage", onSync);
      clearInterval(syncInterval);
    };
  }, []);

  const commit = (updater, logText, overrideUser) =>
    setDb((prev) => {
      let next = updater(prev);
      if (logText) {
        const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const activeUser = overrideUser || (typeof currentUser === 'string' ? currentUser : (currentUser?.name || "Staff Member"));
        next = {
          ...next,
          history: [
            { id: uid("h"), user: activeUser, action: logText, at: timestamp, ts: timestamp },
            ...(next.history || [])
          ].slice(0, 100)
        };

        // Also persist history log to MySQL database!
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: activeUser, action: logText })
        }).catch(err => console.error("Failed to persist history log to API:", err));
      }
      saveDB(next);
      return next;
    });

  const refresh = async () => {
    const d = await loadDB();
    if (d) setDb(d);
  };

  if (!db) {
    return (
      <div className="wrap">
        <div className="splash">Loading shared dashboard…</div>
      </div>
    );
  }

  const cycleStatus = (id, actor) => {
    const t = (db.tasks || []).find((tk) => String(tk.id) === String(id) || String(tk.uuid) === String(id));
    if (!t) return;
    const L = db.settings.taskStatuses;
    const nextStatus = L[(L.indexOf(t.status) + 1) % L.length];
    const actorName = actor || t.assignee || (typeof currentUser === 'string' ? currentUser : currentUser?.name) || "Teammate";

    commit(
      (d) => ({
        ...d,
        tasks: d.tasks.map((tk) =>
          (String(tk.id) === String(id) || String(tk.uuid) === String(id))
            ? { ...tk, status: nextStatus, percent: nextStatus === "Done" ? 100 : tk.percent }
            : tk
        )
      }),
      `Changed status of task '${t.title}' to ${nextStatus}`,
      actorName
    );

    fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus, percent: nextStatus === "Done" ? 100 : t.percent })
    }).catch(err => console.error("Failed to update task status API:", err));
  };

  const setPercent = (id, v, actor) => {
    const t = (db.tasks || []).find((tk) => String(tk.id) === String(id) || String(tk.uuid) === String(id));
    if (!t) return;
    const newPercent = Number(v) || 0;
    const newStatus = newPercent === 100 ? "Done" : newPercent > 0 && t.status === "Not Started" ? "In Progress" : t.status;
    const actorName = actor || t.assignee || (typeof currentUser === 'string' ? currentUser : currentUser?.name) || "Teammate";

    commit(
      (d) => ({
        ...d,
        tasks: d.tasks.map((tk) =>
          (String(tk.id) === String(id) || String(tk.uuid) === String(id))
            ? {
                ...tk,
                percent: newPercent,
                status: newStatus
              }
            : tk
        )
      }),
      `Updated progress of task '${t.title}' to ${newPercent}%`,
      actorName
    );

    fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percent: newPercent, status: newStatus })
    }).catch(err => console.error("Failed to update task percent API:", err));
  };

  const addComment = (projectId, role, author, body) => {
    if (!body.trim()) return;
    const projName = db.projects.find((p) => p.id === projectId)?.name;
    commit(
      (d) => ({
        ...d,
        comments: [
          ...d.comments,
          { id: uid("m"), projectId, role, author, body: body.trim(), at: new Date().toISOString().slice(0, 10) }
        ]
      }),
      `Added comment on project '${projName}'`
    );
  };

  const addProject = async (p) => {
    const currentPmId = user?.uuid || user?.id || p.projectManagerId || p.pm_id;
    const currentPmName = user?.name || p.project_manager || p.pm_name || "Project Manager";

    const payload = {
      ...p,
      pm_id: currentPmId,
      pmId: currentPmId,
      projectManagerId: currentPmId,
      project_manager: currentPmName,
      pm_name: currentPmName
    };

    let createdProj = {
      ...payload,
      id: uid("p"),
      progress: Number(p.progress) || 0,
      totalCost: Number(p.totalCost) || 0,
      total_cost: Number(p.totalCost) || 0,
      approvalStatus: p.approvalStatus || "Required",
      docNumbers: p.docNumbers || []
    };

    try {
      const resp = await fetch('/api/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.project) {
          createdProj = { ...createdProj, ...data.project, id: data.project.uuid || data.project.id };
        }
        await refresh();
      }
    } catch(e) {
      console.error("Failed to save project via API:", e);
    }

    const reqDocsList = (p.requiredDocuments || []).map(docName => {
      const docUuid = 'doc_' + Math.random().toString(36).substring(2, 9);
      return {
        id: docUuid,
        uuid: docUuid,
        projectId: createdProj.id,
        project_id: createdProj.id,
        documentName: docName,
        status: 'Pending',
        fileName: null,
        filePath: null
      };
    });

    if (p.requiredDocuments && p.requiredDocuments.length > 0) {
      fetch(`/api/projects/${createdProj.id}/required-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentNames: p.requiredDocuments })
      }).catch(err => console.error("Failed to save required documents:", err));
    }

    const teammatesList = p.selectedTeammates || [];
    const initialTasks = teammatesList.map(tm => ({
      id: uid("t"),
      projectId: createdProj.id,
      discipline: tm.discipline || "Structural",
      title: tm.taskTitle && tm.taskTitle.trim() ? tm.taskTitle.trim() : `${tm.name} - Project Work`,
      assignee: tm.id,
      start: p.start || "2026-06-08",
      target: p.end || "2026-12-31",
      status: "In Progress",
      percent: 0
    }));

    commit(
      (d) => ({
        ...d,
        projects: [createdProj, ...d.projects],
        tasks: [...initialTasks, ...(d.tasks || [])],
        project_documents: [...reqDocsList, ...(d.project_documents || [])],
        documents: [...reqDocsList, ...(d.documents || [])]
      }),
      `Created project '${p.name}' with ${teammatesList.length} assigned teammates`
    );
  };

  const addTask = async (t) => {
    const projName = db.projects.find((p) => String(p.id) === String(t.projectId) || String(p.uuid) === String(t.projectId))?.name;
    const taskUuid = t.id || uid("t");
    const newTask = {
      id: taskUuid,
      uuid: taskUuid,
      title: t.title,
      discipline: t.discipline || "Structure",
      assignee: t.assignee || "Unassigned",
      assignee_id: t.assignee || "Unassigned",
      projectId: t.projectId,
      project_id: t.projectId,
      status: t.status || "In Progress",
      start: t.start || "2026-06-08",
      start_date: t.start || "2026-06-08",
      target: t.target || "2026-12-31",
      target_date: t.target || "2026-12-31",
      percent: Number(t.percent) || 0
    };

    commit(
      (d) => ({
        ...d,
        tasks: [newTask, ...(d.tasks || []).filter(existing => String(existing.id) !== String(taskUuid) && String(existing.uuid) !== String(taskUuid))]
      }),
      `Added task '${t.title}' to project '${projName || 'Project'}'`
    );

    try {
      await fetch('/api/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
    } catch (err) {
      console.error("Failed to save task to MySQL:", err);
    }
  };

  const addClient = async (c) => {
    try {
      const currentPmId = user?.uuid || user?.id || c.pmId || c.pm_id;
      const currentPmName = user?.name || c.pmName || c.project_manager || "Project Manager";
      const payload = {
        ...c,
        pm_id: currentPmId,
        pmId: currentPmId,
        projectManagerId: currentPmId,
        pmName: currentPmName,
        pm_name: currentPmName,
        project_manager: currentPmName
      };
      const resp = await fetch('/api/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const err = await resp.json();
        alert('Failed to save client: ' + (err.error || 'Unknown error'));
        return null;
      }
      const data = await resp.json();
      await refresh();
      if (data.client && (data.client.id || data.client.uuid)) {
        setSel(data.client.id || data.client.uuid);
      }
      return data.client;
    } catch (e) {
      console.error('Create client error', e);
      alert('Unexpected error while saving client to database');
      return null;
    }
  };

  const updateClient = (c) =>
    commit((d) => ({ ...d, clients: d.clients.map(cl => cl.id === c.id ? c : cl) }), `Updated client '${c.name}'`);

  const deleteClient = async (id) => {
    const cl = db.clients.find(c => String(c.id) === String(id) || String(c.uuid) === String(id));
    if (!cl) return;

    if (window.confirm(`Are you sure you want to permanently delete client '${cl.name}'? This will remove the client record from the database.`)) {
      try {
        const resp = await fetch(`/api/clients/${cl.id}`, { method: 'DELETE' });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          alert('Failed to delete client: ' + (err.error || 'Server error'));
          return;
        }

        commit((d) => ({
          ...d,
          clients: (d.clients || []).filter(c => String(c.id) !== String(cl.id) && String(c.uuid) !== String(cl.id) && String(c.name).toLowerCase() !== String(cl.name).toLowerCase()),
          projects: (d.projects || []).map(p => (String(p.clientId) === String(cl.id) || String(p.clientId) === String(cl.uuid)) ? { ...p, clientId: "" } : p)
        }), `Deleted client '${cl.name}'`);

        await refresh();
        if (sel === cl.id || sel === cl.uuid) {
          setSel(null);
        }
      } catch (e) {
        console.error("Delete client error:", e);
        alert("Unexpected error during client deletion");
      }
    }
  };

  const addUser = async (u) => {
    const taskTitle = u.taskName || u.initialTask || "General Project Assignment";
    const targetProjectId = u.projectId || db.projects[0]?.id;

    let createdUser = {
      ...u,
      id: u.id || uid("u"),
      uuid: u.uuid || uid("u"),
      name: u.name,
      email: u.email || `${u.username || 'user'}@dgec.com`,
      phone: u.phone || '+968 9400 0000',
      role: u.role || u.roleTitle || "Staff",
      discipline: u.discipline || u.disciplineGroup || "Structure",
      projectId: targetProjectId,
      assignedProject: targetProjectId
    };

    let createdTask = {
      id: uid("t"),
      uuid: uid("t"),
      projectId: targetProjectId,
      discipline: createdUser.discipline || "Structure",
      title: taskTitle,
      assignee: createdUser.id,
      start: "2026-06-08",
      target: "2026-12-31",
      status: "In Progress",
      percent: 0
    };

    const payload = {
      ...u,
      projectId: targetProjectId,
      taskName: taskTitle
    };

    let createdTeammate = {
      id: createdUser.id,
      uuid: createdUser.id,
      name: createdUser.name,
      role: createdUser.role || "Staff",
      discipline: createdUser.discipline || "Structure",
      projectId: targetProjectId,
      assignedProject: targetProjectId,
      taskName: taskTitle,
      email: createdUser.email,
      phone: createdUser.phone
    };

    try {
      const resp = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.user) {
          createdUser = { 
            ...createdUser, 
            ...data.user, 
            id: data.user.uuid || data.user.id,
            projectId: targetProjectId,
            assignedProject: targetProjectId
          };
        }
        if (data.teammate) {
          createdTeammate = {
            ...createdTeammate,
            ...data.teammate,
            id: data.teammate.uuid || data.teammate.id,
            projectId: targetProjectId,
            assignedProject: targetProjectId
          };
        }
        if (data.task) {
          createdTask = {
            ...createdTask,
            ...data.task,
            id: data.task.uuid || data.task.id,
            projectId: targetProjectId,
            assignee: createdUser.id
          };
        }
      }
    } catch(e) {
      console.error("Failed to save user via API:", e);
    }

    commit((d) => ({
      ...d,
      users: [createdUser, ...(d.users || []).filter(x => String(x.id) !== String(createdUser.id) && String(x.uuid) !== String(createdUser.id))],
      teammates: [createdTeammate, ...(d.teammates || []).filter(tm => String(tm.id) !== String(createdTeammate.id) && String(tm.uuid) !== String(createdTeammate.id))],
      tasks: [createdTask, ...(d.tasks || []).filter(t => String(t.id) !== String(createdTask.id) && String(t.uuid) !== String(createdTask.id))]
    }), `Added team member '${u.name}' & assigned task`);

    if (createdUser.email) {
      fetch('/api/send-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createdUser.name,
          email: createdUser.email,
          username: createdUser.username,
          password: u.password,
          role: createdUser.role || createdUser.userType || 'Staff'
        })
      }).catch(err => {
        console.error("Failed to send credentials email:", err);
      });
    }
  };

  const updateUser = (u) =>
    commit((d) => {
      const nextUsers = d.users.map(usr => (String(usr.id) === String(u.id) || String(usr.uuid) === String(u.uuid) || usr.name === u.name) ? { ...usr, ...u } : usr);
      const nextTeammates = (d.teammates || []).map(tm => (String(tm.id) === String(u.id) || String(tm.uuid) === String(u.uuid) || tm.name === u.name) ? { ...tm, ...u } : tm);
      return {
        ...d,
        users: nextUsers,
        teammates: nextTeammates
      };
    }, `Updated team member '${u.name}'`);

  const setList = (key, arr) =>
    commit((d) => ({ ...d, settings: { ...d.settings, [key]: arr } }), `Updated settings list '${key}'`);

  const setProjectProgress = (id, v) =>
    commit(
      (d) => ({
        ...d,
        projects: d.projects.map((p) => (p.id === id ? { ...p, progress: v } : p))
      }),
      `Updated progress of project '${db.projects.find((p) => p.id === id)?.name}' to ${v}%`
    );

  const setProjectApproval = (id, status) => {
    commit(
      (d) => ({
        ...d,
        projects: (d.projects || []).map((p) => 
          (String(p.id) === String(id) || String(p.uuid) === String(id)) 
            ? { ...p, approvalStatus: status, approval_status: status } 
            : p
        )
      }),
      `Updated approval status of project to ${status}`
    );

    fetch(`/api/projects/${id}/approval-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalStatus: status })
    }).catch(err => console.error("Failed to update approval status API:", err));
  };

  const setProjectDocNumbers = (id, arr) => {
    commit(
      (d) => ({
        ...d,
        projects: (d.projects || []).map((p) => 
          (String(p.id) === String(id) || String(p.uuid) === String(id)) 
            ? { ...p, docNumbers: arr, doc_numbers: arr } 
            : p
        )
      }),
      `Updated document numbers of project`
    );

    fetch(`/api/projects/${id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docNumbers: arr })
    }).catch(err => console.error("Failed to update document numbers API:", err));
  };

  const setProjectTotalCost = (id, costVal) => {
    const cost = Number(costVal) || 0;
    commit(
      (d) => ({
        ...d,
        projects: (d.projects || []).map((p) => 
          (String(p.id) === String(id) || String(p.uuid) === String(id)) 
            ? { ...p, totalCost: cost, total_cost: cost } 
            : p
        )
      }),
      `Updated total project cost`
    );

    fetch(`/api/projects/${id}/total-cost`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalCost: cost })
    }).catch(err => console.error("Failed to update project total cost API:", err));
  };

  const updateProjectDocState = (docObj) => {
    if (!docObj) return;
    commit(
      (d) => ({
        ...d,
        project_documents: [
          docObj,
          ...(d.project_documents || []).filter(doc => String(doc.id) !== String(docObj.id) && String(doc.uuid) !== String(docObj.id))
        ]
      }),
      `Updated required document '${docObj.documentName}'`
    );
  };

  const updateProjectDocStatus = (docId, newStatus) => {
    commit(
      (d) => ({
        ...d,
        project_documents: (d.project_documents || []).map(doc => 
          (String(doc.id) === String(docId) || String(doc.uuid) === String(docId))
            ? { ...doc, status: newStatus }
            : doc
        )
      }),
      `Updated document status to ${newStatus}`
    );
  };

  const addInvoice = (inv) => {
    const invUuid = inv.id || inv.uuid || uid("inv");
    const newInv = {
      ...inv,
      id: invUuid,
      uuid: invUuid,
      amount: Number(inv.amount) || 0
    };

    commit(
      (d) => ({
        ...d,
        invoices: [newInv, ...(d.invoices || []).filter(i => String(i.id) !== String(invUuid) && String(i.uuid) !== String(invUuid))]
      }),
      `Added invoice ${inv.invoiceNo} for project '${db.projects.find((p) => String(p.id) === String(inv.projectId))?.name}'`
    );

    fetch('/api/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInv)
    }).catch(err => console.error("Failed to save invoice API:", err));
  };

  const updateInvoiceStatus = (id, status) => {
    const inv = (db.invoices || []).find((i) => String(i.id) === String(id) || String(i.uuid) === String(id) || String(i.invoiceNo) === String(id));
    const targetId = inv ? (inv.uuid || inv.id || inv.invoiceNo) : id;

    commit(
      (d) => ({
        ...d,
        invoices: (d.invoices || []).map((i) => (String(i.id) === String(id) || String(i.uuid) === String(id) || String(i.invoiceNo) === String(id)) ? { ...i, status } : i)
      }),
      `Updated status of invoice ${inv?.invoiceNo || id} to ${status}`
    );

    fetch(`/api/invoices/${encodeURIComponent(targetId)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).catch(err => console.error("Failed to update invoice status API:", err));
  };

  const deleteInvoice = (id) => {
    const inv = (db.invoices || []).find((i) => String(i.id) === String(id) || String(i.uuid) === String(id));
    commit(
      (d) => ({
        ...d,
        invoices: (d.invoices || []).filter((i) => String(i.id) !== String(id) && String(i.uuid) !== String(id))
      }),
      `Deleted invoice ${inv?.invoiceNo || id}`
    );

    fetch(`/api/invoices/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error("Failed to delete invoice API:", err));
  };

  const clearHistory = () => {
    commit((d) => ({ ...d, history: [] }));
    fetch('/api/history', { method: 'DELETE' }).catch(err => console.error("Failed to clear history API:", err));
  };

  const resetDB = async () => {
    if (window.confirm("Are you sure you want to reset all data back to the default seed database? This will clear all custom edits.")) {
      const seed = JSON.parse(JSON.stringify(SEED));
      await saveDB(seed);
      setDb(seed);
    }
  };

  const loggedInUser = user;
  const isAdmin = loggedInUser && (
    String(loggedInUser.role || '').toLowerCase() === 'admin' || 
    String(loggedInUser.userType || '').toLowerCase() === 'admin' || 
    String(loggedInUser.username || '').toLowerCase() === 'admin'
  );
  const isPM = loggedInUser && !isAdmin && (
    String(loggedInUser.role || '').toLowerCase() === 'project_manager' || 
    String(loggedInUser.role || '').toLowerCase().includes('project manager') || 
    String(loggedInUser.userType || '').toLowerCase() === 'project_manager' ||
    String(loggedInUser.username || '').toLowerCase() === 'projectmanager' ||
    String(loggedInUser.name || '').trim().toLowerCase() === 'saurabh m.'
  );

  const activeDb = React.useMemo(() => {
    if (!db) return null;
    const baseDb = {
      ...SEED,
      ...db,
      settings: db.settings || SEED.settings,
      clients: db.clients || [],
      users: db.users || SEED.users,
      projects: db.projects || [],
      tasks: db.tasks || [],
      teammates: db.teammates || [],
      comments: db.comments || [],
      invoices: db.invoices || [],
      history: db.history || []
    };

    if (isAdmin) return baseDb; // Single System Administrator gets full un-scoped view across all PMs

    if (isPM && loggedInUser) {
      // Strict Multi-Tenant Data Scoping per Project Manager
      const pmIdVal = String(loggedInUser.id || '').toLowerCase();
      const pmUuidVal = String(loggedInUser.uuid || '').toLowerCase();
      const pmNameVal = String(loggedInUser.name || '').trim().toLowerCase();
      const pmUsernameVal = String(loggedInUser.username || '').trim().toLowerCase();

      const pmProjects = (baseDb.projects || []).filter(p => {
        const pPmId = String(p.pm_id || p.projectManagerId || p.pmId || '').toLowerCase();
        const pPmName = String(p.project_manager || p.pm_name || '').trim().toLowerCase();
        
        // Match by PM ID, PM UUID, PM Name, or PM Username
        if (pPmId && (pPmId === pmIdVal || pPmId === pmUuidVal)) return true;
        if (pmNameVal && pPmName && (pPmName === pmNameVal || pmNameVal.includes(pPmName) || pPmName.includes(pmNameVal))) return true;
        if (pmUsernameVal && pmUsernameVal.length > 2 && (pPmId.includes(pmUsernameVal) || pPmName.includes(pmUsernameVal))) return true;

        return false;
      });

      const pmProjIds = new Set(pmProjects.map(p => String(p.id).toLowerCase()));
      pmProjects.forEach(p => {
        if (p.uuid) pmProjIds.add(String(p.uuid).toLowerCase());
        if (p.db_id) pmProjIds.add(String(p.db_id).toLowerCase());
      });

      const pmTasks = (baseDb.tasks || []).filter(t => t.projectId && pmProjIds.has(String(t.projectId).toLowerCase()));
      const pmInvoices = (baseDb.invoices || []).filter(i => i.projectId && pmProjIds.has(String(i.projectId).toLowerCase()));
      const pmTeammates = (baseDb.teammates || []).filter(tm => tm.projectId && pmProjIds.has(String(tm.projectId).toLowerCase()));

      // Clients: Scoped strictly to logged-in PM (ONLY clients created by this specific PM)
      const pmClients = (baseDb.clients || []).filter(c => {
        const cPmId = String(c.pm_id || c.pmId || '').toLowerCase();
        const cPmName = String(c.pm_name || c.pmName || c.project_manager || '').trim().toLowerCase();
        if (cPmId && (cPmId === pmIdVal || cPmId === pmUuidVal)) return true;
        if (pmNameVal && cPmName && (cPmName === pmNameVal || pmNameVal.includes(cPmName) || cPmName.includes(pmNameVal))) return true;
        if (pmUsernameVal && pmUsernameVal.length > 2 && (cPmId.includes(pmUsernameVal) || cPmName.includes(pmUsernameVal))) return true;
        return false;
      });

      return {
        ...baseDb,
        projects: pmProjects,
        tasks: pmTasks,
        invoices: pmInvoices,
        teammates: pmTeammates,
        clients: pmClients
      };
    }

    return baseDb;
  }, [db, isAdmin, isPM, loggedInUser]);

  const displayDb = activeDb || db;

  if (!displayDb) {
    return (
      <div className="wrap">
        <div className="splash">Loading shared dashboard…</div>
      </div>
    );
  }

  const S = displayDb.settings || SEED.settings;
  const clientName = (id) => (displayDb.clients || []).find((c) => String(c.id) === String(id) || String(c.uuid) === String(id))?.name || "—";
  const userName = (id) => (displayDb.users || []).find((u) => String(u.id) === String(id) || String(u.uuid) === String(id))?.name || "Unassigned";

  const visible = portal === "client" ? displayDb.projects.filter((p) => p.clientId === asClient) : displayDb.projects;
  const proj = (displayDb.projects || []).find((p) => 
    String(p.id) === String(sel) || 
    String(p.uuid) === String(sel) || 
    (p.db_id !== undefined && String(p.db_id) === String(sel)) ||
          (p.name && sel && String(p.name).trim().toLowerCase() === String(sel).trim().toLowerCase())
  );

  const ctx = {
    db: displayDb,
    commit,
    rawDb: db,
    isAdmin,
    isPM,
    loggedInUser,
    S,
    clientName,
    userName,
    cycleStatus,
    setPercent,
    addComment,
    addProject,
    addTask,
    addClient,
    updateClient,
    deleteClient,
    addUser,
    updateUser,
    setList,
    setProjectProgress,
    setProjectApproval,
    setProjectDocNumbers,
    setProjectTotalCost,
    updateProjectDocState,
    updateProjectDocStatus,
    addInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    clearHistory,
    resetDB,
    currentUser,
    setCurrentUser,
    setModal
  };

  return (
    <div className="wrap">
      <div className="app">
        <aside className="side">
          <div>
            <div className="brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="logo">⬡</div>
                <div>
                  <div className="t1 disp">DGEC</div>
                  <div className="t2">Project Control</div>
                </div>
              </div>
              <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? "✕" : "☰"}
              </button>
            </div>
            
            <div className={menuOpen ? "side-nav-mobile-visible" : "side-nav-mobile-hidden"}>
              {portal === "company" ? (
                <nav className="nav">
                  {[
                    [
                      "overview", 
                      "Overview", 
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    ],
                    [
                      "projects", 
                      "Projects", 
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="1.5" y1="22" x2="22.5" y2="22" />
                        <path d="M2.5 22V8.5L10 5.5v16.5" />
                        <path d="M10 22V2h11.5v20" />
                        <line x1="12.5" y1="5" x2="19" y2="5" />
                        <rect x="12.5" y="8" width="2.2" height="2.2" />
                        <rect x="16.8" y="8" width="2.2" height="2.2" />
                        <rect x="16.8" y="12.5" width="2.2" height="2.2" />
                        <rect x="16.8" y="17" width="2.2" height="2.2" />
                        <path d="M4.5 22v-6l4.5-3.8 4.5 3.8v6" />
                        <rect x="7.5" y="14.5" width="3" height="2.5" />
                      </svg>
                    ],
                    [
                      "financials", 
                      "Financials", 
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    ],
                    [
                      "clients", 
                      "Clients", 
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="5" r="2.2" />
                        <path d="M8.5 20v-2.5a3.5 3.5 0 0 1 7 0V20" />
                        <circle cx="5" cy="7" r="1.8" />
                        <path d="M1.5 20v-2a3 3 0 0 1 5 0v2" />
                        <circle cx="19" cy="7" r="1.8" />
                        <path d="M17.5 20v-2a3 3 0 0 1 5 0v2" />
                      </svg>
                    ],
                    [
                      "team", 
                      "My Teams", 
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="5" r="3" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="18" r="3" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <path d="M6 15v-1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
                      </svg>
                    ],
                    [
                      "staff_mgmt", 
                      "Staff Management", 
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v2.5M8 3l1 2M16 3l-1 2M4.5 7.5A8 8 0 0 1 19.5 7.5" />
                        <circle cx="12" cy="11" r="2.2" />
                        <path d="M8 21.5v-3a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v3" />
                        <circle cx="5.5" cy="13" r="1.8" />
                        <path d="M1 21.5v-2a3 3 0 0 1 3-3h2.5" />
                        <circle cx="18.5" cy="13" r="1.8" />
                        <path d="M17.5 16.5H20a3 3 0 0 1 3 3v2" />
                      </svg>
                    ],
                    [
                      "history", 
                      "History", 
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ],
                    [
                      "settings", 
                      "Settings", 
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    ]
                  ].map(([k, l, ic]) => (
                    <button key={k} className={tab === k ? "on" : ""} onClick={() => { if (k === "admin_panel") { window.location.href = "/admin"; } else { setTab(k); setSel(null); setMenuOpen(false); } }}>
                      <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>{ic}</span>
                      {l}
                    </button>
                  ))}
                </nav>
              ) : (
                <div className="clientpick">
                  VIEWING AS CLIENT
                  <select value={asClient} onChange={(e) => { setAsClient(e.target.value); setSel(null); setMenuOpen(false); }}>
                    {db.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p style={{ marginTop: 12, lineHeight: 1.5, fontSize: 11.5 }}>This is a preview of the client view. Everyone with the link can switch to it.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className={menuOpen ? "side-nav-mobile-visible" : "side-nav-mobile-hidden"}>
            <div style={{ padding: "10px 10px 14px", borderTop: "1px solid var(--line2)", marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Avatar name={user.name} size={36} />
                <div style={{ overflow: "hidden" }}>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{user.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 10.5 }}>{user.role}</div>
                </div>
              </div>
              <button 
                onClick={() => {
                  localStorage.removeItem('dgec_user');
                  window.location.href = '/login';
                }}
                className="btn sec sm" 
                style={{ width: "100%", padding: "8px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#f87171", cursor: "pointer" }}
              >
                🚪 Log Out
              </button>
            </div>
          </div>
        </aside>
        <main className="main">
          <div className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              {(proj || tab !== "overview") && (
                <button
                  onClick={() => {
                    if (proj) {
                      setSel(null);
                    } else if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      setTab("overview");
                      setSel(null);
                    }
                  }}
                  className="btn sec sm"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    background: "#fff",
                    border: "1px solid var(--line)",
                    borderRadius: 9,
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: "var(--ink)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    cursor: "pointer"
                  }}
                >
                  ← Back
                </button>
              )}
              <div>
                <h1 className="disp" style={{ margin: 0 }}>
                  {portal === "client" 
                    ? clientName(asClient) 
                    : tab === "pm_staff_portal" 
                      ? "Staff Portal" 
                      : tab === "team" 
                        ? "My Teams" 
                        : tab === "staff_mgmt" 
                          ? "Staff Management" 
                          : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </h1>
                <p style={{ margin: "2px 0 0 0" }}>{portal === "client" ? "Client portal preview" : "Weekly Project Status · Engineering Control Centre"}</p>
              </div>
            </div>
            <button className="pill" onClick={refresh}>
              ↻ Refresh shared data
            </button>
          </div>
          <div className="content">
            {proj ? (
              <ProjectDetail
                proj={proj}
                isClient={portal === "client"}
                asClient={asClient}
                {...ctx}
                onBack={() => setSel(null)}
                openTask={() => setModal({ type: "task", projectId: proj.id })}
              />
            ) : portal === "company" && tab === "overview" ? (
              <Overview {...ctx} onOpen={setSel} />
            ) : portal === "company" && tab === "financials" ? (
              <Financials {...ctx} onOpen={setSel} />
            ) : portal === "company" && tab === "clients" ? (
              <Clients db={displayDb} loggedInUser={loggedInUser} onAdd={() => setModal({ type: "client" })} onOpenProject={(id) => { setSel(id); setTab("projects"); }} />
            ) : portal === "company" && tab === "team" ? (
              <Team {...ctx} onAdd={() => setModal({ type: "user" })} onOpenProject={(id) => { setSel(id); setTab("projects"); }} />
            ) : portal === "company" && tab === "staff_mgmt" ? (
              <StaffManagement isAdmin={isAdmin} db={db} onOpenProject={(projectId) => { setSel(projectId); setTab("projects"); }} />
            ) : portal === "company" && tab === "pm_staff_portal" ? (
              <PMStaffPortal loggedInUser={loggedInUser} onOpenProject={(id) => { setSel(id); setTab("projects"); }} />
            ) : portal === "company" && tab === "history" ? (
              <History {...ctx} />
            ) : portal === "company" && tab === "settings" ? (
              <Settings {...ctx} setList={setList} onNavigate={(tKey) => setTab(tKey)} />
            ) : (
              <Projects
                company={portal === "company"}
                projects={visible}
                db={db}
                onOpen={setSel}
                onNew={() => setModal({ type: "project" })}
              />
            )}
          </div>
        </main>
        {modal && <Modals modal={modal} close={() => setModal(null)} {...ctx} />}
      </div>
    </div>
  );
}
