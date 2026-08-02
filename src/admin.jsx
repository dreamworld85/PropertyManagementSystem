import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { SEED } from './data/seed';
import { loadDB, saveDB } from './utils/storage';
import { uid } from './utils/helpers';
import bcrypt from 'bcryptjs';
import Modals from './components/Modals';
import Avatar from './components/Avatar';
import Admin from './pages/Admin';
import StaffManagement from './pages/StaffManagement';
import ProjectManagersAdmin from './pages/ProjectManagersAdmin';
import AdminStaffPortal from './pages/AdminStaffPortal';
import ProjectManagersFullData from './pages/ProjectManagersFullData';
import Settings from './pages/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function AdminApp() {
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
      window.location.href = '/login';
      return;
    }
    const role = (user.role || '').toLowerCase();
    const userType = (user.userType || '').toLowerCase();
    const isPMOrAdmin = 
      role.includes('admin') || 
      userType.includes('admin') || 
      role.includes('manager') || 
      userType.includes('manager') || 
      user.username === 'projectmanager' || 
      user.name === 'Saurabh M.';

    if (!isPMOrAdmin) {
      if (role.includes('client') || userType.includes('client')) {
        window.location.href = '/client';
      } else {
        window.location.href = '/staff';
      }
    }
  }, [user]);

  if (!user || !user.username) return null;

  const [db, setDb] = useState(() => SEED);
  const [subTab, setSubTab] = useState("projects");
  const [selProjectId, setSelProjectId] = useState(null);
  const [selUserId, setSelUserId] = useState(null);
  const [selClientId, setSelClientId] = useState(null);
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const currentUser = user.name;

  useEffect(() => {
    let live = true;
    (async () => {
      const d = await loadDB();
      if (!live) return;
      if (d) {
        setDb(d);
        setSelProjectId(d.projects[0]?.id || null);
        setSelUserId(d.users[0]?.id || null);
        setSelClientId(d.clients[0]?.id || null);
      } else {
        const seed = JSON.parse(JSON.stringify(SEED));
        await saveDB(seed);
        if (live) {
          setDb(seed);
          setSelProjectId(seed.projects[0]?.id || null);
          setSelUserId(seed.users[0]?.id || null);
          setSelClientId(seed.clients[0]?.id || null);
        }
      }
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

  const setList = (key, arr) =>
    commit(
      (d) => ({
        ...d,
        settings: {
          ...(d.settings || SEED.settings),
          [key]: arr
        }
      }),
      `Updated settings category "${key}"`
    );

  const resetDB = () =>
    commit(
      () => JSON.parse(JSON.stringify(SEED)),
      "Reset database to seed"
    );

  if (!db) {
    return (
      <div className="wrap">
        <div className="splash">Loading Admin Portal…</div>
      </div>
    );
  }

  const S = db.settings;

  const addProject = (p) =>
    commit(
      (d) => ({
        ...d,
        projects: [
          {
            ...p,
            id: uid("p"),
            progress: Number(p.progress) || 0,
            approvalStatus: p.approvalStatus || "Required",
            docNumbers: p.docNumbers || []
          },
          ...d.projects
        ]
      }),
      `Created project '${p.name}' (via Admin Portal)`
    );

  const updateProject = (p) =>
    commit(
      (d) => ({
        ...d,
        projects: d.projects.map(proj => (String(proj.id) === String(p.id) || String(proj.uuid) === String(p.id)) ? { ...proj, ...p } : proj)
      }),
      `Updated project '${p.name}' (via Admin Portal)`
    );

  const addTask = (t) => {
    commit(
      (d) => ({
        ...d,
        tasks: [...d.tasks, { ...t, id: uid("t"), percent: Number(t.percent) || 0 }]
      }),
      `Added task '${t.title}' (via Admin Portal)`
    );
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
        setSelClientId(data.client.id || data.client.uuid);
      }
      return data.client;
    } catch (e) {
      console.error('Create client error', e);
      alert('Unexpected error while saving client to database');
      return null;
    }
  };

  const addUser = async (u) => {
    try {
      const resp = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u)
      });
      if (!resp.ok) {
        const err = await resp.json();
        alert('Failed to save teammate: ' + (err.error || 'Unknown error'));
        return;
      }
      const data = await resp.json();
      
      const newU = data.user || { ...u, id: u.uuid || uid("u") };
      const newTm = data.teammate || {
        id: newU.id,
        uuid: newU.uuid || newU.id,
        name: newU.name,
        role: newU.role || "Staff",
        discipline: newU.discipline || "Structure",
        projectId: u.projectId,
        assignedProject: u.projectId,
        taskName: u.taskName || u.initialTask || "General Engineering Task",
        email: newU.email,
        phone: newU.phone
      };
      const newT = data.task || {
        id: uid("t"),
        uuid: uid("t"),
        projectId: u.projectId,
        discipline: newU.discipline || "Structure",
        title: u.taskName || u.initialTask || "General Engineering Task",
        assignee: newU.id,
        start: new Date().toISOString().slice(0, 10),
        target: "2026-12-31",
        status: "In Progress",
        percent: 0
      };

      commit((d) => {
        const usersList = (d.users || []).filter(usr => String(usr.id) !== String(newU.id) && String(usr.uuid) !== String(newU.id));
        const tmList = (d.teammates || []).filter(tm => String(tm.id) !== String(newTm.id) && String(tm.uuid) !== String(newTm.id));
        const taskList = (d.tasks || []).filter(t => String(t.id) !== String(newT.id) && String(t.uuid) !== String(newT.id));

        return {
          ...d,
          users: [newU, ...usersList],
          teammates: [newTm, ...tmList],
          tasks: [newT, ...taskList]
        };
      }, `Added team member '${u.name}' (via Admin Portal)`);

      await refresh();
      if (u.projectId) {
        setSelTeamId(u.projectId);
      }

      if (newU.email) {
        fetch('/api/send-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newU.name,
            email: newU.email,
            username: newU.username,
            password: newU.password || 'Welcome_2026@',
            role: newU.role || newU.userType || 'Staff'
          })
        }).catch(err => console.error("Failed to send credentials email:", err));
      }
    } catch (e) {
      console.error("Create user error:", e);
      alert("Unexpected error while saving teammate");
    }
  };

  const updateUser = (u) =>
    commit((d) => ({ ...d, users: d.users.map(usr => usr.id === u.id ? u : usr) }), `Updated team member '${u.name}' (via Admin Portal)`);



  const updateClient = (c) => {
    const pmUser = db.users.find(u => String(u.id) === String(c.projectManagerId) || String(u.uuid) === String(c.projectManagerId));
    const pmName = pmUser ? pmUser.name : "Project Manager";
    const notification = {
      id: uid("h"),
      user: "System",
      action: `🔔 Re-assigned ${pmName} as Project Manager for Client '${c.name}'`,
      at: new Date().toISOString().slice(0, 16).replace("T", " ")
    };
    commit((d) => ({
      ...d,
      clients: (d.clients || []).map(cl => (cl.id === c.id || cl.uuid === c.id || cl.id === c.uuid) ? { ...cl, ...c } : cl),
      history: [notification, ...(d.history || [])].slice(0, 100)
    }), `Updated client '${c.name}' and assigned PM ${pmName}`);
  };

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
        }), `Deleted client '${cl.name}' (via Admin Portal)`);

        await refresh();
        if (selClientId === cl.id || selClientId === cl.uuid) {
          setSelClientId(null);
        }
      } catch (e) {
        console.error("Delete client error:", e);
        alert("Unexpected error during client deletion");
      }
    }
  };

  const addInvoice = (inv) =>
    commit(
      (d) => ({
        ...d,
        invoices: [...(d.invoices || []), { ...inv, id: uid("inv") }]
      }),
      `Added invoice ${inv.invoiceNo} (via Admin Portal)`
    );

  const ctx = {
    db,
    commit,
    S,
    addProject,
    updateProject,
    addTask,
    addUser,
    updateUser,
    addClient,
    updateClient,
    deleteClient,
    addInvoice,
    setModal
  };

  const displayAdminUser = {
    name: "Admin",
    role: "System Administrator"
  };

  return (
    <div className="wrap">
      <div className="app">
        {/* Sidebar matching Dashboard design */}
        <aside className="side">
          <div>
            <div className="brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="logo">⬡</div>
                <div>
                  <div className="t1 disp">DGEC</div>
                  <div className="t2">Admin Portal</div>
                </div>
              </div>
              <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? "✕" : "☰"}
              </button>
            </div>
            
            <div className={menuOpen ? "side-nav-mobile-visible" : "side-nav-mobile-hidden"}>
              <nav className="nav">
                {[
                  ["projects", "Projects Admin", <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="1.5" y1="22" x2="22.5" y2="22" /><path d="M2.5 22V8.5L10 5.5v16.5" /><path d="M10 22V2h11.5v20" /><line x1="12.5" y1="5" x2="19" y2="5" /><rect x="12.5" y="8" width="2.2" height="2.2" /><rect x="16.8" y="8" width="2.2" height="2.2" /><rect x="16.8" y="12.5" width="2.2" height="2.2" /><rect x="16.8" y="17" width="2.2" height="2.2" /><path d="M4.5 22v-6l4.5-3.8 4.5 3.8v6" /><rect x="7.5" y="14.5" width="3" height="2.5" /></svg>],
                  ["users", "Teammates Admin", <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" /><line x1="12" y1="8" x2="12" y2="12" /><path d="M6 15v-1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></svg>],
                  ["clients", "Clients Admin", <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2.2" /><path d="M8.5 20v-2.5a3.5 3.5 0 0 1 7 0V20" /><circle cx="5" cy="7" r="1.8" /><path d="M1.5 20v-2a3 3 0 0 1 5 0v2" /><circle cx="19" cy="7" r="1.8" /><path d="M17.5 20v-2a3 3 0 0 1 5 0v2" /></svg>],
                  ["pms", "Project Managers", <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-5-4 5z" /><path d="M5 16h14v3H5z" /></svg>],
                  ["staff_mgmt", "Staff Management", <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2.5M8 3l1 2M16 3l-1 2M4.5 7.5A8 8 0 0 1 19.5 7.5" /><circle cx="12" cy="11" r="2.2" /><path d="M8 21.5v-3a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v3" /><circle cx="5.5" cy="13" r="1.8" /><path d="M1 21.5v-2a3 3 0 0 1 3-3h2.5" /><circle cx="18.5" cy="13" r="1.8" /><path d="M17.5 16.5H20a3 3 0 0 1 3 3v2" /></svg>],
                  ["settings", "Settings", <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>]
                ].map(([k, l, ic]) => (
                  <button key={k} className={subTab === k ? "on" : ""} onClick={() => { setSubTab(k); setMenuOpen(false); }}>
                    <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>{ic}</span>
                    {l}
                  </button>
                ))}
              </nav>
            </div>
          </div>
          
          <div className={menuOpen ? "side-nav-mobile-visible" : "side-nav-mobile-hidden"}>
            <div style={{ padding: "10px 10px 14px", borderTop: "1px solid var(--line2)", marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Avatar name={displayAdminUser.name} size={36} />
                <div style={{ overflow: "hidden" }}>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{displayAdminUser.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 10.5 }}>{displayAdminUser.role}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
          </div>
        </aside>

        {/* Main Content Area matching Dashboard styling */}
        <main className="main">
          <div className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              {(subTab !== "projects" || selProjectId) && (
                <button
                  className="btn sec sm"
                  onClick={() => {
                    if (selProjectId) {
                      setSelProjectId(null);
                    } else if (subTab !== "projects") {
                      setSubTab("projects");
                    } else if (window.history.length > 1) {
                      window.history.back();
                    }
                  }}
                  style={{ padding: "6px 12px", borderRadius: 8, fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", background: "#fff", border: "1px solid var(--line)" }}
                >
                  ← Back
                </button>
              )}
              <div>
                <h1 className="disp" style={{ margin: 0 }}>
                  {subTab === "projects"
                    ? "Projects Administration"
                    : subTab === "users"
                    ? "Teammates Administration"
                    : subTab === "clients"
                    ? "Clients Administration"
                    : subTab === "pms"
                    ? "Project Managers Full Data & Portfolio"
                    : subTab === "company_staff"
                    ? "Company Staff Portal & Performance Matrix"
                    : subTab === "staff_mgmt"
                    ? "Staff Management"
                    : "System Settings & Configuration"}
                </h1>
                <p style={{ margin: "2px 0 0 0" }}>System configuration, project setup, staff records, and user assignment portal.</p>
              </div>
            </div>
            <button className="pill" onClick={refresh}>
              ↻ Refresh shared data
            </button>
          </div>
          <div className="content">
            {subTab === "company_staff" || subTab === "pm_staff_portal" ? (
              <AdminStaffPortal db={db} commit={commit} onOpenProject={(projectId) => { setSelProjectId(projectId); setSubTab("projects"); }} />
            ) : subTab === "pms" ? (
              <ProjectManagersFullData db={db} commit={commit} updateUser={updateUser} onOpenProject={(projectId) => { setSelProjectId(projectId); setSubTab("projects"); }} />
            ) : subTab === "staff_mgmt" || subTab === "staff" ? (
              <StaffManagement isAdmin={true} db={db} commit={commit} updateUser={updateUser} onOpenProject={(projectId) => { setSelProjectId(projectId); setSubTab("projects"); }} />
            ) : subTab === "settings" ? (
              <Settings db={db} setList={setList} resetDB={resetDB} onNavigate={(key) => setSubTab(key)} loggedInUser={user} isAdmin={true} />
            ) : (
              <Admin
                db={db}
                setModal={setModal}
                subTab={subTab}
                setSubTab={setSubTab}
                selProjectId={selProjectId}
                setSelProjectId={setSelProjectId}
                selUserId={selUserId}
                setSelUserId={setSelUserId}
                selClientId={selClientId}
                setSelClientId={setSelClientId}
                updateUser={updateUser}
                updateProject={updateProject}
                addClient={addClient}
                updateClient={updateClient}
                deleteClient={deleteClient}
              />
            )}
          </div>
        </main>

        {/* Overlay Modals */}
        {modal && <Modals modal={modal} close={() => setModal(null)} {...ctx} />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AdminApp />
    </ErrorBoundary>
  </React.StrictMode>
);
