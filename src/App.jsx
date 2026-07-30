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

export default function App() {
  const [user] = useState(() => {
    try {
      const stored = localStorage.getItem('dgec_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (!user || !user.username) {
      localStorage.removeItem('dgec_user');
      window.location.href = '/login.html';
      return;
    }
    const role = (user.role || '').toLowerCase();
    const userType = (user.userType || '').toLowerCase();

    if (role === 'client' || role.includes('client') || userType === 'client') {
      window.location.href = '/client.html';
    } else if ((role === 'staff' || userType === 'staff') && !role.includes('manager') && !userType.includes('manager') && !role.includes('admin') && user.username !== 'projectmanager' && user.name !== 'Saurabh M.') {
      window.location.href = '/staff.html';
    }
  }, [user]);

  if (!user || !user.username) return null;

  const [db, setDb] = useState(null);
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
    return () => {
      live = false;
      window.removeEventListener("focus", onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  const commit = (updater, logText) =>
    setDb((prev) => {
      let next = updater(prev);
      if (logText) {
        const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
        next = {
          ...next,
          history: [
            { id: uid("h"), user: currentUser, action: logText, at: timestamp },
            ...(next.history || [])
          ].slice(0, 100)
        };
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

  const S = db.settings;
  const clientName = (id) => db.clients.find((c) => c.id === id)?.name || "—";
  const userName = (id) => db.users.find((u) => u.id === id)?.name || "Unassigned";

  const cycleStatus = (id) => {
    const t = db.tasks.find((tk) => tk.id === id);
    const L = db.settings.taskStatuses;
    const nextStatus = L[(L.indexOf(t.status) + 1) % L.length];
    commit(
      (d) => ({
        ...d,
        tasks: d.tasks.map((tk) =>
          tk.id !== id ? tk : { ...tk, status: nextStatus, percent: nextStatus === "Done" ? 100 : tk.percent }
        )
      }),
      `Changed status of task '${t.title}' to ${nextStatus}`
    );
  };

  const setPercent = (id, v) => {
    const t = db.tasks.find((tk) => tk.id === id);
    commit(
      (d) => ({
        ...d,
        tasks: d.tasks.map((tk) =>
          tk.id === id
            ? {
                ...tk,
                percent: v,
                status: v === 100 ? "Done" : v > 0 && tk.status === "Not Started" ? "In Progress" : tk.status
              }
            : tk
        )
      }),
      `Updated progress of task '${t.title}' to ${v}%`
    );
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
    let createdProj = {
      ...p,
      id: uid("p"),
      progress: Number(p.progress) || 0,
      approvalStatus: p.approvalStatus || "Required",
      docNumbers: p.docNumbers || []
    };

    try {
      const resp = await fetch('/api/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.project) {
          createdProj = { ...createdProj, ...data.project, id: data.project.uuid || data.project.id };
        }
      }
    } catch(e) {
      console.error("Failed to save project via API:", e);
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
        tasks: [...initialTasks, ...(d.tasks || [])]
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
      const resp = await fetch('/api/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
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

  const addInvoice = (inv) =>
    commit(
      (d) => ({
        ...d,
        invoices: [...(d.invoices || []), { ...inv, id: uid("inv") }]
      }),
      `Added invoice ${inv.invoiceNo} for project '${db.projects.find((p) => p.id === inv.projectId)?.name}'`
    );

  const updateInvoiceStatus = (id, status) => {
    const inv = db.invoices.find((i) => i.id === id);
    commit(
      (d) => ({
        ...d,
        invoices: d.invoices.map((i) => (i.id === id ? { ...i, status } : i))
      }),
      `Updated status of invoice ${inv?.invoiceNo} to ${status}`
    );
  };

  const deleteInvoice = (id) => {
    const inv = db.invoices.find((i) => i.id === id);
    commit(
      (d) => ({
        ...d,
        invoices: d.invoices.filter((i) => i.id !== id)
      }),
      `Deleted invoice ${inv?.invoiceNo}`
    );
  };

  const clearHistory = () => commit((d) => ({ ...d, history: [] }), "Cleared edit history log");

  const resetDB = async () => {
    if (window.confirm("Are you sure you want to reset all data back to the default seed database? This will clear all custom edits.")) {
      const seed = JSON.parse(JSON.stringify(SEED));
      await saveDB(seed);
      setDb(seed);
    }
  };

  const visible = portal === "client" ? db.projects.filter((p) => p.clientId === asClient) : db.projects;
  const proj = (db.projects || []).find((p) => 
    String(p.id) === String(sel) || 
    String(p.uuid) === String(sel) || 
    (p.db_id !== undefined && String(p.db_id) === String(sel)) ||
    (p.name && sel && String(p.name).trim().toLowerCase() === String(sel).trim().toLowerCase())
  );

  const ctx = {
    db,
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
                    ["overview", "Overview", "▦"],
                    ["projects", "Projects", "▤"],
                    ["financials", "Financials", "⛁"],
                    ["clients", "Clients", "◳"],
                    ["team", "My Teams", "☷"],
                    ["staff_mgmt", "Staff Management", "👤"],
                    ["history", "History", "◷"],
                    ["settings", "Settings", "⚙"]
                  ].map(([k, l, ic]) => (
                    <button key={k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setSel(null); setMenuOpen(false); }}>
                      <span>{ic}</span>
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
                  window.location.href = '/login.html';
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
                <h1 className="disp" style={{ margin: 0 }}>{portal === "client" ? clientName(asClient) : (tab === "team" ? "My Teams" : tab.charAt(0).toUpperCase() + tab.slice(1))}</h1>
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
              <Clients db={db} onAdd={() => setModal({ type: "client" })} onOpenProject={(id) => { setSel(id); setTab("projects"); }} />
            ) : portal === "company" && tab === "team" ? (
              <Team {...ctx} onAdd={() => setModal({ type: "user" })} onOpenProject={(id) => { setSel(id); setTab("projects"); }} />
            ) : portal === "company" && tab === "staff_mgmt" ? (
              <StaffManagement />
            ) : portal === "company" && tab === "history" ? (
              <History {...ctx} />
            ) : portal === "company" && tab === "settings" ? (
              <Settings {...ctx} setList={setList} />
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
