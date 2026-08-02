import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { SEED } from './data/seed';
import { loadDB, saveDB } from './utils/storage';
import { uid, statusColor, barColor, fmt } from './utils/helpers';
import Avatar from './components/Avatar';
import Tag from './components/Tag';
import Bar from './components/Bar';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function StaffPortal() {
  const storedUser = localStorage.getItem('dgec_user');
  let sessionUser = null;
  
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed && (parsed.username || parsed.name || parsed.id || parsed.uuid)) {
        sessionUser = parsed;
      }
    } catch (e) {}
  }

  const [db, setDb] = useState(() => SEED);
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
  if (db && sessionUser) {
    const sId = String(sessionUser.id || sessionUser.uuid || '').toLowerCase();
    const sName = String(sessionUser.name || '').toLowerCase();
    const sUser = String(sessionUser.username || '').toLowerCase();

    const matched = (db.users || []).find(u => {
      const uId = String(u.id || '').toLowerCase();
      const uUuid = String(u.uuid || '').toLowerCase();
      const uName = String(u.name || '').toLowerCase();
      const uUser = String(u.username || '').toLowerCase();
      return (sId && (uId === sId || uUuid === sId)) || (sUser && uUser === sUser) || (sName && uName === sName);
    });

    if (matched && !matched.role?.toLowerCase().includes("admin") && !matched.role?.toLowerCase().includes("project manager")) {
      activeStaff = matched;
    }
  }

  const user = activeStaff || sessionUser || johnUser;

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [profilePassword, setProfilePassword] = useState("");

  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('All');
  const [taskProjectFilter, setTaskProjectFilter] = useState('All');
  const [saveNotification, setSaveNotification] = useState(null);

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

  // Robust keys array for active staff member matching
  const userKeys = [
    user.id ? String(user.id).toLowerCase() : null,
    user.uuid ? String(user.uuid).toLowerCase() : null,
    user.name ? String(user.name).toLowerCase() : null,
    user.username ? String(user.username).toLowerCase() : null,
    // Explicit candidate ID mapping for legacy task compatibility
    (user.name && String(user.name).toLowerCase() === "david") ? "24" : null,
    (user.name && String(user.name).toLowerCase() === "tomas") ? "22" : null,
    (user.name && String(user.name).toLowerCase().includes("iqbal")) ? "4" : null
  ].filter(Boolean);

  // Filter tasks assigned to active staff member
  const userTasks = (db.tasks || []).filter(t => {
    const aVal = t.assignee ? String(t.assignee).toLowerCase() : '';
    const aIdVal = t.assignee_id ? String(t.assignee_id).toLowerCase() : '';
    return userKeys.some(key => key === aVal || key === aIdVal);
  });

  // Find assigned projects for active staff member (from tasks AND teammates roster)
  const taskProjIds = userTasks.map(t => String(t.projectId || t.project_id || '').toLowerCase());
  const teammateProjIds = (db.teammates || []).filter(tm => {
    const tmKeys = [
      tm.id ? String(tm.id).toLowerCase() : null,
      tm.uuid ? String(tm.uuid).toLowerCase() : null,
      tm.name ? String(tm.name).toLowerCase() : null,
      tm.email ? String(tm.email).toLowerCase() : null
    ].filter(Boolean);
    return userKeys.some(key => tmKeys.includes(key));
  }).map(tm => String(tm.projectId || tm.project_id || tm.assignedProject || '').toLowerCase());

  const userProjIds = Array.from(new Set([...taskProjIds, ...teammateProjIds].filter(Boolean)));

  const userProjects = (db.projects || []).filter(p => {
    const pKeys = [
      String(p.id).toLowerCase(),
      p.uuid ? String(p.uuid).toLowerCase() : null,
      p.db_id ? String(p.db_id).toLowerCase() : null,
      p.name ? String(p.name).toLowerCase() : null
    ].filter(Boolean);

    return userProjIds.some(upId => pKeys.includes(upId));
  });

  // Filtered tasks for My Tasks view
  const filteredUserTasks = userTasks.filter(t => {
    const proj = (db.projects || []).find(p => 
      String(p.id) === String(t.projectId) || 
      String(p.uuid || '') === String(t.projectId) || 
      String(p.id) === String(t.project_id) ||
      (p.name && t.projectId && String(p.name).toLowerCase() === String(t.projectId).toLowerCase())
    );
    const pm = (db.users || []).find(u => String(u.id) === String(proj?.pm_id) || String(u.uuid) === String(proj?.pm_id)) || { name: proj?.project_manager || "Project Manager" };
    
    // Status Filter
    if (taskStatusFilter !== 'All' && t.status !== taskStatusFilter) {
      return false;
    }
    // Project Filter
    if (taskProjectFilter !== 'All' && String(proj?.id || t.projectId || t.project_id) !== String(taskProjectFilter)) {
      return false;
    }
    // Search Query Filter
    if (taskSearch.trim()) {
      const q = taskSearch.toLowerCase().trim();
      const titleMatch = t.title ? t.title.toLowerCase().includes(q) : false;
      const projMatch = proj?.name ? proj.name.toLowerCase().includes(q) : false;
      const pmMatch = pm?.name ? pm.name.toLowerCase().includes(q) : false;
      const statusMatch = t.status ? t.status.toLowerCase().includes(q) : false;
      return titleMatch || projMatch || pmMatch || statusMatch;
    }
    return true;
  });

  // Helper to match a task to its parent project in db.projects
  const findTaskProject = (t) => {
    if (!t) return null;
    const pKeys = [
      t.projectId ? String(t.projectId).toLowerCase() : null,
      t.project_id ? String(t.project_id).toLowerCase() : null
    ].filter(Boolean);

    return (db.projects || []).find(p => {
      const pIds = [
        String(p.id).toLowerCase(),
        p.uuid ? String(p.uuid).toLowerCase() : null,
        p.db_id ? String(p.db_id).toLowerCase() : null,
        p.name ? String(p.name).toLowerCase() : null
      ].filter(Boolean);

      return pKeys.some(k => pIds.includes(k));
    });
  };

  // Helper to find the Project Manager for a given project ID
  const getProjectManager = (projId) => {
    const pKeyStr = String(projId).toLowerCase();
    const proj = (db.projects || []).find(p => 
      String(p.id).toLowerCase() === pKeyStr || 
      String(p.uuid || '').toLowerCase() === pKeyStr ||
      String(p.db_id || '').toLowerCase() === pKeyStr
    );
    if (proj) {
      if (proj.project_manager) return { name: proj.project_manager, role: "Project Manager" };
      if (proj.pm_name) return { name: proj.pm_name, role: "Project Manager" };
      const pmId = proj.pm_id || proj.projectManagerId;
      if (pmId) {
        const pmUser = (db.users || []).find(u => String(u.id) === String(pmId) || String(u.uuid) === String(pmId));
        if (pmUser) return pmUser;
      }
    }
    const fallbackPM = (db.users || []).find(u => u.role && u.role.toLowerCase().includes("project manager"));
    return fallbackPM || { name: "Project Manager", role: "Project Manager" };
  };

  // Helper to get colleagues/teammates working on the same project (excluding Admins & PMs & self)
  const getTeammates = (projId) => {
    const pKeyStr = String(projId).toLowerCase();

    // Match project in db.projects to get all possible IDs (id, uuid, db_id)
    const matchedProj = (db.projects || []).find(p => 
      String(p.id).toLowerCase() === pKeyStr || 
      String(p.uuid || '').toLowerCase() === pKeyStr ||
      String(p.db_id || '').toLowerCase() === pKeyStr
    );
    const validProjIds = matchedProj ? [
      String(matchedProj.id).toLowerCase(),
      matchedProj.uuid ? String(matchedProj.uuid).toLowerCase() : null,
      matchedProj.db_id ? String(matchedProj.db_id).toLowerCase() : null
    ].filter(Boolean) : [pKeyStr];

    const projTasks = (db.tasks || []).filter(t => {
      const tPId = String(t.projectId || t.project_id || '').toLowerCase();
      return validProjIds.includes(tPId);
    });

    const pmUser = getProjectManager(projId);
    const pmNameLower = String(pmUser ? pmUser.name : "Project Manager").trim().toLowerCase();

    const isPMOrAdminOrSelf = (u) => {
      if (!u) return true;
      const nameLower = String(u.name || '').trim().toLowerCase();
      const roleLower = String(u.role || u.userType || u.user_type || '').trim().toLowerCase();
      const uIdLower = String(u.id || u.uuid || '').trim().toLowerCase();
      
      const isSelf = userKeys.includes(uIdLower) || userKeys.includes(nameLower);
      if (isSelf) return true;

      return (
        nameLower === 'saurabh m.' ||
        nameLower === 'administrator' ||
        nameLower === pmNameLower ||
        roleLower.includes('admin') ||
        roleLower.includes('client') ||
        roleLower.includes('project manager') ||
        roleLower.includes('project_manager')
      );
    };

    const teamMembers = [];
    const seen = new Set();

    // 1. Collect from tasks
    projTasks.forEach(t => {
      const assigneeKey = t.assignee || t.assignee_id;
      if (assigneeKey) {
        const u = (db.users || []).find(usr => 
          String(usr.id).toLowerCase() === String(assigneeKey).toLowerCase() || 
          String(usr.uuid || '').toLowerCase() === String(assigneeKey).toLowerCase() || 
          String(usr.name || '').toLowerCase() === String(assigneeKey).toLowerCase() ||
          String(usr.username || '').toLowerCase() === String(assigneeKey).toLowerCase()
        );
        if (u && !isPMOrAdminOrSelf(u) && !seen.has(String(u.name || u.id).toLowerCase())) {
          seen.add(String(u.name || u.id).toLowerCase());
          teamMembers.push(u);
        }
      }
    });

    // 2. Collect from teammates
    (db.teammates || []).forEach(tm => {
      const tmProj = String(tm.projectId || tm.project_id || tm.assignedProject || '').toLowerCase();
      if (validProjIds.includes(tmProj)) {
        if (!isPMOrAdminOrSelf(tm) && !seen.has(String(tm.name || tm.id).toLowerCase())) {
          seen.add(String(tm.name || tm.id).toLowerCase());
          teamMembers.push(tm);
        }
      }
    });

    return teamMembers;
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

  const handleUpdateProgress = async (e) => {
    if (e) e.preventDefault();
    if (!editingTaskId) return;

    const targetTask = (db.tasks || []).find(t => String(t.id) === String(editingTaskId) || String(t.uuid) === String(editingTaskId));
    if (!targetTask) return;

    const newPercent = Math.min(100, Math.max(0, parseInt(editProgress, 10) || 0));
    const newStatus = editStatus || (newPercent === 100 ? "Done" : (newPercent > 0 ? "In Progress" : "Not Started"));
    const projId = targetTask.projectId || targetTask.project_id;

    // 1. Instant local state update
    const nextTasks = (db.tasks || []).map(t =>
      (String(t.id) === String(editingTaskId) || String(t.uuid) === String(editingTaskId))
        ? { ...t, percent: newPercent, status: newStatus }
        : t
    );

    // Calculate parent project progress
    const projTasks = nextTasks.filter(t => 
      String(t.projectId) === String(projId) || String(t.project_id) === String(projId)
    );
    const avgProgress = projTasks.length > 0
      ? Math.round(projTasks.reduce((sum, t) => sum + (Number(t.percent) || 0), 0) / projTasks.length)
      : newPercent;

    const nextProjects = (db.projects || []).map(p =>
      (String(p.id) === String(projId) || String(p.uuid) === String(projId))
        ? { ...p, progress: avgProgress }
        : p
    );

    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const nextDb = {
      ...db,
      tasks: nextTasks,
      projects: nextProjects,
      history: [
        { id: uid("h"), user: user.name, action: `Updated progress of '${targetTask.title}' to ${newPercent}% (${newStatus})`, at: timestamp },
        ...(db.history || [])
      ].slice(0, 100)
    };

    setDb(nextDb);
    saveDB(nextDb);
    setEditingTaskId(null);
    setSaveNotification(`✓ Task progress saved successfully (${newPercent}%)`);
    setTimeout(() => setSaveNotification(null), 3500);

    // 2. Direct MySQL background API update
    try {
      await fetch('/api/update-task-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: targetTask.uuid || targetTask.id || targetTask.title,
          percent: newPercent,
          status: newStatus,
          projectId: projId
        })
      });
    } catch (err) {
      console.error("Background task progress save error:", err);
    }
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
    : 0;

  return (
    <div className="wrap">
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&display=swap');"}</style>
      <div className="app">
        {/* Sidebar */}
        <aside className="side">
          <div>
            <div className="brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="logo" style={{ background: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
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
                  <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                  </span> Overview
                </button>
                <button className={tab === "tasks" ? "on" : ""} onClick={() => { setTab("tasks"); setMenuOpen(false); }}>
                  <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M9 12l2 2 4-4" /><path d="M9 16h6" /></svg>
                  </span> My Tasks ({totalTasksCount})
                </button>
                <button className={tab === "profile" ? "on" : ""} onClick={() => { setTab("profile"); setMenuOpen(false); }}>
                  <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </span> My Profile
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
                style={{ width: "100%", padding: "8px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg> Log Out
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
                      const proj = findTaskProject(t);
                      const pm = getProjectManager(proj?.id || t.projectId || t.project_id);
                      return (
                        <div key={t.id || t.uuid} style={{ padding: 14, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--ink)" }}>{t.title}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                                <span className="pill" style={{ background: "#e0f2fe", color: "#0369a1", fontSize: 10.5, fontWeight: 700, padding: "1px 6px", border: "1px solid #bae6fd" }}>
                                  🏢 {proj?.name || "Project"}
                                </span>
                                <span className="pill" style={{ background: "#fef3c7", color: "#b45309", fontSize: 10.5, fontWeight: 700, padding: "1px 6px", border: "1px solid #fde68a" }}>
                                  👔 PM: {pm?.name || "Project Manager"}
                                </span>
                              </div>
                            </div>
                            <Tag label={t.status} color={statusColor(t.status)} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginTop: 4 }}>
                            <span className="muted">Due: {fmt(t.target || t.target_date)}</span>
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
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Floating Save Notification Toast */}
              {saveNotification && (
                <div style={{
                  position: "fixed",
                  top: 24,
                  right: 24,
                  zIndex: 9999,
                  background: "#10b981",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 13.5,
                  boxShadow: "0 10px 25px rgba(16,185,129,0.35)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  animation: "fadeIn 0.2s ease"
                }}>
                  {saveNotification}
                </div>
              )}

              {/* Header Banner Card */}
              <div className="card" style={{ padding: "20px 24px", background: "#fff", borderRadius: 16, border: "1px solid var(--line)", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                  <div>
                    <h1 className="disp" style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
                      My Assigned Tasks ({filteredUserTasks.length})
                    </h1>
                    <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: 12.5 }}>
                      Manage task progress, update completion %, and save updates directly to database.
                    </p>
                  </div>
                  <span className="pill" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontWeight: 700, fontSize: 12, padding: "6px 16px", borderRadius: 10 }}>
                    💼 {user.name} ({user.role})
                  </span>
                </div>
              </div>

              {/* KPI Summary Banner */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                <div style={{ padding: "16px 20px", borderRadius: 16, background: "#fff", border: "1px solid var(--line)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0f172a" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Total Assigned</span>
                    <span style={{ fontSize: 16 }}>📋</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{userTasks.length}</div>
                </div>

                <div style={{ padding: "16px 20px", borderRadius: 16, background: "#fff", border: "1px solid var(--line)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#d97706" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#d97706", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>In Progress</span>
                    <span style={{ fontSize: 16 }}>⏳</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#d97706", marginTop: 6 }}>{inProgressTasksCount}</div>
                </div>

                <div style={{ padding: "16px 20px", borderRadius: 16, background: "#fff", border: "1px solid var(--line)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#059669" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#059669", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Completed</span>
                    <span style={{ fontSize: 16 }}>✅</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#059669", marginTop: 6 }}>{completedTasksCount}</div>
                </div>

                <div style={{ padding: "16px 20px", borderRadius: 16, background: "#fff", border: "1px solid var(--line)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#2563eb" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Avg Progress</span>
                    <span style={{ fontSize: 16 }}>🎯</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb", marginTop: 6 }}>{avgTaskCompletion}%</div>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div style={{ background: "#fff", padding: 14, borderRadius: 16, border: "1px solid var(--line)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <input 
                    type="text" 
                    className="inp" 
                    placeholder="🔍 Search tasks by title, project, or PM..." 
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    style={{ width: "100%", padding: "9px 14px", borderRadius: 8, fontSize: 12.5, border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div style={{ minWidth: 170 }}>
                  <select
                    className="inp"
                    value={taskProjectFilter}
                    onChange={(e) => setTaskProjectFilter(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 12, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 600 }}
                  >
                    <option value="All">All Projects ({userProjects.length})</option>
                    {userProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {["All", "In Progress", "Done", "Not Started", "On Hold"].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTaskStatusFilter(st)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        borderRadius: 8,
                        border: taskStatusFilter === st ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                        background: taskStatusFilter === st ? "#eff6ff" : "#fff",
                        color: taskStatusFilter === st ? "#2563eb" : "#475569",
                        cursor: "pointer"
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {(taskSearch || taskStatusFilter !== 'All' || taskProjectFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => { setTaskSearch(''); setTaskStatusFilter('All'); setTaskProjectFilter('All'); }}
                    style={{ fontSize: 11.5, color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontWeight: 700, padding: "4px 8px" }}
                  >
                    Reset Filters ✕
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 20, alignItems: "start" }}>
                {/* Task list pane */}
                <div className="card" style={{ padding: 22, background: "#fff", borderRadius: 16, border: "1px solid var(--line)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
                    <div>
                      <h3 className="disp" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
                        📋 Assigned Task Cards
                      </h3>
                      <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                        Click any task card to edit completion in the sticky controller panel.
                      </div>
                    </div>
                    <span className="pill" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontWeight: 700, fontSize: 11, padding: "3px 10px" }}>
                      Showing {filteredUserTasks.length} of {userTasks.length}
                    </span>
                  </div>

                  {filteredUserTasks.map(t => {
                    const proj = findTaskProject(t);
                    const pm = getProjectManager(proj?.id || t.projectId || t.project_id);
                    const isEditing = String(editingTaskId) === String(t.id) || String(editingTaskId) === String(t.uuid);

                    return (
                      <div 
                        key={t.id || t.uuid} 
                        onClick={() => startEditProgress(t)}
                        style={{ 
                          padding: 20, 
                          border: isEditing ? "2px solid #2563eb" : "1px solid #e2e8f0", 
                          borderRadius: 16, 
                          background: isEditing ? "#f0f9ff" : "#ffffff",
                          boxShadow: isEditing ? "0 8px 24px rgba(37,99,235,0.18)" : "0 4px 12px rgba(0,0,0,0.03)",
                          cursor: "pointer",
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 14
                        }}
                      >
                        {/* Task Card Header: Title & Status */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", letterSpacing: "-.2px" }}>{t.title}</div>
                            
                            {/* Project, PM, and Discipline Badges */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                              <span className="pill" style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 700, border: "1px solid #bfdbfe", padding: "3px 10px", borderRadius: 8 }}>
                                🏢 {proj?.name || "Project Assignment"}
                              </span>
                              <span className="pill" style={{ background: "#fffbeb", color: "#b45309", fontSize: 11, fontWeight: 700, border: "1px solid #fde68a", padding: "3px 10px", borderRadius: 8 }}>
                                👔 PM: {pm?.name || "Project Manager"}
                              </span>
                              <span className="pill" style={{ background: "#f8fafc", color: "#475569", fontSize: 11, fontWeight: 600, border: "1px solid #e2e8f0", padding: "3px 10px", borderRadius: 8 }}>
                                ⚙️ {t.discipline || user.discipline || "Engineering"}
                              </span>
                            </div>
                          </div>
                          
                          <Tag label={t.status} color={statusColor(t.status)} />
                        </div>

                        {/* Progress Bar Section */}
                        <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 6 }}>
                            <span style={{ color: "#475569", fontWeight: 700 }}>Task Completion</span>
                            <span style={{ fontWeight: 800, color: t.percent === 100 ? "#059669" : "#2563eb", fontSize: 13 }}>{t.percent}%</span>
                          </div>
                          <Bar value={t.percent} color={barColor(t.percent)} />
                        </div>

                        {/* Card Footer: Due Date & Action Button */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            📅 Target Date: <strong style={{ color: "#334155" }}>{fmt(t.target || t.target_date)}</strong>
                          </span>
                          
                          {!isEditing ? (
                            <button 
                              className="btn sm" 
                              onClick={(e) => { e.stopPropagation(); startEditProgress(t); }} 
                              style={{ 
                                background: "#2563eb", 
                                color: "#fff", 
                                border: "none", 
                                borderRadius: 10, 
                                padding: "7px 16px", 
                                fontSize: 12, 
                                fontWeight: 700, 
                                cursor: "pointer",
                                boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6
                              }}
                            >
                              ✏️ Update Progress
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 800, display: "flex", alignItems: "center", gap: 6, background: "#dbeafe", padding: "6px 12px", borderRadius: 8 }}>
                              🔄 Active in Controller
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredUserTasks.length === 0 && (
                    <div style={{ textAlign: "center", padding: "50px 20px", color: "#64748b" }}>
                      <div style={{ width: 54, height: 54, borderRadius: 16, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px" }}>
                        📋
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>No Assigned Tasks Found</div>
                      <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4, maxWidth: 300, margin: "6px auto 0", lineHeight: 1.5 }}>
                        {userTasks.length === 0 
                          ? `There are currently no tasks assigned to ${user.name}. Tasks assigned by Project Managers will appear here automatically.` 
                          : "No tasks match your search or status filter. Try clearing filters to view all assigned tasks."}
                      </div>
                      {(taskSearch || taskStatusFilter !== 'All' || taskProjectFilter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => { setTaskSearch(''); setTaskStatusFilter('All'); setTaskProjectFilter('All'); }}
                          style={{ marginTop: 14, fontSize: 12, color: "#2563eb", border: "1px solid #bfdbfe", background: "#eff6ff", cursor: "pointer", fontWeight: 700, padding: "6px 14px", borderRadius: 8 }}
                        >
                          Clear Search Filters ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sticky Progress edit pane */}
                <div 
                  className="card" 
                  style={{ 
                    padding: 22, 
                    background: "#fff", 
                    borderRadius: 16, 
                    border: "1px solid var(--line)", 
                    boxShadow: "0 4px 20px rgba(0,0,0,0.03)", 
                    position: "sticky", 
                    top: 20, 
                    height: "fit-content" 
                  }}
                >
                  <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                      ⚙️
                    </div>
                    <div>
                      <h3 className="disp" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                        Task Progress Controller
                      </h3>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>Update completion & save to database</div>
                    </div>
                  </div>
                  
                  {editingTaskId ? (
                    (() => {
                      const curTask = (db.tasks || []).find(t => String(t.id) === String(editingTaskId) || String(t.uuid) === String(editingTaskId));
                      const curProj = findTaskProject(curTask);
                      const curPm = getProjectManager(curProj?.id || curTask?.projectId || curTask?.project_id);

                      return (
                        <form onSubmit={handleUpdateProgress} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <div style={{ background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: 10.5, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700 }}>Currently Updating</div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginTop: 2 }}>{curTask?.title}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 700 }}>🏢 {curProj?.name || "Project Assignment"}</span>
                              <span style={{ fontSize: 11, color: "#b45309", fontWeight: 700 }}>👔 PM: {curPm?.name || "PM"}</span>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8, fontWeight: 700 }}>
                              <span style={{ color: "#334155" }}>Completion Percentage:</span>
                              <span style={{ color: "#2563eb", fontSize: 16, fontWeight: 800 }}>{editProgress}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={editProgress}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setEditProgress(val);
                                if (val === 100) setEditStatus("Done");
                                else if (val > 0 && editStatus === "Not Started") setEditStatus("In Progress");
                              }}
                              style={{ width: "100%", accentColor: "#2563eb", cursor: "pointer", height: 6 }}
                            />
                            
                            {/* Preset Percentage Quick Buttons */}
                            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                              {[0, 25, 50, 75, 100].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => {
                                    setEditProgress(pct);
                                    if (pct === 100) setEditStatus("Done");
                                    else if (pct > 0 && editStatus === "Not Started") setEditStatus("In Progress");
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: "5px 0",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    borderRadius: 6,
                                    border: Number(editProgress) === pct ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                                    background: Number(editProgress) === pct ? "#eff6ff" : "#fff",
                                    color: Number(editProgress) === pct ? "#2563eb" : "#475569",
                                    cursor: "pointer"
                                  }}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: 11.5, color: "#334155", fontWeight: 700, display: "block", marginBottom: 6 }}>
                              Update Status
                            </label>
                            <select
                              className="inp"
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              style={{ width: "100%", padding: "10px 12px", fontSize: 12.5, borderRadius: 8, background: "#fff", border: "1.5px solid #cbd5e1", fontWeight: 600 }}
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="On Hold">On Hold</option>
                              <option value="TBC">TBC</option>
                              <option value="Done">Done (Completed)</option>
                            </select>
                          </div>

                          <div style={{ display: "flex", gap: 10, marginTop: 10, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                            <button 
                              type="button" 
                              className="btn sec" 
                              onClick={() => setEditingTaskId(null)} 
                              style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer" }}
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit" 
                              className="btn" 
                              style={{ flex: 1.5, padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 800, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}
                            >
                              💾 Save Progress
                            </button>
                          </div>
                        </form>
                      );
                    })()
                  ) : (
                    <div style={{ textAlign: "center", padding: "50px 20px", color: "#64748b" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>
                        ⚙️
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>No Task Active</div>
                      <p style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5, color: "#64748b", maxWidth: 240, margin: "6px auto 0" }}>
                        Click the <strong>✏️ Update Progress</strong> button on any assigned task to edit completion % and update status.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
    <ErrorBoundary>
      <StaffPortal />
    </ErrorBoundary>
  </React.StrictMode>
);
