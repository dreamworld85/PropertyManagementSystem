import React, { useState } from 'react';
import Avatar from '../components/Avatar';
import Bar from '../components/Bar';
import Tag from '../components/Tag';
import Field from '../components/Field';
import { fmt, statusColor, barColor } from '../utils/helpers';

export default function Admin({
  db,
  setModal,
  subTab,
  setSubTab,
  selProjectId,
  setSelProjectId,
  selUserId,
  setSelUserId,
  selClientId,
  setSelClientId,
  updateUser,
  updateProject,
  updateClient,
  deleteClient
}) {
  // Project Editing States
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjForm, setEditProjForm] = useState(null);
  const [editClientSearchQuery, setEditClientSearchQuery] = useState("");

  const startEditProject = (p) => {
    setEditProjForm({
      id: p.id,
      uuid: p.uuid || p.id,
      name: p.name || "",
      clientId: p.clientId || (db.clients[0]?.id || ""),
      category: p.category || (db.settings.categories[0]),
      status: p.status || (db.settings.projectStatuses[0]),
      progress: p.progress !== undefined ? p.progress : 0,
      start: p.start || "2026-06-08",
      end: p.end || "2026-12-31",
      desc: p.desc || ""
    });
    setIsEditingProject(true);
  };

  const setEditProjVal = (k, v) => {
    setEditProjForm(s => ({ ...s, [k]: v }));
  };

  const saveEditedProject = () => {
    if (!editProjForm || !editProjForm.name.trim()) {
      alert("Project Name is required");
      return;
    }
    if (updateProject) {
      updateProject(editProjForm);
    }
    setIsEditingProject(false);
    setEditProjForm(null);
  };

  // User Editing States
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserForm, setEditUserForm] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Client Editing States
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientForm, setEditClientForm] = useState(null);
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [editPmSearchQuery, setEditPmSearchQuery] = useState("");

  // Team Selection State for Teammates Admin tab
  const [selTeamId, setSelTeamId] = useState(() => db.projects[0]?.id || null);
  const [teamCategory, setTeamCategory] = useState("project"); // "project" or "discipline"
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [projectTeammateSearchQuery, setProjectTeammateSearchQuery] = useState("");

  // Helper to find the Project Manager for a given project or project ID
  const getProjectManager = (target) => {
    if (!target) return { name: "Project Manager", role: "Project Manager", discipline: "Management", email: "", phone: "" };

    let proj = typeof target === "object" ? target : null;
    if (!proj) {
      const targetStr = String(target).toLowerCase();
      proj = (db.projects || []).find(p => 
        String(p.id).toLowerCase() === targetStr || 
        String(p.uuid || '').toLowerCase() === targetStr ||
        String(p.db_id || '').toLowerCase() === targetStr
      );
    }

    if (proj) {
      // 1. Match by Project Manager Name explicitly on project
      const pmNameVal = (proj.project_manager || proj.pm_name || '').trim();
      if (pmNameVal) {
        const pmUser = (db.users || []).find(u => u.name && u.name.trim().toLowerCase() === pmNameVal.toLowerCase());
        return {
          name: pmNameVal,
          role: pmUser?.role || "Project Manager",
          discipline: pmUser?.discipline || "Management",
          email: pmUser?.email || "",
          phone: pmUser?.phone || ""
        };
      }

      // 2. Match by pm_id / projectManagerId / pmId against db.users
      const pPmId = String(proj.pm_id || proj.projectManagerId || proj.pmId || '').toLowerCase();
      if (pPmId) {
        const pmUser = (db.users || []).find(u => 
          String(u.id).toLowerCase() === pPmId || 
          String(u.uuid || '').toLowerCase() === pPmId ||
          String(u.name || '').toLowerCase() === pPmId
        );
        if (pmUser && pmUser.name) {
          return {
            name: pmUser.name,
            role: pmUser.role || "Project Manager",
            discipline: pmUser.discipline || "Management",
            email: pmUser.email || "",
            phone: pmUser.phone || ""
          };
        }
      }
    }

    return { name: "Project Manager", role: "Project Manager", discipline: "Management", email: "", phone: "" };
  };

  // Helper to find client for project from active database records
  const getClientForProject = (proj) => {
    if (!proj) return null;
    const cid = proj.clientId !== undefined ? proj.clientId : proj.client_id;
    return db.clients.find(c => 
      (cid && String(c.id) === String(cid)) || 
      (cid && String(c.uuid) === String(cid)) ||
      (c.name && cid && c.name.toLowerCase() === String(cid).toLowerCase()) ||
      (c.name && proj.clientName && c.name.toLowerCase() === String(proj.clientName).toLowerCase())
    ) || null;
  };

  // Helper to get all committed projects for a client
  const getClientProjects = (c) => {
    if (!c) return [];
    return db.projects.filter((p) => {
      const pCid = p.clientId !== undefined ? p.clientId : p.client_id;
      return (pCid && String(pCid) === String(c.id)) || 
             (pCid && String(pCid) === String(c.uuid)) ||
             (pCid && c.name && String(pCid).toLowerCase() === String(c.name).toLowerCase()) ||
             (p.clientName && c.name && String(p.clientName).toLowerCase() === String(c.name).toLowerCase());
    });
  };

  // Helper to get all engineering teammates working on a given project (excluding Project Manager & Admin)
  const getProjectTeammates = (projId) => {
    if (!projId) return [];

    const proj = db.projects.find(p => 
      String(p.id) === String(projId) || 
      String(p.uuid) === String(projId) || 
      (p.db_id && String(p.db_id) === String(projId)) ||
      (p.name && String(p.name).toLowerCase() === String(projId).toLowerCase())
    );

    const projIdMatches = [
      String(projId).toLowerCase(),
      proj ? String(proj.id).toLowerCase() : null,
      proj ? String(proj.uuid).toLowerCase() : null,
      proj ? String(proj.db_id).toLowerCase() : null,
      proj ? String(proj.name).toLowerCase() : null
    ].filter(Boolean);

    const teammatesList = [];

    const addUniqueTeammate = (item) => {
      if (!item || !item.name) return;
      if (item.name === "Saurabh M." || item.username === "projectmanager") return;

      const normName = item.name.trim().toLowerCase();
      if (!teammatesList.some(t => t.name.trim().toLowerCase() === normName)) {
        teammatesList.push({
          id: item.id || item.uuid || `tm_${Math.random()}`,
          uuid: item.uuid || item.id,
          name: item.name,
          username: item.username || normName.replace(/\s+/g, ''),
          role: item.role || item.discipline || "Staff",
          discipline: item.discipline || item.role || "Engineering",
          taskName: item.taskName || item.task_name || item.initialTask || "General Engineering Task",
          email: item.email || `${normName.replace(/\s+/g, '')}@dgec.com`,
          phone: item.phone || item.contact_number || "+968 9400 0000"
        });
      }
    };

    // 1. Collect from db.teammates
    (db.teammates || []).forEach(tm => {
      const tmProj = tm.projectId || tm.project_id || tm.assignedProject;
      if (tmProj && projIdMatches.includes(String(tmProj).toLowerCase())) {
        addUniqueTeammate(tm);
      }
    });

    // 2. Collect from db.tasks
    (db.tasks || []).forEach(t => {
      const tProj = t.projectId || t.project_id;
      if (tProj && projIdMatches.includes(String(tProj).toLowerCase())) {
        const matchingUser = (db.users || []).find(u => 
          String(u.id) === String(t.assignee) || 
          String(u.uuid) === String(t.assignee) ||
          (u.name && t.assignee && u.name.toLowerCase() === String(t.assignee).toLowerCase())
        ) || (db.staff || []).find(s => 
          String(s.id) === String(t.assignee) || 
          String(s.uuid) === String(t.assignee) ||
          (s.name && t.assignee && s.name.toLowerCase() === String(t.assignee).toLowerCase())
        );

        if (matchingUser) {
          addUniqueTeammate({
            ...matchingUser,
            taskName: t.title || "General Engineering Task"
          });
        }
      }
    });

    // 3. Collect from db.users
    (db.users || []).forEach(u => {
      const uProj = u.projectId || u.project_id || u.assignedProject;
      if (uProj && projIdMatches.includes(String(uProj).toLowerCase())) {
        addUniqueTeammate(u);
      }
    });

    return teammatesList;
  };

  const handleRemoveTeammate = (projId, userId) => {
    if (!window.confirm("Are you sure you want to remove this teammate from the project?")) return;
    const targetUser = db.users.find(u => String(u.id) === String(userId) || String(u.uuid) === String(userId));
    const uName = targetUser?.name;

    commit((d) => {
      const projObj = d.projects.find(p => String(p.id) === String(projId) || String(p.uuid) === String(projId));
      const projIdMatches = [
        String(projId),
        projObj ? String(projObj.id) : null,
        projObj ? String(projObj.uuid) : null,
        projObj ? String(projObj.db_id) : null
      ].filter(Boolean);

      const nextTasks = d.tasks.filter(t => 
        !( projIdMatches.includes(String(t.projectId)) && 
           (String(t.assignee) === String(userId) || String(t.assignee) === String(targetUser?.uuid) || (uName && t.assignee && String(t.assignee).toLowerCase() === uName.toLowerCase())) )
      );

      const nextUsers = d.users.filter(u => {
        const isTarget = String(u.id) === String(userId) || String(u.uuid) === String(userId) || (uName && u.name && u.name.toLowerCase() === uName.toLowerCase() && u.name !== 'Saurabh M.');
        if (!isTarget) return true;

        // If user is directly linked to this project, unlink or remove them
        const isLinkedToThisProj = [u.projectId, u.project_id, u.assignedProject, u.project].some(pVal => pVal && projIdMatches.includes(String(pVal)));
        if (isLinkedToThisProj || !u.userType || u.userType === 'Employee') {
          return false;
        }
        return true;
      });

      const nextTeammates = (d.teammates || []).filter(tm => 
        !(String(tm.id) === String(userId) || String(tm.uuid) === String(userId) || (uName && tm.name && tm.name.toLowerCase() === uName.toLowerCase()))
      );

      return {
        ...d,
        users: nextUsers,
        teammates: nextTeammates,
        tasks: nextTasks
      };
    }, `Removed teammate from project`);

    try {
      fetch('/api/delete-teammate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectId: projId, name: uName })
      }).catch(err => console.error("Failed to delete teammate API:", err));
    } catch(e) {}
  };

  const selectedProj = db.projects.find(p => p.id === selProjectId);
  const selectedUser = db.users.find(u => u.id === selUserId);
  const selectedClient = db.clients.find(c => c.id === selClientId);

  const startEditUser = (usr) => {
    const defaultType = usr.userType || (usr.role === "Project Manager" ? "Project Manager" : usr.role === "Admin" ? "Admin" : usr.role.includes("Client") ? "Client" : "Employee");
    setEditUserForm({
      ...usr,
      username: usr.username || "",
      password: usr.password || "",
      userType: defaultType,
      clientId: usr.clientId || db.clients[0]?.id || "",
      role: usr.role || "",
      discipline: usr.discipline || db.settings.disciplines[0] || ""
    });
    setIsEditingUser(true);
    setShowPassword(false);
  };

  const setEditVal = (k, v) => setEditUserForm(s => ({ ...s, [k]: v }));

  const saveEditedUser = () => {
    if (!editUserForm.name.trim()) return;
    updateUser(editUserForm);
    setIsEditingUser(false);
  };

  const startEditClient = (c) => {
    setEditClientForm({
      ...c,
      id: c.id,
      uuid: c.uuid || c.id,
      name: c.name || "",
      sector: c.sector || "",
      username: c.username || "",
      password: c.password || "",
      email: c.email || c.contact || "",
      phone: c.phone || "",
      projectManagerId: c.projectManagerId || (db.users.find(u => u.name === "Saurabh M.")?.id || db.users[0]?.id)
    });
    setIsEditingClient(true);
    setShowClientPassword(false);
  };

  const setEditClientVal = (k, v) => setEditClientForm(s => ({ ...s, [k]: v }));

  const saveEditedClient = () => {
    if (!editClientForm.name.trim()) return;
    updateClient(editClientForm);
    setIsEditingClient(false);
  };

  const handleDeleteClient = (id) => {
    deleteClient(id);
    setSelClientId(db.clients.find(c => c.id !== id)?.id || null);
  };

  // Selected team object when in Team Admin tab
  const activeTeamProj = db.projects.find(p => p.id === selTeamId) || db.projects[0];
  const activeTeamPM = activeTeamProj ? getProjectManager(activeTeamProj.id) : null;
  const activeTeamClient = activeTeamProj ? getClientForProject(activeTeamProj) : db.clients[0];
  const activeTeamTeammates = activeTeamProj ? getProjectTeammates(activeTeamProj.id) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* PROJECTS ADMIN TAB */}
      {subTab === "projects" && (
        <div className="split-1-18">
          {/* Projects List Master Pane */}
          <div className="card" style={{ padding: 18, background: "#fff", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="h3 disp" style={{ margin: 0 }}>Projects List</div>
              <button className="btn sm" onClick={() => setModal({ type: "project" })}>
                ＋ Create Project
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
              {db.projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelProjectId(p.id)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: selProjectId === p.id ? "1px solid var(--accent2)" : "1px solid var(--line)",
                    background: selProjectId === p.id ? "var(--surface)" : "#fff",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{p.name}</span>
                    <Tag label={p.status} color={statusColor(p.status, db.settings.projectStatuses)} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                    <span>{db.clients.find(c => c.id === p.clientId)?.name || "—"}</span>
                    <span>{p.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Details Pane */}
          {selectedProj ? (
            <div className="card" style={{ padding: 24, background: "#fff", display: "flex", flexDirection: "column", gap: 20 }}>
              {isEditingProject && editProjForm ? (
                /* Inline Edit Project Form Card */
                <div style={{ padding: 20, background: "var(--surface)", borderRadius: 14, border: "1.5px solid var(--accent2)", display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                    <h3 className="disp" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Edit Project: {selectedProj.name}</h3>
                    <button className="muted" onClick={() => setIsEditingProject(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18 }}>×</button>
                  </div>
                  <Field l="Project Name *">
                    <input className="inp" value={editProjForm.name} onChange={e => setEditProjVal("name", e.target.value)} />
                  </Field>
                  <div className="row2">
                    <Field l="Client Organization">
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <input
                          type="text"
                          className="inp"
                          placeholder="🔍 Search client by name or sector..."
                          value={editClientSearchQuery}
                          onChange={e => setEditClientSearchQuery(e.target.value)}
                          style={{ fontSize: 12, padding: "6px 10px", background: "#f8fafc" }}
                        />
                        <select
                          className="inp"
                          value={editProjForm.clientId}
                          onChange={e => setEditProjVal("clientId", e.target.value)}
                        >
                          {(db.clients || [])
                            .filter(c =>
                              (c.name || "").toLowerCase().includes(editClientSearchQuery.toLowerCase()) ||
                              (c.sector || "").toLowerCase().includes(editClientSearchQuery.toLowerCase())
                            )
                            .map(c => (
                              <option key={c.id || c.uuid} value={c.id || c.uuid}>
                                {c.name} {c.sector ? `(${c.sector})` : ""}
                              </option>
                            ))}
                          {(db.clients || []).filter(c =>
                            (c.name || "").toLowerCase().includes(editClientSearchQuery.toLowerCase()) ||
                            (c.sector || "").toLowerCase().includes(editClientSearchQuery.toLowerCase())
                          ).length === 0 && (
                            <option value="" disabled>No matching clients found</option>
                          )}
                        </select>
                      </div>
                    </Field>
                    <Field l="Service Category">
                      <select className="inp" value={editProjForm.category} onChange={e => setEditProjVal("category", e.target.value)}>
                        {db.settings.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="row2">
                    <Field l="Project Status">
                      <select className="inp" value={editProjForm.status} onChange={e => setEditProjVal("status", e.target.value)}>
                        {db.settings.projectStatuses.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </Field>
                    <Field l="Progress (%)">
                      <input type="number" min="0" max="100" className="inp" value={editProjForm.progress} onChange={e => setEditProjVal("progress", Number(e.target.value))} />
                    </Field>
                  </div>
                  <div className="row2">
                    <Field l="Start Date">
                      <input type="date" className="inp" value={editProjForm.start} onChange={e => setEditProjVal("start", e.target.value)} />
                    </Field>
                    <Field l="Target End Date">
                      <input type="date" className="inp" value={editProjForm.end} onChange={e => setEditProjVal("end", e.target.value)} />
                    </Field>
                  </div>
                  <Field l="Project Description">
                    <textarea className="inp" style={{ height: 60 }} value={editProjForm.desc} onChange={e => setEditProjVal("desc", e.target.value)} />
                  </Field>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                    <button type="button" className="btn sec sm" onClick={() => setIsEditingProject(false)}>Cancel</button>
                    <button type="button" className="btn sm" style={{ background: "var(--accent)", color: "#fff", padding: "8px 18px" }} onClick={saveEditedProject}>Save Changes</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h2 className="disp" style={{ fontWeight: 800, fontSize: 22, color: "var(--ink)", margin: 0 }}>{selectedProj.name}</h2>
                      <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{selectedProj.desc || "No description provided."}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Tag label={selectedProj.status} color={statusColor(selectedProj.status, db.settings.projectStatuses)} />
                      <button
                        className="btn sec sm"
                        onClick={() => startEditProject(selectedProj)}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, cursor: "pointer" }}
                      >
                        ✏️ Edit Project
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Project Manager & Client Information Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                {/* Project Manager Card */}
                <div style={{ padding: 16, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, marginBottom: 10 }}>
                    👔 Project Manager (Team Leader)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={getProjectManager(selectedProj).name} size={40} />
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14.5 }}>
                        {getProjectManager(selectedProj).name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {getProjectManager(selectedProj).role} · {getProjectManager(selectedProj).discipline}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Information Card */}
                <div style={{ padding: 16, background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)", borderRadius: 12, border: "1px solid #bfdbfe" }}>
                  <div style={{ fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🏢</span> Client Information
                  </div>
                  {getClientForProject(selectedProj) || selectedProj.clientName ? (
                    (() => {
                      const c = getClientForProject(selectedProj) || { name: selectedProj.clientName, sector: selectedProj.clientSector, email: selectedProj.clientEmail, phone: selectedProj.clientPhone };
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Avatar name={c.name} size={40} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14.5, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--accent2)", fontWeight: 600, marginTop: 2 }}>
                              Sector: {c.sector || "Commercial"}
                            </div>
                            {(c.email || c.phone) && (
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                {c.email ? `✉ ${c.email}` : ""} {c.phone ? ` · 📞 ${c.phone}` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                      No client organization assigned
                    </div>
                  )}
                </div>
              </div>

              {/* Teammates List Card */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600 }}>
                    Assigned Teammates ({getProjectTeammates(selectedProj.id).length})
                  </div>
                  <button
                    className="btn sm"
                    onClick={() => setModal({ type: "user", projectId: selectedProj.id })}
                    style={{ background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 11.5, padding: "5px 12px", borderRadius: 8 }}
                  >
                    ＋ Add Teammate
                  </button>
                </div>

                {/* Search Bar for Assigned Teammates */}
                {getProjectTeammates(selectedProj.id).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      className="inp"
                      placeholder="🔍 Search assigned teammates by name, role, or discipline..."
                      value={projectTeammateSearchQuery}
                      onChange={e => setProjectTeammateSearchQuery(e.target.value)}
                      style={{ background: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 12, border: "1px solid var(--line)" }}
                    />
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                  {getProjectTeammates(selectedProj.id)
                    .filter(u => {
                      if (!projectTeammateSearchQuery.trim()) return true;
                      const q = projectTeammateSearchQuery.toLowerCase();
                      return (u.name || "").toLowerCase().includes(q) ||
                             (u.role || "").toLowerCase().includes(q) ||
                             (u.discipline || "").toLowerCase().includes(q) ||
                             (u.username || "").toLowerCase().includes(q);
                    })
                    .map(u => {
                      const mateTasks = (db.tasks || []).filter(t => 
                        (String(t.projectId) === String(selectedProj.id) || String(t.projectId) === String(selectedProj.uuid)) && 
                        (String(t.assignee) === String(u.id) || String(t.assignee) === String(u.uuid) || (u.name && t.assignee && String(t.assignee).toLowerCase() === u.name.toLowerCase()))
                      );
                      const primaryTask = mateTasks[0];
                      const taskTitle = primaryTask ? primaryTask.title : (u.taskName || u.initialTask || u.taskTitle || `${u.name} - Project Assignment`);
                      const percent = primaryTask ? (primaryTask.percent !== undefined ? primaryTask.percent : (primaryTask.status === "Done" ? 100 : 0)) : (u.progress !== undefined ? u.progress : 0);
                      const taskStatus = primaryTask ? primaryTask.status : "In Progress";

                      return (
                        <div
                          key={u.id || u.uuid}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            padding: "16px 18px",
                            background: "#ffffff",
                            borderRadius: 14,
                            border: "1px solid var(--line)",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                            transition: "all 0.2s ease"
                          }}
                        >
                          {/* 1. TOP HEADER: Teammate Name & Role + Edit/Remove Options */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <Avatar name={u.name} size={38} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", lineHeight: 1.2 }}>
                                  {u.name}
                                </div>
                                <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600, marginTop: 2 }}>
                                  {u.role || u.discipline || "Staff"} · <span style={{ color: "var(--accent2)" }}>{u.discipline || "Engineering"}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <button
                                onClick={() => startEditUser(u)}
                                title="Edit Teammate Details"
                                style={{
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  borderRadius: 7,
                                  padding: "4px 8px",
                                  color: "#2563eb",
                                  cursor: "pointer",
                                  fontSize: 11.5,
                                  fontWeight: 700
                                }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleRemoveTeammate(selectedProj.id, u.id)}
                                title="Remove Teammate"
                                style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  borderRadius: 7,
                                  padding: "4px 8px",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  fontSize: 11.5,
                                  fontWeight: 700
                                }}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>

                          {/* 2. MIDDLE SECTION: Task Name */}
                          <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}>
                            <span style={{ color: "#475569", fontWeight: 600 }}>📍 Task: </span>
                            <span style={{ fontWeight: 700, color: "var(--ink)" }}>{taskTitle}</span>
                          </div>

                          {/* 3. BOTTOM SECTION: Sleek Progress Bar & Percentage */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, fontWeight: 700 }}>
                              <span style={{ color: "#64748b" }}>Task Completion</span>
                              <span style={{ color: "var(--accent2)" }}>{percent}%</span>
                            </div>
                            <Bar value={percent} color={barColor(percent)} />
                          </div>
                        </div>
                      );
                    })}
                  {getProjectTeammates(selectedProj.id).length === 0 && (
                    <div style={{ padding: "20px 16px", borderRadius: 12, border: "1px dashed var(--line)", textAlign: "center", background: "var(--surface)" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>👥</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>No teammates assigned yet</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4, marginBottom: 12 }}>
                        Add engineering teammates to assign tasks and collaborate on this project.
                      </div>
                      <button className="btn sm" onClick={() => setModal({ type: "user", projectId: selectedProj.id })} style={{ background: "var(--accent)", color: "#fff" }}>
                        ＋ Assign First Teammate
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress and Timeline */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, marginBottom: 6 }}>Timeline</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                    {fmt(selectedProj.start)} to {fmt(selectedProj.end)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, marginBottom: 6 }}>Progress ({selectedProj.progress}%)</div>
                  <Bar value={selectedProj.progress} color={barColor(selectedProj.progress)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="card empty">Select a project to view admin details.</div>
          )}
        </div>
      )}

      {/* TEAMMATES & TEAMS ADMIN TAB */}
      {subTab === "users" && (
        <div className="split-1-18">
          {/* Left Master List: Existing Teams */}
          <div className="card" style={{ padding: 18, background: "#fff", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 className="disp" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Existing Teams</h3>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Select a team or search employee roster</div>
              </div>
              <button className="btn sm" onClick={() => setModal({ type: "user" })}>
                ＋ Add Member
              </button>
            </div>

            {/* Employee Search Input Bar */}
            <div>
              <input
                type="text"
                className="inp"
                placeholder="🔍 Search employee by name, role, or discipline..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                style={{ background: "#fafafa", fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)" }}
              />
            </div>

            {/* Search Results List when search query is typed */}
            {userSearchQuery.trim() ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "40vh", overflowY: "auto", borderBottom: "1px dashed var(--line)", paddingBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--accent)" }}>
                  Matching Employees ({db.users.filter(u => (u.name || "").toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.role || "").toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.discipline || "").toLowerCase().includes(userSearchQuery.toLowerCase())).length})
                </div>
                {db.users
                  .filter(u => (u.name || "").toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.role || "").toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.discipline || "").toLowerCase().includes(userSearchQuery.toLowerCase()))
                  .map(u => (
                    <div
                      key={u.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        background: "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10
                      }}
                    >
                      <Avatar name={u.name} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{u.role || "Staff"} · {u.discipline || "Engineering"}</div>
                      </div>
                      <button
                        className="btn sec sm"
                        style={{ fontSize: 10.5, padding: "3px 7px" }}
                        onClick={() => startEditUser(u)}
                      >
                        ✏ Edit
                      </button>
                    </div>
                  ))}
                {db.users.filter(u => (u.name || "").toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.role || "").toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.discipline || "").toLowerCase().includes(userSearchQuery.toLowerCase())).length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--muted)", padding: 8 }}>No employee matches "{userSearchQuery}"</div>
                )}
              </div>
            ) : null}

            {/* Existing Teams List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "50vh", overflowY: "auto" }}>
              {db.projects.map(p => {
                const pTeammates = getProjectTeammates(p.id);
                const pClient = getClientForProject(p);
                const isSelected = (selTeamId || db.projects[0]?.id) === p.id;
                
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelTeamId(p.id);
                      setIsEditingUser(false);
                    }}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: isSelected ? "1.5px solid var(--accent2)" : "1px solid var(--line)",
                      background: isSelected ? "var(--surface)" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>
                        {p.name} Team
                      </span>
                      <span className="pill" style={{ fontSize: 10.5 }}>
                        {pTeammates.length} teammate{pTeammates.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                      <span>Client: <strong style={{ color: "var(--ink)" }}>{pClient ? pClient.name : "N/A"}</strong></span>
                      <Tag label={p.status} color={statusColor(p.status, db.settings.projectStatuses)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Detail Pane: Who is PM, Who is Client, Who are Teammates */}
          {activeTeamProj ? (
            <div className="card" style={{ padding: 24, background: "#fff", display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
                <div>
                  <h2 className="disp" style={{ fontWeight: 800, fontSize: 22, color: "var(--ink)", margin: 0 }}>
                    {activeTeamProj.name} Team Details
                  </h2>
                  <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    Project team structure, leadership, client, and assigned teammates.
                  </p>
                </div>
                <Tag label={activeTeamProj.status} color={statusColor(activeTeamProj.status, db.settings.projectStatuses)} />
              </div>

              {/* SECTION 1: WHO IS THE PROJECT MANAGER */}
              <div style={{ padding: 18, background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 14, border: "1px solid var(--line)" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>👔</span> Project Manager (Team Leader)
                </div>
                {activeTeamPM ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <Avatar name={activeTeamPM.name} size={48} />
                      <div>
                        <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 16 }}>{activeTeamPM.name}</div>
                        <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                          {activeTeamPM.role} · <span style={{ color: "var(--accent2)", fontWeight: 600 }}>{activeTeamPM.discipline || "MEP & Management"}</span>
                        </div>
                        {activeTeamPM.email && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>✉ {activeTeamPM.email}</div>}
                      </div>
                    </div>
                    {isEditingUser && editUserForm?.id === activeTeamPM.id ? (
                      <span className="pill" style={{ background: "var(--accent)", color: "#fff" }}>Editing PM...</span>
                    ) : (
                      <button className="btn sec sm" onClick={() => startEditUser(activeTeamPM)}>
                        ✏ Edit PM
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="empty" style={{ padding: 12, fontSize: 12.5 }}>No Project Manager assigned.</div>
                )}
              </div>

              {/* SECTION 2: WHO IS THE CLIENT */}
              <div style={{ padding: 18, background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", borderRadius: 14, border: "1px solid #bae6fd" }}>
                <div style={{ fontSize: 11, color: "#0369a1", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🏢</span> Client Organization
                </div>
                {activeTeamClient ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <Avatar name={activeTeamClient.name} size={48} />
                      <div>
                        <div style={{ fontWeight: 800, color: "#0c4a6e", fontSize: 16 }}>{activeTeamClient.name}</div>
                        <div style={{ fontSize: 12.5, color: "#0369a1", marginTop: 2 }}>
                          Sector: <strong>{activeTeamClient.sector || "General"}</strong> · Contact: <strong>{activeTeamClient.contactName || activeTeamClient.name}</strong>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#0284c7", marginTop: 2 }}>
                          ✉ {activeTeamClient.email || activeTeamClient.contact || "N/A"} {activeTeamClient.phone ? `· 📞 ${activeTeamClient.phone}` : ""}
                        </div>
                      </div>
                    </div>
                    <button className="btn sec sm" onClick={() => { setSelClientId(activeTeamClient.id); setSubTab("clients"); }}>
                      🏢 View Client Profile
                    </button>
                  </div>
                ) : (
                  <div className="empty" style={{ padding: 12, fontSize: 12.5 }}>No client linked to this team.</div>
                )}
              </div>

              {/* SECTION 3: WHO ARE THE TEAMMATES IN THIS TEAM */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>👥</span> Teammates in this Team ({activeTeamTeammates.length})
                  </div>
                  <button className="btn sm" onClick={() => setModal({ type: "user", projectId: activeTeamProj?.id })}>
                    ＋ Add Teammate
                  </button>
                </div>

                {/* Search Teammates Input Box */}
                <div style={{ marginBottom: 14 }}>
                  <input
                    type="text"
                    className="inp"
                    placeholder="🔍 Search teammates by name, role, or discipline..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    style={{ background: "#fff", borderRadius: 10, padding: "9px 14px", border: "1px solid var(--line)" }}
                  />
                </div>

                {/* Inline Editing for selected teammate */}
                {isEditingUser && editUserForm ? (
                  <div className="card" style={{ padding: 20, background: "#fff", border: "1.5px solid var(--accent2)", borderRadius: 14, marginBottom: 16 }}>
                    <h3 className="disp" style={{ margin: "0 0 14px 0", fontSize: 16 }}>Edit Teammate: {editUserForm.name}</h3>
                    <Field l="Full Name">
                      <input className="inp" value={editUserForm.name} onChange={e => setEditVal("name", e.target.value)} />
                    </Field>
                    <div className="row2" style={{ marginTop: 10 }}>
                      <Field l="Username">
                        <input className="inp" value={editUserForm.username} onChange={e => setEditVal("username", e.target.value)} />
                      </Field>
                      <Field l="Password">
                        <input className="inp" type="text" value={editUserForm.password} onChange={e => setEditVal("password", e.target.value)} />
                      </Field>
                    </div>
                    <div className="row2" style={{ marginTop: 10 }}>
                      <Field l="Role Title">
                        <input className="inp" value={editUserForm.role} onChange={e => setEditVal("role", e.target.value)} />
                      </Field>
                      <Field l="Discipline Group">
                        <select className="inp" value={editUserForm.discipline} onChange={e => setEditVal("discipline", e.target.value)}>
                          {db.settings.disciplines.map(d => <option key={d}>{d}</option>)}
                        </select>
                      </Field>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                      <button className="btn sec sm" onClick={() => setIsEditingUser(false)}>Cancel</button>
                      <button className="btn sm" onClick={saveEditedUser}>Save Changes</button>
                    </div>
                  </div>
                ) : null}

                {/* List of Teammates */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                  {activeTeamTeammates
                    .filter(u => {
                      if (!userSearchQuery.trim()) return true;
                      const q = userSearchQuery.toLowerCase();
                      return (u.name || "").toLowerCase().includes(q) ||
                             (u.role || "").toLowerCase().includes(q) ||
                             (u.discipline || "").toLowerCase().includes(q) ||
                             (u.username || "").toLowerCase().includes(q);
                    })
                    .map((u) => {
                    const mateTasks = (db.tasks || []).filter(t => 
                      (String(t.projectId) === String(activeTeamProj?.id) || String(t.projectId) === String(activeTeamProj?.uuid) || String(t.projectId) === String(activeTeamProj?.name)) && 
                      (String(t.assignee) === String(u.id) || String(t.assignee) === String(u.uuid) || (u.name && t.assignee && String(t.assignee).toLowerCase() === u.name.toLowerCase()))
                    );
                    const primaryTask = mateTasks[0];
                    const assignedTaskTitle = primaryTask ? primaryTask.title : (u.taskName || u.initialTask || u.taskTitle || `${u.name} - Project Assignment`);
                    const percent = primaryTask ? (primaryTask.percent !== undefined ? primaryTask.percent : (primaryTask.status === "Done" ? 100 : 0)) : (u.progress !== undefined ? u.progress : 0);

                    return (
                      <div
                        key={u.id || u.uuid}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          padding: "16px 18px",
                          background: "#ffffff",
                          borderRadius: 14,
                          border: "1px solid var(--line)",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {/* 1. TOP HEADER: Teammate Name & Role + Edit/Remove Options */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar name={u.name} size={40} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", lineHeight: 1.2 }}>
                                {u.name}
                              </div>
                              <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600, marginTop: 2 }}>
                                {u.role || u.discipline || "Staff"} · <span style={{ color: "var(--accent2)" }}>{u.discipline || "Engineering"}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              onClick={() => startEditUser(u)}
                              title="Edit Teammate Details"
                              style={{
                                background: "#eff6ff",
                                border: "1px solid #bfdbfe",
                                borderRadius: 7,
                                padding: "4px 8px",
                                color: "#2563eb",
                                cursor: "pointer",
                                fontSize: 11.5,
                                fontWeight: 700
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleRemoveTeammate(activeTeamProj.id, u.id)}
                              title="Remove Teammate"
                              style={{
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                borderRadius: 7,
                                padding: "4px 8px",
                                color: "#dc2626",
                                cursor: "pointer",
                                fontSize: 11.5,
                                fontWeight: 700
                              }}
                            >
                              🗑️ Remove
                            </button>
                          </div>
                        </div>

                        {/* 2. MIDDLE SECTION: Task Name */}
                        <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}>
                          <span style={{ color: "#475569", fontWeight: 600 }}>📍 Task: </span>
                          <span style={{ fontWeight: 700, color: "var(--ink)" }}>{assignedTaskTitle}</span>
                        </div>

                        {/* 3. BOTTOM SECTION: Sleek Progress Bar & Percentage */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, fontWeight: 700 }}>
                            <span style={{ color: "#64748b" }}>Task Completion</span>
                            <span style={{ color: "var(--accent2)" }}>{percent}%</span>
                          </div>
                          <Bar value={percent} color={barColor(percent)} />
                        </div>
                      </div>
                    );
                  })}

                  {activeTeamTeammates.length === 0 && (
                    <div className="empty" style={{ padding: 24, textAlign: "center" }}>
                      No teammates assigned to tasks in the {activeTeamProj.name} team yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="card empty">Select a team from the left list to view details.</div>
          )}
        </div>
      )}

      {/* CLIENTS ADMIN TAB */}
      {subTab === "clients" && (
        <div className="split-1-18">
          {/* Clients List Master Pane */}
          <div className="card" style={{ padding: 18, background: "#fff", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="h3 disp" style={{ margin: 0 }}>Clients Directory</div>
              <button className="btn sm" onClick={() => setModal({ type: "client" })}>
                ＋ Create Client
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
              {db.clients.map(c => {
                const clientProjects = getClientProjects(c);
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelClientId(c.id);
                      setIsEditingClient(false);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: selClientId === c.id ? "1px solid var(--accent2)" : "1px solid var(--line)",
                      background: selClientId === c.id ? "var(--surface)" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{c.name}</span>
                      <span className="pill" style={{ fontSize: 10.5 }}>{clientProjects.length} Project{clientProjects.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                      {c.sector}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Client Details / Editor Pane */}
          {selectedClient ? (
            isEditingClient && editClientForm ? (
              /* Inline Edit Mode */
              <div className="card" style={{ padding: 24, background: "#fff", display: "flex", flexDirection: "column", gap: 18 }}>
                <div className="h3 disp" style={{ margin: 0, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                  Edit Client Details
                </div>
                
                <Field l="Client Name">
                  <input className="inp" value={editClientForm.name} onChange={e => setEditClientVal("name", e.target.value)} />
                </Field>

                <Field l="Sector">
                  <input className="inp" value={editClientForm.sector} onChange={e => setEditClientVal("sector", e.target.value)} />
                </Field>

                {/* ASSIGNED PROJECT MANAGER WITH SEARCH BAR */}
                <Field l="Assigned Project Manager / Staff Lead">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      type="text"
                      className="inp"
                      placeholder="🔍 Search existing staff by name, role, or discipline..."
                      value={editPmSearchQuery}
                      onChange={e => setEditPmSearchQuery(e.target.value)}
                      style={{ fontSize: 12, padding: "6px 10px", background: "#f8fafc" }}
                    />
                    <select
                      className="inp"
                      value={editClientForm.projectManagerId}
                      onChange={e => setEditClientVal("projectManagerId", e.target.value)}
                    >
                      {(db.users || [])
                        .filter(u => !u.role?.toLowerCase().includes("client") && !u.userType?.toLowerCase().includes("client"))
                        .filter(u =>
                          (u.name || "").toLowerCase().includes(editPmSearchQuery.toLowerCase()) ||
                          (u.role || "").toLowerCase().includes(editPmSearchQuery.toLowerCase()) ||
                          (u.discipline || "").toLowerCase().includes(editPmSearchQuery.toLowerCase())
                        )
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name === "You" ? "Administrator" : u.name} {u.role ? `(${u.role})` : ""}
                          </option>
                        ))}
                      {(db.users || [])
                        .filter(u => !u.role?.toLowerCase().includes("client") && !u.userType?.toLowerCase().includes("client"))
                        .filter(u =>
                          (u.name || "").toLowerCase().includes(editPmSearchQuery.toLowerCase()) ||
                          (u.role || "").toLowerCase().includes(editPmSearchQuery.toLowerCase()) ||
                          (u.discipline || "").toLowerCase().includes(editPmSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <option value="" disabled>No matching staff found</option>
                        )}
                    </select>
                  </div>
                </Field>

                <div className="row2">
                  <Field l="Contact Email">
                    <input className="inp" value={editClientForm.email} onChange={e => setEditClientVal("email", e.target.value)} />
                  </Field>
                  <Field l="Contact Phone">
                    <input className="inp" value={editClientForm.phone} onChange={e => setEditClientVal("phone", e.target.value)} />
                  </Field>
                </div>

                <div className="row2" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <Field l="Portal Username">
                    <input className="inp" value={editClientForm.username} onChange={e => setEditClientVal("username", e.target.value)} />
                  </Field>
                  <Field l="Portal Password">
                    <input className="inp" type="text" value={editClientForm.password} onChange={e => setEditClientVal("password", e.target.value)} />
                  </Field>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                  <button className="btn sec sm" onClick={() => setIsEditingClient(false)}>Cancel</button>
                  <button className="btn sm" onClick={saveEditedClient}>Save Changes</button>
                </div>
              </div>
            ) : (
              /* Details View Mode */
              <div className="card" style={{ padding: 24, background: "#fff", display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <Avatar name={selectedClient.name} size={64} />
                    <div>
                      <h2 className="disp" style={{ fontWeight: 800, fontSize: 22, color: "var(--ink)" }}>{selectedClient.name}</h2>
                      <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
                        Sector: {selectedClient.sector}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn sec sm" onClick={() => startEditClient(selectedClient)}>
                      ✏ Edit Details
                    </button>
                    <button className="btn sec sm" style={{ color: "var(--red)", borderColor: "var(--red)" }} onClick={() => handleDeleteClient(selectedClient.id)}>
                      🗑 Delete Client
                    </button>
                  </div>
                </div>

                {/* Contact and Credentials Details Grid */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Contact Info Card */}
                  <div style={{ padding: 18, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600 }}>
                      Contact Information
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
                      <div>
                        <div className="muted" style={{ fontSize: 11.5 }}>Email ID</div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2, wordBreak: "break-all" }}>{selectedClient.email || selectedClient.contact || "—"}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 11.5 }}>Contact Number</div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{selectedClient.phone || "—"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Project Manager Card */}
                  <div style={{ padding: 18, background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>👔</span> Assigned Project Manager / Staff Lead
                    </div>
                    {(() => {
                      const pm = db.users.find(u => String(u.id) === String(selectedClient.projectManagerId) || String(u.uuid) === String(selectedClient.projectManagerId)) || getProjectManager();
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Avatar name={pm.name} size={40} />
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>{pm.name}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                              {pm.role || "Project Manager"} · <span style={{ color: "var(--accent2)", fontWeight: 600 }}>{pm.discipline || "MEP"}</span>
                            </div>
                            {pm.email && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>✉ {pm.email}</div>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Portal Credentials Card */}
                  <div style={{ padding: 18, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600 }}>
                      Client Portal Security Credentials
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
                      <div>
                        <div className="muted" style={{ fontSize: 11.5 }}>Username</div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{selectedClient.username || "—"}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                          Password
                          <button
                            onClick={() => setShowClientPassword(!showClientPassword)}
                            style={{ border: "none", background: "none", color: "var(--accent2)", fontSize: 10, cursor: "pointer", fontWeight: 600 }}
                          >
                            {showClientPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                          {selectedClient.password ? (showClientPassword ? selectedClient.password : "••••••••") : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Committed Projects */}
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, marginBottom: 12 }}>
                    Committed Projects ({getClientProjects(selectedClient).length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {getClientProjects(selectedClient).map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelProjectId(p.id);
                          setSubTab("projects");
                        }}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--line)",
                          borderRadius: 12,
                          padding: "12px 18px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--accent2)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(47, 93, 138, 0.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--line)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>{p.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
                            Service: {p.category} · PM: <span style={{ fontWeight: 600, color: "var(--accent2)" }}>{getProjectManager(p.id).name}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <Tag label={p.status} color={statusColor(p.status, db.settings.projectStatuses)} />
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
                            Progress: {p.progress}%
                          </div>
                        </div>
                      </div>
                    ))}
                    {db.projects.filter(p => p.clientId === selectedClient.id).length === 0 && (
                      <div className="empty" style={{ padding: 20 }}>
                        No projects committed yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="card empty">Select a client to view admin details.</div>
          )}
        </div>
      )}
      {isEditingUser && editUserForm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 20
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 520, padding: 24, background: "#fff", borderRadius: 16, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
              <div className="h3 disp" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Edit Teammate Details</div>
              <button onClick={() => setIsEditingUser(false)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Full Name</label>
                <input className="inp" value={editUserForm.name || ""} onChange={e => setEditVal("name", e.target.value)} />
              </div>
              <div className="row2">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Role Title</label>
                  <input className="inp" value={editUserForm.role || ""} onChange={e => setEditVal("role", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Discipline Group</label>
                  <select className="inp" value={editUserForm.discipline || ""} onChange={e => setEditVal("discipline", e.target.value)}>
                    {(db.settings?.disciplines || ["Architecture", "Structure", "HVAC", "Electrical", "Plumbing", "Fire"]).map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="row2">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Mail ID (Email)</label>
                  <input className="inp" value={editUserForm.email || ""} onChange={e => setEditVal("email", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Contact Number (Phone)</label>
                  <input className="inp" value={editUserForm.phone || ""} onChange={e => setEditVal("phone", e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <button className="btn sec sm" onClick={() => setIsEditingUser(false)}>Cancel</button>
              <button
                className="btn sm"
                onClick={saveEditedUser}
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
