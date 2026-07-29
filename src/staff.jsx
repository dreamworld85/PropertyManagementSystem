import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { SEED } from './data/seed';
import { loadDB, saveDB } from './utils/storage';
import { uid, statusColor, barColor, fmt } from './utils/helpers';
import Avatar from './components/Avatar';
import Tag from './components/Tag';
import Bar from './components/Bar';
import './index.css';

function StaffPortal() {
  const storedUser = localStorage.getItem('dgec_user');
  let sessionUser = null;
  
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed && parsed.username) {
        sessionUser = parsed;
      }
    } catch (e) {}
  }

  const [db, setDb] = useState(null);
  const [tab, setTab] = useState("overview"); // overview, tasks, profile
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState("Not Started");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (sessionUser) {
      const role = (sessionUser.role || '').toLowerCase();
      const userType = (sessionUser.userType || sessionUser.user_type || '').toLowerCase();
      if (role === 'client' || role.includes('client') || userType === 'client') {
        window.location.href = '/client';
        return;
      }
    }
  }, [sessionUser]);

  // Sync DB states across open tabs
  useEffect(() => {
    let live = true;
    (async () => {
      const d = await loadDB();
      if (!live) return;
      if (d && d.users && d.users.length > 0) {
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

  // Filter staff members only (exclude Admin & PMs for Staff Portal)
  const staffMembers = db?.users?.filter(u => 
    !u.role?.toLowerCase().includes("admin") && 
    !u.role?.toLowerCase().includes("project manager") &&
    !u.userType?.toLowerCase().includes("admin") &&
    !u.userType?.toLowerCase().includes("project manager")
  ) || [];

  // Default John Doe user fallback
  const johnUser = staffMembers.find(u => u.name === "John Doe" || u.username === "john" || u.id === "u7") || staffMembers[0] || {
    id: "u7",
    name: "John Doe",
    username: "john",
    password: "Welcome_2026@",
    role: "Senior Structural Engineer",
    discipline: "Structure",
    userType: "staff",
    email: "john.doe@dgec.com",
    phone: "+968 9876 5432"
  };

  // Find active staff member (forcing staff role only)
  let activeStaff = null;
  if (db && sessionUser && sessionUser.username) {
    const matched = db.users.find(u => 
      String(u.id) === String(sessionUser.id) || 
      String(u.uuid) === String(sessionUser.id) || 
      u.username === sessionUser.username
    );
    if (matched && !matched.role?.toLowerCase().includes("admin") && !matched.role?.toLowerCase().includes("project manager")) {
      activeStaff = matched;
    }
  }

  const user = activeStaff || johnUser;

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [profilePassword, setProfilePassword] = useState("");

  useEffect(() => {
    if (user) {
      setProfileEmail(user.email || "john.doe@dgec.com");
      setProfilePhone(user.phone || "+968 9876 5432");
      setProfileUsername(user.username || "john");
      setProfilePassword(user.password || "Welcome_2026@");
    }
  }, [user?.id]);

  if (!db) {
    return (
      <div className="wrap">
        <div className="splash">Loading Staff Portal…</div>
      </div>
    );
  }

  // Filter tasks for the active staff member
  const userTasks = db.tasks.filter(t => 
    String(t.assignee) === String(user.id) || 
    String(t.assignee) === String(user.uuid) || 
    (user.name === "John Doe" && (t.assignee === "u7" || t.assignee === "7"))
  );

  // Find assigned projects for active staff member
  const userProjIds = Array.from(new Set(userTasks.map(t => t.projectId)));
  const userProjects = db.projects.filter(p => userProjIds.includes(p.id) || (user.name === "John Doe" && (p.name.includes("GENOME") || p.name.includes("BEC") || p.name.includes("OQEP") || p.name.includes("SANVIRA"))));

  // Helper to find Project Manager details for a given project ID
  const getProjectManager = (projId) => {
    const projTasks = db.tasks.filter(t => t.projectId === projId);
    for (const t of projTasks) {
      const u = db.users.find(usr => usr.id === t.assignee);
      if (u && u.role && u.role.toLowerCase().includes("project manager")) {
        return u;
      }
    }
    const fallbackPM = db.users.find(u => u.role && u.role.toLowerCase().includes("project manager"));
    return fallbackPM || { name: "Saurabh M.", role: "Project Manager", discipline: "MEP", phone: "+968 9412 8899", email: "pm@dgec.com" };
  };

  // Helper to get colleagues/teammates working on the same project
  const getTeammates = (projId) => {
    const projTasks = db.tasks.filter(t => t.projectId === projId);
    const teammateIds = Array.from(new Set(projTasks.map(t => t.assignee).filter(Boolean)));
    const teamMembers = db.users.filter(u => teammateIds.includes(u.id) && u.id !== user.id && !u.role?.toLowerCase().includes("admin") && !u.role?.toLowerCase().includes("client"));
    if (teamMembers.length > 0) return teamMembers;
    return db.users.filter(u => u.id !== user.id && !u.role?.toLowerCase().includes("admin") && !u.role?.toLowerCase().includes("client")).slice(0, 3);
  };

  // Contact number & email helper
  const getPhone = (usr) => {
    if (!usr) return "+968 9412 4455";
    if (usr.phone) return usr.phone;
    const strId = String(usr.id || usr.uuid || "1");
    return `+968 941${strId.slice(-2)} 4455`;
  };

  const getEmail = (usr) => {
    if (!usr) return "info@dgec.com";
    if (usr.email) return usr.email;
    const rawName = usr.username || usr.name || "user";
    const namePart = String(rawName).toLowerCase().replace(/[^a-z0-9]/g, ".");
    return `${namePart}@dgec.com`;
  };

  const startEditProgress = (task) => {
    setEditingTaskId(task.id);
    setEditProgress(task.percent || 0);
    setEditStatus(task.status || "Not Started");
  };

  const handleUpdateProgress = (e) => {
    e.preventDefault();
    if (!editingTaskId) return;

    const targetTask = db.tasks.find(t => t.id === editingTaskId);
    if (!targetTask) return;

    const nextTasks = db.tasks.map(t =>
      t.id === editingTaskId ? { ...t, percent: parseInt(editProgress), status: editStatus } : t
    );

    // Calculate parent project progress
    const projId = targetTask.projectId;
    const projTasks = nextTasks.filter(t => t.projectId === projId);
    const avgProgress = projTasks.length > 0
      ? Math.round(projTasks.reduce((sum, t) => sum + (t.percent || 0), 0) / projTasks.length)
      : 0;

    const nextProjects = db.projects.map(p =>
      p.id === projId ? { ...p, progress: avgProgress } : p
    );

    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const nextDb = {
      ...db,
      tasks: nextTasks,
      projects: nextProjects,
      history: [
        { id: uid("h"), user: user.name, action: `Updated progress of '${targetTask.title}' to ${editProgress}% (${editStatus})`, at: timestamp },
        ...(db.history || [])
      ].slice(0, 100)
    };

    setDb(nextDb);
    saveDB(nextDb);
    setEditingTaskId(null);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const nextUsers = db.users.map(u =>
      u.id === user.id
        ? {
            ...u,
            email: profileEmail.trim(),
            phone: profilePhone.trim(),
            username: profileUsername.trim(),
            password: profilePassword.trim()
          }
        : u
    );

    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const nextDb = {
      ...db,
      users: nextUsers,
      history: [
        { id: uid("h"), user: user.name, action: `Updated personal profile details`, at: timestamp },
        ...(db.history || [])
      ].slice(0, 100)
    };

    setDb(nextDb);
    saveDB(nextDb);
    setIsEditingProfile(false);
  };

  // Dashboard Stats calculations for Staff Member
  const totalTasksCount = userTasks.length;
  const completedTasksCount = userTasks.filter(t => t.status === "Done" || t.percent === 100).length;
  const inProgressTasksCount = userTasks.filter(t => t.status === "In Progress" || (t.percent > 0 && t.percent < 100)).length;
  const avgTaskCompletion = totalTasksCount > 0
    ? Math.round(userTasks.reduce((sum, t) => sum + (t.percent || 0), 0) / totalTasksCount)
    : 84;

  return (
    <div className="wrap">
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&display=swap');"}</style>
      <div className="app">
        {/* Sidebar */}
        <aside className="side">
          <div>
            <div className="brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="logo" style={{ background: "var(--accent)" }}>🛠️</div>
                <div>
                  <div className="t1 disp">Staff Portal</div>
                  <div className="t2">Employee Workspace</div>
                </div>
              </div>
              <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? "✕" : "☰"}
              </button>
            </div>

            <div className={menuOpen ? "side-nav-mobile-visible" : "side-nav-mobile-hidden"}>
              {/* Staff Member Info */}
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={user.name} size={38} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "#fff" }}>{user.name}</div>
                    <div style={{ color: "var(--accent2)", fontSize: 11, fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{user.role}</div>
                  </div>
                </div>
              </div>

              <nav className="nav">
                <button className={tab === "overview" ? "on" : ""} onClick={() => { setTab("overview"); setMenuOpen(false); }}>
                  <span>▦</span> Overview
                </button>
                <button className={tab === "tasks" ? "on" : ""} onClick={() => { setTab("tasks"); setMenuOpen(false); }}>
                  <span>📋</span> My Tasks ({totalTasksCount})
                </button>
                <button className={tab === "profile" ? "on" : ""} onClick={() => { setTab("profile"); setMenuOpen(false); }}>
                  <span>👤</span> My Profile
                </button>
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

        {/* Main Content */}
        <main className="main">
          
          {/* Overview Tab */}
          {tab === "overview" && (
            <>
              <div className="topbar">
                <div>
                  <h1 className="disp" style={{ margin: 0 }}>
                    Welcome back, {user.name}! <span style={{ fontSize: 15, opacity: 0.7, fontWeight: 500 }}>({user.role})</span>
                  </h1>
                  <p style={{ margin: "3px 0 0 0" }}>
                    Staff Workspace · {user.discipline || "Engineering"} Department
                  </p>
                </div>
                <Tag label={user.discipline || "Structure"} color="var(--green)" />
              </div>

              <div className="content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Stats row */}
                <div className="kpi-row">
                  <div className="card kpi">
                    <div className="l">Total Tasks</div>
                    <div className="v">{totalTasksCount}</div>
                    <div style={{ height: 3, width: 36, borderRadius: 9, background: "var(--accent2)", marginTop: 10 }} />
                  </div>
                  <div className="card kpi">
                    <div className="l">Completed Tasks</div>
                    <div className="v">{completedTasksCount}</div>
                    <div style={{ height: 3, width: 36, borderRadius: 9, background: "var(--green)", marginTop: 10 }} />
                  </div>
                  <div className="card kpi">
                    <div className="l">In Progress</div>
                    <div className="v">{inProgressTasksCount}</div>
                    <div style={{ height: 3, width: 36, borderRadius: 9, background: "var(--amber)", marginTop: 10 }} />
                  </div>
                  <div className="card kpi">
                    <div className="l">Avg. Completion</div>
                    <div className="v">{avgTaskCompletion}%</div>
                    <div style={{ height: 3, width: 36, borderRadius: 9, background: "var(--accent)", marginTop: 10 }} />
                  </div>
                </div>

                {/* 📋 MY ASSIGNED TASKS BREAKDOWN */}
                <div className="card" style={{ padding: 20, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 10, marginBottom: 14 }}>
                    <div>
                      <div className="h3 disp" style={{ margin: 0, fontSize: 16 }}>
                        My Assigned Tasks ({totalTasksCount})
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        Tasks assigned directly to <strong>{user.name}</strong> ({user.role}) — {completedTasksCount} Completed, {inProgressTasksCount} In Progress
                      </div>
                    </div>
                    <button className="btn sm" onClick={() => setTab("tasks")}>Manage Tasks →</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                    {userTasks.map(t => {
                      const proj = db.projects.find(p => p.id === t.projectId);
                      return (
                        <div key={t.id} style={{ padding: 14, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{t.title}</div>
                              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Project: <strong>{proj?.name || "GENOME"}</strong></div>
                            </div>
                            <Tag label={t.status} color={statusColor(t.status)} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginTop: 4 }}>
                            <span className="muted">Due: {fmt(t.target)}</span>
                            <span style={{ fontWeight: 700, color: "var(--ink)" }}>{t.percent}%</span>
                          </div>
                          <Bar value={t.percent} color={barColor(t.percent)} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 👥 ASSIGNED TEAMS, PROJECTS & TEAMMATES */}
                <div className="card" style={{ padding: 20, background: "#fff" }}>
                  <div className="h3 disp" style={{ margin: 0, fontSize: 16, borderBottom: "1px solid var(--line)", paddingBottom: 10, marginBottom: 16 }}>
                    Assigned Teams & Projects ({userProjects.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                    {userProjects.map(p => {
                      const pm = getProjectManager(p.id);
                      const teammates = getTeammates(p.id);
                      const pTasks = userTasks.filter(t => t.projectId === p.id);

                      return (
                        <div key={p.id} style={{ padding: 16, borderRadius: 14, border: "1px solid var(--line)", background: "#fff", display: "flex", flexDirection: "column", gap: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)" }}>{p.name} Team</div>
                              <div className="muted" style={{ fontSize: 11.5 }}>Category: {p.category || "Full Engineering"}</div>
                            </div>
                            <Tag label={p.status} color={statusColor(p.status)} />
                          </div>

                          {/* Project Manager Box */}
                          <div style={{ padding: 12, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--line)" }}>
                            <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 700, marginBottom: 6 }}>
                              👔 Project Manager
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Avatar name={pm.name} size={36} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{pm.name}</div>
                                <div className="muted" style={{ fontSize: 11 }}>{pm.role} · {pm.discipline || "MEP"}</div>
                                <div style={{ fontSize: 11, marginTop: 2, color: "var(--accent)", fontWeight: 600 }}>📞 {getPhone(pm)}</div>
                              </div>
                            </div>
                          </div>

                          {/* Teammates List with Tasks & Progress Bars */}
                          <div>
                            <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 700, marginBottom: 8 }}>
                              👥 Team Members & Task Progress ({teammates.length})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {teammates.map(tm => {
                                const tmTask = (db.tasks || []).find(t => 
                                  (String(t.projectId) === String(p.id) || String(t.projectId) === String(p.uuid)) && 
                                  (String(t.assignee) === String(tm.id) || String(t.assignee) === String(tm.uuid) || t.assignee === tm.name)
                                );
                                const tmTaskTitle = tmTask ? tmTask.title : (tm.taskTitle || `${tm.name} - Project Task`);
                                const tmProgress = tmTask ? (tmTask.percent !== undefined ? tmTask.percent : (tmTask.status === "Done" ? 100 : 0)) : (tm.progress || 0);

                                return (
                                  <div key={tm.id || tm.name} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--line)" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <Avatar name={tm.name} size={32} />
                                        <div>
                                          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{tm.name}</div>
                                          <div className="muted" style={{ fontSize: 11 }}>{tm.role || tm.discipline || "Engineering Staff"}</div>
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <Tag label={tmTask?.status || "In Progress"} color={statusColor(tmTask?.status || "In Progress")} />
                                        <span style={{ fontSize: 10.5, color: "var(--accent)", fontWeight: 600 }}>📞 {getPhone(tm)}</span>
                                      </div>
                                    </div>

                                    {/* Task & Progress Bar */}
                                    <div style={{ paddingLeft: 42, display: "flex", flexDirection: "column", gap: 4 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
                                        <span style={{ fontWeight: 600, color: "var(--accent2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                                          📌 Task: {tmTaskTitle}
                                        </span>
                                        <span style={{ fontWeight: 700, color: "var(--ink)", fontSize: 11 }}>{tmProgress}%</span>
                                      </div>
                                      <Bar value={tmProgress} color={barColor(tmProgress)} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Tasks under this project */}
                          <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
                            <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 700, marginBottom: 6 }}>
                              📋 {user.name}'s Tasks on {p.name} ({pTasks.length})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {pTasks.map(t => (
                                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>• {t.title}</span>
                                  <Tag label={t.status} color={statusColor(t.status)} />
                                </div>
                              ))}
                              {pTasks.length === 0 && (
                                <div className="muted" style={{ fontSize: 11 }}>No active tasks assigned yet.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* Tasks Tab */}
          {tab === "tasks" && (
            <>
              <div className="topbar">
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      if (window.history.length > 1) {
                        window.history.back();
                      } else {
                        setTab("overview");
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
                    <h1 className="disp" style={{ margin: 0 }}>
                      My Assigned Tasks ({userTasks.length})
                    </h1>
                    <p style={{ margin: "2px 0 0 0" }}>
                      Keep track of tasks assigned directly to {user.name} ({user.role}) and edit completion progress.
                    </p>
                  </div>
                </div>
              </div>

              <div className="content split-1-1">
                {/* Task list pane */}
                <div className="card" style={{ padding: 20, background: "#fff", display: "flex", flexDirection: "column", gap: 16 }}>
                  {userTasks.map(t => {
                    const proj = db.projects.find(p => p.id === t.projectId);
                    const isEditing = editingTaskId === t.id;

                    return (
                      <div key={t.id} style={{ padding: 16, border: "1px solid var(--line)", borderRadius: 12, background: isEditing ? "#c0762b08" : "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{t.title}</div>
                            <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Project: {proj?.name || "GENOME"}</div>
                          </div>
                          <Tag label={t.status} color={statusColor(t.status)} />
                        </div>

                        <div style={{ marginTop: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 5 }}>
                            <span className="muted">Progress:</span>
                            <span style={{ fontWeight: 700, color: "var(--ink)" }}>{t.percent}%</span>
                          </div>
                          <Bar value={t.percent} color={barColor(t.percent)} />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--line)" }}>
                          <span className="muted" style={{ fontSize: 11.5 }}>Due Date: {fmt(t.target)}</span>
                          
                          {!isEditing ? (
                            <button className="btn sm" onClick={() => startEditProgress(t)} style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line)" }}>
                              ✏️ Update Progress
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>Editing...</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {userTasks.length === 0 && (
                    <div className="muted" style={{ textAlign: "center", padding: 30 }}>No tasks assigned to {user.name}.</div>
                  )}
                </div>

                {/* Progress edit pane */}
                <div className="card" style={{ padding: 20, background: "#fff", height: "auto" }}>
                  <div className="h3 disp" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10, marginBottom: 14 }}>
                    Task Progress Controller
                  </div>
                  
                  {editingTaskId ? (
                    <form onSubmit={handleUpdateProgress} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>
                        {db.tasks.find(t => t.id === editingTaskId)?.title}
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                          <span className="muted">Completion Percentage:</span>
                          <span style={{ fontWeight: 700, color: "var(--accent)" }}>{editProgress}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={editProgress}
                          onChange={(e) => setEditProgress(e.target.value)}
                          style={{ width: "100%" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, display: "block", marginBottom: 6 }}>Task Status</label>
                        <select
                          className="inp"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          style={{ width: "100%", padding: 10, background: "#fff" }}
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="On Hold">On Hold</option>
                          <option value="TBC">TBC</option>
                          <option value="Done">Done</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                        <button type="submit" className="btn" style={{ flex: 1, padding: 10 }}>
                          Save Progress Update
                        </button>
                        <button type="button" className="btn sec" onClick={() => setEditingTaskId(null)} style={{ flex: 0.5 }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>No task selected</div>
                      <p style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.45 }}>Click the "✏️ Update Progress" button on any task card to start editing progress details.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Profile Tab */}
          {tab === "profile" && (
            <>
              <div className="topbar">
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      if (window.history.length > 1) {
                        window.history.back();
                      } else {
                        setTab("overview");
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
                    <h1 className="disp" style={{ margin: 0 }}>My Profile & Credentials</h1>
                    <p style={{ margin: "2px 0 0 0" }}>View your professional credentials and assigned system roles.</p>
                  </div>
                </div>
              </div>

              {isEditingProfile ? (
                <div className="content">
                  <form onSubmit={handleSaveProfile} className="card" style={{ padding: 24, background: "#fff", maxWidth: 600, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
                    <div className="h3 disp" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10, marginBottom: 18 }}>
                      Edit Personal Details & Credentials
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, display: "block", marginBottom: 6 }}>Email Address</label>
                        <input
                          type="email"
                          className="inp"
                          placeholder="Email Address"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          style={{ width: "100%", padding: 10, background: "#fff" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, display: "block", marginBottom: 6 }}>Phone Number</label>
                        <input
                          type="text"
                          className="inp"
                          placeholder="Phone Number"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          style={{ width: "100%", padding: 10, background: "#fff" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, display: "block", marginBottom: 6 }}>Portal Username</label>
                        <input
                          type="text"
                          className="inp"
                          placeholder="Username"
                          value={profileUsername}
                          onChange={(e) => setProfileUsername(e.target.value)}
                          style={{ width: "100%", padding: 10, background: "#fff" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, display: "block", marginBottom: 6 }}>Portal Password</label>
                        <input
                          type="text"
                          className="inp"
                          placeholder="Password"
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          style={{ width: "100%", padding: 10, background: "#fff" }}
                        />
                      </div>

                      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                        <button type="submit" className="btn" style={{ flex: 1, padding: 10 }}>
                          Save Profile Changes
                        </button>
                        <button type="button" className="btn sec" onClick={() => setIsEditingProfile(false)} style={{ flex: 0.5 }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="content split-1-1">
                  <div className="card" style={{ padding: 24, background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Avatar name={user.name} size={64} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 18, color: "var(--ink)" }}>{user.name}</div>
                          <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginTop: 2 }}>{user.role}</div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Discipline: {user.discipline}</div>
                        </div>
                      </div>
                      <button className="btn sm" onClick={() => setIsEditingProfile(true)}>
                        ✏️ Edit Details
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13.5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                        <span className="muted">Email Address:</span>
                        <span style={{ fontWeight: 600 }}>{getEmail(user)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                        <span className="muted">Phone Number:</span>
                        <span style={{ fontWeight: 600 }}>{getPhone(user)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                        <span className="muted">Username:</span>
                        <span style={{ fontWeight: 600 }}>{user.username || "john"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                        <span className="muted">System Access Level:</span>
                        <Tag label="Staff Employee" color="var(--green)" />
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ padding: 24, background: "#fff" }}>
                    <div className="h3 disp" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10, marginBottom: 16 }}>
                      Active Projects & Team Summary
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {userProjects.map(p => (
                        <div key={p.id} style={{ padding: 12, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--line)" }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{p.name}</div>
                          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>PM: {getProjectManager(p.id).name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StaffPortal />
  </React.StrictMode>
);
