import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { SEED } from './data/seed';
import { loadDB, saveDB } from './utils/storage';
import { uid, statusColor, barColor, fmt } from './utils/helpers';
import Avatar from './components/Avatar';
import Tag from './components/Tag';
import Bar from './components/Bar';
import './index.css';

function ClientPortal() {
  const [sessionUser] = useState(() => {
    try {
      const stored = localStorage.getItem('dgec_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (!sessionUser || !sessionUser.username) {
      localStorage.removeItem('dgec_user');
      window.location.href = '/login';
      return;
    }
    const role = (sessionUser.role || '').toLowerCase();
    const userType = (sessionUser.userType || '').toLowerCase();

    if (role !== 'client' && !role.includes('client') && userType !== 'client' && role !== 'admin' && userType !== 'admin') {
      if (role.includes('manager') || userType.includes('manager') || sessionUser.username === 'projectmanager' || sessionUser.name === 'Saurabh M.') {
        window.location.href = '/';
      } else if (role === 'staff' || userType === 'staff') {
        window.location.href = '/staff';
      }
    }
  }, [sessionUser]);

  if (!sessionUser || !sessionUser.username) return null;

  const [db, setDb] = useState(null);
  const [selProjectId, setSelProjectId] = useState(null);
  const [chatText, setChatText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  
  const chatEndRef = useRef(null);

  // Sync DB states across open tabs
  useEffect(() => {
    let live = true;
    (async () => {
      const d = await loadDB();
      if (!live) return;
      if (d && d.projects && d.projects.length > 0) {
        setDb(d);
      } else {
        const seed = JSON.parse(JSON.stringify(SEED));
        await saveDB(seed);
        if (live) {
          setDb(seed);
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

  // Helper to find client object matching session
  const getClientForSession = () => {
    if (!db || !db.clients || db.clients.length === 0) return null;
    const found = db.clients.find(c => 
      (sessionUser.clientId && (String(c.id) === String(sessionUser.clientId) || String(c.uuid) === String(sessionUser.clientId))) ||
      (sessionUser.username && c.username && c.username.toLowerCase() === sessionUser.username.toLowerCase()) ||
      (sessionUser.email && c.email && c.email.toLowerCase() === sessionUser.email.toLowerCase()) ||
      (sessionUser.name && c.name && c.name.toLowerCase() === sessionUser.name.toLowerCase()) ||
      (sessionUser.contactName && c.contactName && c.contactName.toLowerCase() === sessionUser.contactName.toLowerCase())
    );
    if (found) return found;
    // If admin is logged in to view client portal, allow fallback to first client
    if (sessionUser.role?.toLowerCase() === 'admin' || sessionUser.userType?.toLowerCase() === 'admin') {
      return db.clients[0] || null;
    }
    return null;
  };

  const client = getClientForSession();

  // Helper to get all committed projects for this client strictly
  const getClientProjects = () => {
    if (!db || !db.projects) return [];
    if (!client) {
      // If admin, show all projects
      if (sessionUser.role?.toLowerCase() === 'admin' || sessionUser.userType?.toLowerCase() === 'admin') {
        return db.projects;
      }
      return [];
    }

    // Match all client IDs / UUIDs belonging to the logged-in client account
    const matchingClientIds = db.clients
      .filter(c => 
        String(c.id) === String(client.id) || 
        String(c.uuid) === String(client.uuid) ||
        (c.name && client.name && c.name.toLowerCase() === client.name.toLowerCase()) ||
        (c.email && client.email && c.email.toLowerCase() === client.email.toLowerCase())
      )
      .flatMap(c => [String(c.id), String(c.uuid)]);

    return db.projects.filter(p => {
      const pCid = String(p.clientId !== undefined ? p.clientId : p.client_id);
      const matchId = matchingClientIds.includes(pCid);
      const matchClientName = (p.clientName && client.name && p.clientName.toLowerCase() === client.name.toLowerCase()) ||
                              (p.clientId && String(p.clientId).toLowerCase() === client.name.toLowerCase());
      return matchId || matchClientName;
    });
  };

  const clientProjects = getClientProjects();

  // Auto-select first project when client or clientProjects change
  useEffect(() => {
    if (clientProjects.length > 0) {
      if (!selProjectId || !clientProjects.some(p => p.id === selProjectId)) {
        setSelProjectId(clientProjects[0].id);
      }
    }
  }, [clientProjects.length]);

  // Scroll chat to bottom whenever selected project comments update
  const selectedProj = db?.projects?.find(p => p.id === selProjectId) || clientProjects[0];
  useEffect(() => {
    if (selectedProj && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedProj?.comments, selProjectId]);

  if (!db) {
    return (
      <div className="wrap">
        <div className="splash">Loading Client Portal…</div>
      </div>
    );
  }

  // Helper to find Project Manager details for a given project ID (Saurabh M.)
  const getProjectManager = (projId) => {
    if (!db || !db.users) return { name: "Saurabh M.", role: "Project Manager - MEP", discipline: "MEP", phone: "+968 9412 8899", email: "pm@dgec.com" };
    const pmUser = db.users.find(u => u.name === "Saurabh M." || (u.role && u.role.toLowerCase().includes("project manager")));
    return pmUser || { name: "Saurabh M.", role: "Project Manager - MEP", discipline: "MEP", phone: "+968 9412 8899", email: "pm@dgec.com" };
  };

  // Helper to get assigned engineering teammates for a project
  const getProjectTeam = (projId) => {
    if (!db) return [];
    const proj = (db.projects || []).find(p => 
      String(p.id) === String(projId) || 
      String(p.uuid) === String(projId) || 
      (p.name && String(p.name).toLowerCase() === String(projId).toLowerCase())
    );
    const projIdMatches = [
      String(projId).toLowerCase(),
      proj ? String(proj.id).toLowerCase() : null,
      proj ? String(proj.uuid).toLowerCase() : null,
      proj ? String(proj.db_id).toLowerCase() : null,
      proj ? String(proj.name).toLowerCase() : null
    ].filter(Boolean);

    const projTasks = (db.tasks || []).filter(t => t.projectId && projIdMatches.includes(String(t.projectId).toLowerCase()));
    const taskAssignees = Array.from(new Set(projTasks.map(t => String(t.assignee)).filter(Boolean)));
    
    // Also include entries from db.teammates array for this project
    const teammatesList = (db.teammates || []).filter(tm => 
      tm.projectId && projIdMatches.includes(String(tm.projectId).toLowerCase())
    );

    const isEngineeringStaff = (u) => 
      u.name !== "Saurabh M." &&
      u.name !== "Project Manager" &&
      u.username !== "projectmanager" &&
      !u.role?.toLowerCase().includes("project manager") &&
      !u.userType?.toLowerCase().includes("project manager") &&
      !u.role?.toLowerCase().includes("admin") &&
      !u.userType?.toLowerCase().includes("admin") &&
      !u.role?.toLowerCase().includes("client") &&
      !u.userType?.toLowerCase().includes("client");

    const matchedUsers = (db.users || []).filter(u => {
      if (!isEngineeringStaff(u)) return false;
      const isAssignedByTask = taskAssignees.includes(String(u.id)) || taskAssignees.includes(String(u.uuid)) || (u.name && projTasks.some(t => String(t.assignee).toLowerCase() === u.name.toLowerCase()));
      const isTeammateTableMatch = teammatesList.some(tm => String(tm.id) === String(u.id) || String(tm.uuid) === String(u.id) || (tm.name && u.name && tm.name.toLowerCase() === u.name.toLowerCase()));

      return isAssignedByTask || isTeammateTableMatch;
    });

    const result = [...matchedUsers];
    teammatesList.forEach(tm => {
      if (!result.some(r => String(r.id) === String(tm.id) || String(r.uuid) === String(tm.id) || (r.name && tm.name && r.name.toLowerCase() === tm.name.toLowerCase()))) {
        result.push(tm);
      }
    });

    return result;
  };

  // Helper to resolve teammate assigned to a task
  const getTaskAssignee = (task) => {
    if (!task || !db || !db.users) return null;
    const user = db.users.find(u => 
      String(u.id) === String(task.assignee) || 
      String(u.uuid) === String(task.assignee) ||
      (u.name && task.assignee && u.name.toLowerCase() === String(task.assignee).toLowerCase())
    );
    if (user) return user;
    // Fallback by discipline or engineering staff
    if (task.discipline) {
      const discMatch = db.users.find(u => u.discipline && u.discipline.toLowerCase() === task.discipline.toLowerCase());
      if (discMatch) return discMatch;
    }
    return db.users.find(u => !u.role?.toLowerCase().includes("admin") && !u.role?.toLowerCase().includes("client")) || db.users[1];
  };

  // Safe contact number & email helper
  const getPhone = (user) => {
    if (!user) return "+968 9412 4455";
    if (user.phone) return user.phone;
    const strId = String(user.id || user.uuid || "1");
    return `+968 941${strId.slice(-2)} 4455`;
  };

  const getEmail = (user) => {
    if (!user) return "info@dgec.com";
    if (user.email) return user.email;
    const rawName = user.username || user.name || "user";
    const namePart = String(rawName).toLowerCase().replace(/[^a-z0-9]/g, ".");
    return `${namePart}@dgec.com`;
  };

  const postChatMessage = (e) => {
    e.preventDefault();
    if (!chatText.trim() || !selectedProj) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const senderName = client ? client.name : sessionUser.name;

    const newComment = {
      id: uid("c"),
      user: `${senderName} Representative`,
      text: chatText.trim(),
      at: timestamp
    };

    const nextDb = {
      ...db,
      projects: db.projects.map(p =>
        p.id === selectedProj.id
          ? { ...p, comments: [...(p.comments || []), newComment] }
          : p
      ),
      history: [
        { id: uid("h"), user: senderName, action: `Sent message in project discussion for '${selectedProj.name}'`, at: fullTimestamp },
        ...(db.history || [])
      ].slice(0, 100)
    };

    setDb(nextDb);
    saveDB(nextDb);
    setChatText("");
  };

  const currentPM = selectedProj ? getProjectManager(selectedProj.id) : null;
  const projectTeam = selectedProj ? getProjectTeam(selectedProj.id) : [];
  const projectTasks = selectedProj ? db.tasks.filter(t => t.projectId === selectedProj.id) : [];

  return (
    <div className="wrap">
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&display=swap');"}</style>
      <div className="app">
        {/* Sidebar */}
        <aside className="side">
          <div>
            <div className="brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="logo" style={{ background: "var(--accent)" }}>⬡</div>
                <div>
                  <div className="t1 disp">Client Portal</div>
                  <div className="t2">Engineering Control</div>
                </div>
              </div>
              <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? "✕" : "☰"}
              </button>
            </div>

            <div className={menuOpen ? "side-nav-mobile-visible" : "side-nav-mobile-hidden"}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={sessionUser.name} size={36} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "#fff" }}>{sessionUser.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 10.5 }}>{client?.name || "Client Representative"}</div>
                  </div>
                </div>
              </div>

              <div className="muted" style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", padding: "14px 14px 4px" }}>
                Committed Projects ({clientProjects.length})
              </div>
              <nav className="nav" style={{ maxHeight: "45vh", overflowY: "auto" }}>
                {clientProjects.map(p => (
                  <button key={p.id} className={selectedProj?.id === p.id ? "on" : ""} onClick={() => { setSelProjectId(p.id); setMenuOpen(false); }}>
                    <span>▦</span> {p.name}
                  </button>
                ))}
                {clientProjects.length === 0 && (
                  <div className="muted" style={{ padding: 14, fontSize: 12.5 }}>No active projects assigned.</div>
                )}
              </nav>
            </div>
          </div>
          
          <div className={menuOpen ? "side-nav-mobile-visible" : "side-nav-mobile-hidden"}>
            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line2)", marginTop: 12 }}>
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

        {/* Main Content Pane */}
        {selectedProj ? (
          <main className="main">
            {/* Topbar */}
            <div className="topbar">
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      localStorage.removeItem('dgec_user');
                      window.location.href = '/login';
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
                <div>
                  <h1 className="disp" style={{ margin: 0 }}>{selectedProj.name}</h1>
                  <p style={{ margin: "2px 0 0 0" }}>Project Progress, Status, Team Contacts, and Discussion Feed.</p>
                </div>
              </div>
              <Tag label={selectedProj.status} color={statusColor(selectedProj.status, db.settings?.projectStatuses)} />
            </div>

            {/* Content Layout Grid */}
            <div className="content client-grid">
              
              {/* Left Pane - Progress details & Team Contacts */}
              <div className="card" style={{ padding: 24, background: "#fff", display: "flex", flexDirection: "column", gap: 22, height: "100%", overflowY: "auto", boxSizing: "border-box" }}>
                <div>
                  <div className="h3 disp" style={{ margin: 0, fontSize: 17 }}>Project Control Overview</div>
                  <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{selectedProj.desc || "No description provided."}</p>
                </div>

                {/* Progress Circle / Bar */}
                <div style={{ padding: 16, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, marginBottom: 8 }}>
                    <span>Project Progress</span>
                    <span style={{ color: "var(--ink)", fontWeight: 700 }}>{selectedProj.progress}%</span>
                  </div>
                  <Bar value={selectedProj.progress} color={barColor(selectedProj.progress)} />
                </div>

                {/* Details list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
                    <span className="muted">Service Category:</span>
                    <span style={{ fontWeight: 600 }}>{selectedProj.category || "Full Engineering"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
                    <span className="muted">Start Date:</span>
                    <span style={{ fontWeight: 600 }}>{fmt(selectedProj.start)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
                    <span className="muted">Target Completion:</span>
                    <span style={{ fontWeight: 600 }}>{fmt(selectedProj.end)}</span>
                  </div>
                </div>

                {/* 👔 PROJECT MANAGER DETAILS & CONTACT CARD */}
                {currentPM && (
                  <div style={{ padding: 16, background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 14, border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>👔</span> Your Project Manager (Direct Contact)
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={currentPM.name} size={44} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 15 }}>{currentPM.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                          {currentPM.role} · <span style={{ color: "var(--accent2)", fontWeight: 600 }}>{currentPM.discipline || "MEP"}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6, fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: "var(--accent)" }}>📞 {getPhone(currentPM)}</span>
                          <span className="muted">✉ {getEmail(currentPM)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 👥 TEAMMATES INVOLVED & CONTACT NUMBERS */}
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>👥</span> Engineering Team & Teammates ({projectTeam.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {projectTeam.map((teammate) => {
                      const mateTasks = projectTasks.filter(t => String(t.assignee) === String(teammate.id) || String(t.assignee) === String(teammate.uuid));
                      return (
                        <div
                          key={teammate.id}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid var(--line)",
                            background: "var(--surface)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 10
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar name={teammate.name} size={36} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{teammate.name}</div>
                              <div className="muted" style={{ fontSize: 11.5 }}>
                                {teammate.role} · <span style={{ color: "var(--accent2)", fontWeight: 600 }}>{teammate.discipline || "Engineering"}</span>
                              </div>
                              <div style={{ fontSize: 11, marginTop: 2, color: "var(--ink)", fontWeight: 600 }}>
                                📞 Contact: <span style={{ color: "var(--accent)" }}>{getPhone(teammate)}</span>
                              </div>
                            </div>
                          </div>
                          <span className="pill" style={{ fontSize: 10.5, background: "#fff" }}>
                            {mateTasks.length} task{mateTasks.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      );
                    })}
                    {projectTeam.length === 0 && (
                      <div style={{ padding: "16px 14px", borderRadius: 10, border: "1px dashed var(--line)", background: "var(--surface)", color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
                        No engineering teammates assigned to this project yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* 📋 TEAMMATES' TASKS & PROGRESS BREAKDOWN */}
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>📋</span> Teammates' Task Progress Breakdown ({projectTasks.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {projectTasks.map((t) => {
                      const assignee = getTaskAssignee(t);
                      return (
                        <div
                          key={t.id}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            border: "1px solid var(--line)",
                            background: "#fff",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{t.title}</div>
                              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                                Assigned Teammate: <strong>{assignee ? assignee.name : "Unassigned"}</strong> {assignee ? `(📞 ${getPhone(assignee)})` : ""}
                              </div>
                            </div>
                            <Tag label={t.status} color={statusColor(t.status, db.settings?.taskStatuses)} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginTop: 2 }}>
                            <span className="muted">Due: {fmt(t.target)}</span>
                            <span style={{ fontWeight: 700, color: "var(--ink)" }}>{t.percent}%</span>
                          </div>
                          <Bar value={t.percent} color={barColor(t.percent)} />
                        </div>
                      );
                    })}
                    {projectTasks.length === 0 && (
                      <div className="empty" style={{ padding: 16, fontSize: 12.5 }}>
                        No specific task breakdown recorded for this project yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Pane - Chat discussion box */}
              <div className="card" style={{ padding: 20, background: "#fff", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
                <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 14 }}>
                  <div className="h3 disp" style={{ margin: 0, fontSize: 16 }}>Discussion Feed</div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>Direct communication channel with your Project Manager.</p>
                </div>

                {/* Messages scrollable area */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 6, marginBottom: 16 }}>
                  {selectedProj.comments && selectedProj.comments.map(c => {
                    const isClientMsg = c.user.toLowerCase().includes("representative") || (client && c.user === client.name);
                    return (
                      <div
                        key={c.id}
                        style={{
                          alignSelf: isClientMsg ? "flex-end" : "flex-start",
                          maxWidth: "85%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isClientMsg ? "flex-end" : "flex-start"
                        }}
                      >
                        <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3, fontWeight: 500 }}>
                          {isClientMsg ? "You" : c.user}
                        </div>
                        <div
                          style={{
                            background: isClientMsg ? "var(--accent)" : "var(--surface)",
                            color: isClientMsg ? "#fff" : "var(--ink)",
                            padding: "10px 14px",
                            borderRadius: isClientMsg ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                            fontSize: 13,
                            lineHeight: 1.45,
                            border: isClientMsg ? "none" : "1px solid var(--line)"
                          }}
                        >
                          {c.text}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>
                          {c.at}
                        </div>
                      </div>
                    );
                  })}
                  {(!selectedProj.comments || selectedProj.comments.length === 0) && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)", padding: 40, textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Start a discussion</div>
                      <p style={{ fontSize: 11.5, marginTop: 4 }}>Ask a question or request updates on this project.</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input footer form */}
                <form onSubmit={postChatMessage} style={{ display: "flex", gap: 10, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <input
                    type="text"
                    className="inp"
                    placeholder="Type a message to Project Manager..."
                    value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button type="submit" className="btn" style={{ padding: "8px 18px" }}>
                    Send
                  </button>
                </form>
              </div>

            </div>
          </main>
        ) : (
          <main className="main">
            <div className="card empty">No projects found.</div>
          </main>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClientPortal />
  </React.StrictMode>
);
