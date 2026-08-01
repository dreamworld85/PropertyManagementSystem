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
  const [adminProjectSearchQuery, setAdminProjectSearchQuery] = useState("");
  const [adminClientSearchQuery, setAdminClientSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

  // Admin Document & Financial States and Handlers
  const [adminDocInput, setAdminDocInput] = useState("");
  const [isAdminEditingCost, setIsAdminEditingCost] = useState(false);
  const [adminCostVal, setAdminCostVal] = useState(0);

  const handleAdminDocStatusChange = async (docId, newStatus) => {
    const docObj = (db.project_documents || db.documents || []).find(d => String(d.id || d.uuid) === String(docId));
    if (docObj) {
      docObj.status = newStatus;
    }
    try {
      await fetch(`/api/documents/${docId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch(e) {}
  };

  const handleAdminDocUpload = async (doc, file) => {
    if (!file || !doc) return;
    const docId = doc.id || doc.uuid;
    doc.fileName = file.name;
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentId', docId);
    try {
      await fetch('/api/upload-document', {
        method: 'POST',
        body: formData
      });
    } catch(e) {}
  };

  const handleAdminAddDoc = async (projId) => {
    if (!adminDocInput.trim()) return;
    const docName = adminDocInput.trim();
    setAdminDocInput("");
    const newDoc = {
      id: `doc_${Date.now()}`,
      uuid: `doc_${Date.now()}`,
      projectId: projId,
      documentName: docName,
      status: "Pending",
      fileName: null
    };
    if (!db.project_documents) db.project_documents = [];
    db.project_documents.push(newDoc);

    try {
      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projId, documentName: docName })
      });
    } catch(e) {}
  };

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
        <div className="split-1-18" style={{ gap: 10 }}>
          {/* Projects List Master Pane */}
          <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 14, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="h3 disp" style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>Projects List</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{db.projects.length} Total Projects</div>
              </div>
              <button className="btn sm" onClick={() => setModal({ type: "project" })} style={{ background: "var(--accent)", color: "#fff", fontWeight: 700, borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                ＋ Create
              </button>
            </div>

            {/* Filter Search Input */}
            <input
              type="text"
              className="inp"
              placeholder="🔍 Filter projects..."
              value={adminProjectSearchQuery}
              onChange={(e) => setAdminProjectSearchQuery(e.target.value)}
              style={{ fontSize: 11.5, padding: "5px 8px", background: "#f8fafc" }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 180px)", overflowY: "auto", paddingRight: 2 }}>
              {db.projects
                .filter(p => !adminProjectSearchQuery.trim() || p.name.toLowerCase().includes(adminProjectSearchQuery.toLowerCase()))
                .map(p => {
                  const isSelected = selProjectId === p.id;
                  const pClient = db.clients.find(c => String(c.id) === String(p.clientId) || String(c.uuid) === String(p.clientId));

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelProjectId(p.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        background: isSelected ? "#f0f7ff" : "#ffffff",
                        boxShadow: isSelected ? "0 2px 8px rgba(37,99,235,0.08)" : "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: isSelected ? "#1e40af" : "var(--ink)" }}>{p.name}</span>
                        <Tag label={p.status} color={statusColor(p.status, db.settings.projectStatuses)} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: "#64748b", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{pClient?.name || p.clientName || "—"}</span>
                        <span style={{ fontWeight: 800, color: isSelected ? "#2563eb" : "var(--ink)" }}>{p.progress || 0}%</span>
                      </div>
                      <Bar value={p.progress || 0} color={barColor(p.progress || 0)} />
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Project Details Pane */}
          {selectedProj ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              
              {/* TOP HEADER CONTROL BANNER */}
              {isEditingProject && editProjForm ? (
                <div className="card" style={{ padding: 20, background: "#fff", borderRadius: 16, border: "1.5px solid var(--accent2)", display: "flex", flexDirection: "column", gap: 16 }}>
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
                <>
                  <div className="card" style={{ padding: "8px 12px", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderRadius: 10, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h2 className="disp" style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#fff" }}>{selectedProj.name}</h2>
                      <Tag label={selectedProj.status} color={statusColor(selectedProj.status, db.settings.projectStatuses)} />
                    </div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>
                      Category: <strong style={{ color: "#38bdf8" }}>{selectedProj.category || "Full Engineering"}</strong> · Start: <strong style={{ color: "#e2e8f0" }}>{fmt(selectedProj.start)}</strong> · Target: <strong style={{ color: "#e2e8f0" }}>{fmt(selectedProj.end)}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ width: 130 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, marginBottom: 2, color: "#94a3b8" }}>
                        <span>PROGRESS</span>
                        <span style={{ color: "#38bdf8", fontWeight: 800 }}>{selectedProj.progress || 0}%</span>
                      </div>
                      <Bar value={selectedProj.progress || 0} color="#38bdf8" />
                    </div>

                    <button
                      className="btn sm"
                      onClick={() => startEditProject(selectedProj)}
                      style={{ background: "#3b82f6", color: "#fff", border: "none", fontWeight: 700, padding: "4px 10px", borderRadius: 6, fontSize: 10.5, cursor: "pointer" }}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
               {/* 2-COLUMN SIDE-BY-SIDE GRID CONTAINER */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
                
                {/* LEFT COLUMN: PM + Client Combo & Financial Overview */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  
                  {/* COMBINED PM & CLIENT INFO ROW CARD */}
                  <div className="card" style={{ padding: 10, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    
                    {/* PM Box */}
                    <div style={{ padding: "8px 10px", background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <span>👔</span> Project Manager
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar name={getProjectManager(selectedProj).name} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{getProjectManager(selectedProj).name}</div>
                          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1 }}>{getProjectManager(selectedProj).role}</div>
                        </div>
                      </div>
                    </div>

                    {/* Client Box */}
                    <div style={{ padding: "8px 10px", background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                      <div style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <span>🏢</span> Client Org
                      </div>
                      {getClientForProject(selectedProj) || selectedProj.clientName ? (
                        (() => {
                          const c = getClientForProject(selectedProj) || { name: selectedProj.clientName, sector: selectedProj.clientSector };
                          return (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Avatar name={c.name} size={32} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{c.name}</div>
                                <div style={{ fontSize: 10.5, color: "var(--accent2)", fontWeight: 700, marginTop: 1 }}>{c.sector || "Commercial"}</div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>No client assigned</div>
                      )}
                    </div>
                  </div>

                  {/* FINANCIAL OVERVIEW & BILLING CARD */}
                  {(() => {
                    const pMatches = [
                      String(selectedProj.id).toLowerCase(),
                      String(selectedProj.uuid || '').toLowerCase(),
                      String(selectedProj.db_id || '').toLowerCase()
                    ];
                    const pInvoices = (db.invoices || []).filter(i => i.projectId && pMatches.includes(String(i.projectId).toLowerCase()));
                    const pCost = Number(selectedProj.totalCost !== undefined ? selectedProj.totalCost : (selectedProj.total_cost || 0));
                    const pTotalInvoiced = pInvoices.filter(i => i.status !== "Draft").reduce((sum, i) => sum + Number(i.amount || 0), 0);
                    const pTotalPaid = pInvoices.filter(i => i.status === "Paid").reduce((sum, i) => sum + Number(i.amount || 0), 0);
                    const pOutstanding = pCost > 0 ? Math.max(0, pCost - pTotalPaid) : Math.max(0, pTotalInvoiced - pTotalPaid);
                    const pPaidPercent = pCost > 0 ? Math.min(100, Math.round((pTotalPaid / pCost) * 100)) : (pTotalInvoiced > 0 ? Math.min(100, Math.round((pTotalPaid / pTotalInvoiced) * 100)) : 0);

                    return (
                      <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 4 }}>
                            💳 Financial Overview & Billing
                          </span>
                          <span className="pill" style={{ background: "#dcfce7", color: "#15803d", fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>
                            {pPaidPercent}% Paid
                          </span>
                        </div>

                        {/* 4 Metric Chips in 1 Row */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                          {/* Total Cost */}
                          <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 9.5, color: "#64748b", fontWeight: 700 }}>Total Cost</span>
                              {!isAdminEditingCost ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdminCostVal(pCost);
                                    setIsAdminEditingCost(true);
                                  }}
                                  style={{ background: "#eff6ff", border: "none", color: "#2563eb", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
                                >
                                  ✏️
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = Number(adminCostVal) || 0;
                                    selectedProj.totalCost = val;
                                    selectedProj.total_cost = val;
                                    if (updateProject) updateProject(selectedProj);
                                    setIsAdminEditingCost(false);
                                    fetch(`/api/projects/${selectedProj.id}/total-cost`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ totalCost: val })
                                    }).catch(() => {});
                                  }}
                                  style={{ background: "#dcfce7", border: "none", color: "#166534", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
                                >
                                  ✓
                                </button>
                              )}
                            </div>
                            {!isAdminEditingCost ? (
                              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>${pCost.toLocaleString()}</div>
                            ) : (
                              <input
                                type="number"
                                className="inp"
                                value={adminCostVal}
                                onChange={(e) => setAdminCostVal(e.target.value)}
                                style={{ fontSize: 11, padding: "2px 4px", marginTop: 2, width: "100%" }}
                              />
                            )}
                          </div>

                          {/* Total Paid */}
                          <div style={{ padding: "6px 8px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                            <div style={{ fontSize: 9.5, color: "#166534", fontWeight: 700 }}>Paid</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#15803d", marginTop: 2 }}>${pTotalPaid.toLocaleString()}</div>
                          </div>

                          {/* Total Invoiced */}
                          <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: 9.5, color: "#64748b", fontWeight: 700 }}>Invoiced</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>${pTotalInvoiced.toLocaleString()}</div>
                          </div>

                          {/* Outstanding */}
                          <div style={{ padding: "6px 8px", background: "#fff7ed", borderRadius: 8, border: "1px solid #fed7aa" }}>
                            <div style={{ fontSize: 9.5, color: "#c2410c", fontWeight: 700 }}>Due</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#c2410c", marginTop: 2 }}>${pOutstanding.toLocaleString()}</div>
                          </div>
                        </div>

                        {/* Invoices List / Table */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b" }}>Invoices ({pInvoices.length})</span>
                            <button
                              className="btn sm"
                              onClick={() => setModal({ type: "invoice", projectId: selectedProj.id })}
                              style={{ background: "#2563eb", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}
                            >
                              ＋ Issue Invoice
                            </button>
                          </div>

                          {pInvoices.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 100, overflowY: "auto" }}>
                              {pInvoices.map((inv) => (
                                <div key={inv.id || inv.invoiceNumber} style={{ padding: "4px 8px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div>
                                    <span style={{ fontWeight: 800, fontSize: 11.5, color: "var(--ink)" }}>{inv.invoiceNumber || inv.id}</span>
                                    <span style={{ fontSize: 10, color: "#64748b", marginLeft: 6 }}>Due: {inv.dueDate || "N/A"}</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontWeight: 800, fontSize: 11.5, color: "var(--ink)" }}>${Number(inv.amount || 0).toLocaleString()}</span>
                                    <Tag label={inv.status || "Pending"} color={inv.status === "Paid" ? "#22c55e" : "#f59e0b"} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ padding: 6, textAlign: "center", fontSize: 10.5, color: "#94a3b8", fontStyle: "italic", background: "#f8fafc", borderRadius: 6 }}>
                              No invoices issued for this project yet.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* RIGHT COLUMN: Teammates & Compliance Documents */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  
                  {/* ASSIGNED TEAMMATES CARD */}
                  <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 4 }}>
                        <span>👥</span> Teammates ({getProjectTeammates(selectedProj.id).length})
                      </div>
                      <button
                        className="btn sm"
                        onClick={() => setModal({ type: "user", projectId: selectedProj.id })}
                        style={{ background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 10.5, padding: "3px 8px", borderRadius: 6 }}
                      >
                        ＋ Add Teammate
                      </button>
                    </div>

                    {/* Scrollable Small Box Grid of Teammates */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 6, maxHeight: 170, overflowY: "auto", paddingRight: 2 }}>
                      {getProjectTeammates(selectedProj.id)
                        .filter(u => {
                          if (!projectTeammateSearchQuery.trim()) return true;
                          const q = projectTeammateSearchQuery.toLowerCase();
                          return (u.name || "").toLowerCase().includes(q) ||
                                 (u.role || "").toLowerCase().includes(q);
                        })
                        .map(u => {
                          const mateTasks = (db.tasks || []).filter(t => 
                            (String(t.projectId) === String(selectedProj.id) || String(t.projectId) === String(selectedProj.uuid)) && 
                            (String(t.assignee) === String(u.id) || String(t.assignee) === String(u.uuid) || (u.name && t.assignee && String(t.assignee).toLowerCase() === u.name.toLowerCase()))
                          );
                          const primaryTask = mateTasks[0];
                          const taskTitle = primaryTask ? primaryTask.title : (u.taskName || u.initialTask || u.taskTitle || `${u.name} - Assignment`);
                          const percent = primaryTask ? (primaryTask.percent !== undefined ? primaryTask.percent : (primaryTask.status === "Done" ? 100 : 0)) : (u.progress !== undefined ? u.progress : 0);

                          return (
                            <div
                              key={u.id || u.uuid}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                padding: "8px 10px",
                                background: "#ffffff",
                                borderRadius: 8,
                                border: "1px solid var(--line)"
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <Avatar name={u.name} size={28} />
                                  <div>
                                    <div style={{ fontWeight: 800, fontSize: 12, color: "var(--ink)" }}>{u.name}</div>
                                    <div style={{ fontSize: 10, color: "#64748b" }}>{u.role || "Staff"}</div>
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 2 }}>
                                  <button onClick={() => startEditUser(u)} style={{ background: "#eff6ff", border: "none", borderRadius: 4, padding: "2px 4px", color: "#2563eb", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>✏️</button>
                                  <button onClick={() => handleRemoveTeammate(selectedProj.id, u.id)} style={{ background: "#fef2f2", border: "none", borderRadius: 4, padding: "2px 4px", color: "#dc2626", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>🗑️</button>
                                </div>
                              </div>

                              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1e293b", background: "#f8fafc", padding: "3px 6px", borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                📍 {taskTitle}
                              </div>

                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, fontWeight: 700, marginBottom: 2 }}>
                                  <span style={{ color: "#64748b" }}>Completion</span>
                                  <span style={{ color: "var(--ink)" }}>{percent}%</span>
                                </div>
                                <Bar value={percent} color={barColor(percent)} />
                              </div>
                            </div>
                          );
                        })}

                      {getProjectTeammates(selectedProj.id).length === 0 && (
                        <div style={{ padding: 12, textAlign: "center", border: "1px dashed var(--line)", borderRadius: 8, background: "var(--surface)" }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: "var(--ink)" }}>No teammates assigned yet</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* REQUIRED DOCUMENT UPLOAD & COMPLIANCE CARD */}
                  {(() => {
                    const pMatches = [
                      String(selectedProj.id).toLowerCase(),
                      String(selectedProj.uuid || '').toLowerCase(),
                      String(selectedProj.db_id || '').toLowerCase()
                    ];
                    const pDocs = (db.project_documents || db.documents || []).filter(d => d.projectId && pMatches.includes(String(d.projectId).toLowerCase()));

                    return (
                      <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 4 }}>
                            📂 Compliance Documents
                          </span>
                          <span className="pill" style={{ background: "#fef3c7", color: "#b45309", fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>
                            {pDocs.length} Docs
                          </span>
                        </div>

                        {/* Scrollable Document Cards Grid (Click to View) */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 6, maxHeight: 190, overflowY: "auto", paddingRight: 2 }}>
                          {pDocs.map((doc) => {
                            const isApproved = doc.status === "Approved";
                            const isRejected = doc.status === "Rejected";
                            const badgeBg = isApproved ? "#dcfce7" : isRejected ? "#fee2e2" : "#fef3c7";
                            const badgeColor = isApproved ? "#15803d" : isRejected ? "#b91c1c" : "#b45309";

                            return (
                              <div
                                key={doc.id || doc.uuid}
                                onClick={() => setPreviewDoc(doc)}
                                style={{
                                  padding: "8px 10px",
                                  borderRadius: 8,
                                  border: `1px solid ${isApproved ? "#bbf7d0" : "#e2e8f0"}`,
                                  background: isApproved ? "#f0fdf4" : "#ffffff",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 4,
                                  cursor: "pointer",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                                  <div style={{ fontWeight: 800, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                    {doc.documentName}
                                  </div>
                                  <Tag label={doc.status || "Pending"} color={isApproved ? "#22c55e" : isRejected ? "#ef4444" : "#f59e0b"} />
                                </div>

                                <div style={{ fontSize: 10.5, color: doc.fileName ? "#2563eb" : "#64748b", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {doc.fileName ? `📎 ${doc.fileName}` : `📄 Click to view details`}
                                </div>
                              </div>
                            );
                          })}

                          {pDocs.length === 0 && (
                            <div style={{ padding: 12, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 8, background: "#f8fafc" }}>
                              <div style={{ fontWeight: 700, fontSize: 11, color: "var(--ink)" }}>No uploaded documents yet</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="card empty">Select a project to view admin details.</div>
      )}
    </div>
  )}

      {/* TEAMMATES & TEAMS ADMIN TAB */}
      {subTab === "users" && (
        <div className="split-1-18" style={{ gap: 10 }}>
          {/* Left Master List: Existing Teams */}
          <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 14, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 className="disp" style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>Existing Teams</h3>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>Select team or search employee roster</div>
              </div>
              <button className="btn sm" onClick={() => setModal({ type: "user" })} style={{ background: "var(--accent)", color: "#fff", fontWeight: 700, borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                ＋ Add Member
              </button>
            </div>

            {/* Search Input Bar */}
            <input
              type="text"
              className="inp"
              placeholder="🔍 Search employee by name, role..."
              value={userSearchQuery}
              onChange={e => setUserSearchQuery(e.target.value)}
              style={{ fontSize: 11.5, padding: "5px 8px", background: "#f8fafc" }}
            />

            {/* Search Results List when search query is typed */}
            {userSearchQuery.trim() ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 140, overflowY: "auto", borderBottom: "1px dashed var(--line)", paddingBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--accent)" }}>
                  Matching Employees ({db.users.filter(u => (u.name || "").toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.role || "").toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.discipline || "").toLowerCase().includes(userSearchQuery.toLowerCase())).length})
                </div>
                {db.users
                  .filter(u => (u.name || "").toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.role || "").toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.discipline || "").toLowerCase().includes(userSearchQuery.toLowerCase()))
                  .map(u => (
                    <div
                      key={u.id}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        background: "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <Avatar name={u.name} size={26} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>{u.role || "Staff"}</div>
                      </div>
                      <button
                        className="btn sec sm"
                        style={{ fontSize: 9.5, padding: "2px 5px" }}
                        onClick={() => startEditUser(u)}
                      >
                        ✏ Edit
                      </button>
                    </div>
                  ))}
              </div>
            ) : null}

            {/* Existing Teams List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 180px)", overflowY: "auto", paddingRight: 2 }}>
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
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      background: isSelected ? "#f0f7ff" : "#ffffff",
                      boxShadow: isSelected ? "0 2px 8px rgba(37,99,235,0.08)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: isSelected ? "#1e40af" : "var(--ink)" }}>
                        {p.name} Team
                      </span>
                      <span className="pill" style={{ fontSize: 9.5, background: isSelected ? "#dbeafe" : "#f1f5f9", color: isSelected ? "#1e40af" : "#475569", fontWeight: 700, padding: "1px 6px" }}>
                        {pTeammates.length} Mates
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: "#64748b" }}>
                      <span>Client: <strong style={{ color: "var(--ink)" }}>{pClient ? pClient.name : "N/A"}</strong></span>
                      <Tag label={p.status} color={statusColor(p.status, db.settings.projectStatuses)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Detail Pane */}
          {activeTeamProj ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* EXECUTIVE TEAM HERO BANNER */}
              <div className="card" style={{ padding: "8px 12px", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderRadius: 10, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 className="disp" style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#fff" }}>{activeTeamProj.name} Team Details</h2>
                    <Tag label={activeTeamProj.status} color={statusColor(activeTeamProj.status, db.settings.projectStatuses)} />
                  </div>
                  <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>
                    Client: <strong style={{ color: "#38bdf8" }}>{activeTeamClient?.name || "General"}</strong> · Teammates Assigned: <strong style={{ color: "#e2e8f0" }}>{activeTeamTeammates.length}</strong>
                  </div>
                </div>
              </div>

              {/* 2-COLUMN SIDE-BY-SIDE FLEX CONTAINER */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
                
                {/* LEFT COLUMN: PM & Client Info Combined */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* PM Card */}
                  <div className="card" style={{ padding: 10, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>👔</span> Project Manager (Leader)
                    </div>
                    {activeTeamPM ? (
                      <div style={{ padding: "6px 8px", background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={activeTeamPM.name} size={32} />
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 13 }}>{activeTeamPM.name}</div>
                            <div style={{ fontSize: 10.5, color: "#64748b" }}>
                              {activeTeamPM.role} · <span style={{ color: "#2563eb", fontWeight: 700 }}>{activeTeamPM.discipline || "MEP"}</span>
                            </div>
                          </div>
                        </div>
                        <button className="btn sec sm" style={{ padding: "3px 6px", fontSize: 10, fontWeight: 700 }} onClick={() => startEditUser(activeTeamPM)}>
                          ✏️ Edit
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: 8, fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>No PM assigned</div>
                    )}
                  </div>

                  {/* Client Card */}
                  <div className="card" style={{ padding: 10, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 10, color: "#0369a1", textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>🏢</span> Client Organization
                    </div>
                    {activeTeamClient ? (
                      <div style={{ padding: "6px 8px", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", borderRadius: 8, border: "1px solid #bae6fd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={activeTeamClient.name} size={32} />
                          <div>
                            <div style={{ fontWeight: 800, color: "#0c4a6e", fontSize: 13 }}>{activeTeamClient.name}</div>
                            <div style={{ fontSize: 10.5, color: "#0369a1" }}>Sector: {activeTeamClient.sector || "General"}</div>
                          </div>
                        </div>
                        <button className="btn sec sm" style={{ padding: "3px 6px", fontSize: 10, fontWeight: 700, color: "#0284c7" }} onClick={() => { setSelClientId(activeTeamClient.id); setSubTab("clients"); }}>
                          🏢 View
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: 8, fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>No client linked</div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Teammates in this Team */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 4 }}>
                        <span>👥</span> Teammates in Team ({activeTeamTeammates.length})
                      </div>
                      <button className="btn sm" onClick={() => setModal({ type: "user", projectId: activeTeamProj?.id })} style={{ background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 10.5, padding: "3px 8px", borderRadius: 6 }}>
                        ＋ Add Teammate
                      </button>
                    </div>

                    {/* Search Teammates Input Box */}
                    <input
                      type="text"
                      className="inp"
                      placeholder="🔍 Search teammates..."
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      style={{ fontSize: 11, padding: "4px 6px", background: "#f8fafc" }}
                    />

                    {/* Inline Editing for selected teammate */}
                    {isEditingUser && editUserForm ? (
                      <div style={{ padding: 10, background: "#fff", border: "1.5px solid var(--accent2)", borderRadius: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>Edit Teammate: {editUserForm.name}</div>
                        <Field l="Full Name">
                          <input className="inp" style={{ fontSize: 11, padding: "3px 6px" }} value={editUserForm.name} onChange={e => setEditVal("name", e.target.value)} />
                        </Field>
                        <div className="row2" style={{ marginTop: 6 }}>
                          <Field l="Role Title">
                            <input className="inp" style={{ fontSize: 11, padding: "3px 6px" }} value={editUserForm.role} onChange={e => setEditVal("role", e.target.value)} />
                          </Field>
                          <Field l="Discipline Group">
                            <select className="inp" style={{ fontSize: 11, padding: "3px 6px" }} value={editUserForm.discipline} onChange={e => setEditVal("discipline", e.target.value)}>
                              {db.settings.disciplines.map(d => <option key={d}>{d}</option>)}
                            </select>
                          </Field>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
                          <button className="btn sec sm" style={{ fontSize: 10 }} onClick={() => setIsEditingUser(false)}>Cancel</button>
                          <button className="btn sm" style={{ fontSize: 10, background: "var(--accent)", color: "#fff" }} onClick={saveEditedUser}>Save</button>
                        </div>
                      </div>
                    ) : null}

                    {/* Scrollable Teammates Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 6, maxHeight: 210, overflowY: "auto", paddingRight: 2 }}>
                      {activeTeamTeammates
                        .filter(u => {
                          if (!userSearchQuery.trim()) return true;
                          const q = userSearchQuery.toLowerCase();
                          return (u.name || "").toLowerCase().includes(q) ||
                                 (u.role || "").toLowerCase().includes(q) ||
                                 (u.discipline || "").toLowerCase().includes(q);
                        })
                        .map((u) => {
                        const mateTasks = (db.tasks || []).filter(t => 
                          (String(t.projectId) === String(activeTeamProj?.id) || String(t.projectId) === String(activeTeamProj?.uuid) || String(t.projectId) === String(activeTeamProj?.name)) && 
                          (String(t.assignee) === String(u.id) || String(t.assignee) === String(u.uuid) || (u.name && t.assignee && String(t.assignee).toLowerCase() === u.name.toLowerCase()))
                        );
                        const primaryTask = mateTasks[0];
                        const assignedTaskTitle = primaryTask ? primaryTask.title : (u.taskName || u.initialTask || u.taskTitle || `${u.name} - Assignment`);
                        const percent = primaryTask ? (primaryTask.percent !== undefined ? primaryTask.percent : (primaryTask.status === "Done" ? 100 : 0)) : (u.progress !== undefined ? u.progress : 0);

                        return (
                          <div
                            key={u.id || u.uuid}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              padding: "8px 10px",
                              background: "#ffffff",
                              borderRadius: 8,
                              border: "1px solid var(--line)"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <Avatar name={u.name} size={28} />
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 12, color: "var(--ink)" }}>{u.name}</div>
                                  <div style={{ fontSize: 10, color: "#64748b" }}>{u.role || "Staff"}</div>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 2 }}>
                                <button onClick={() => startEditUser(u)} style={{ background: "#eff6ff", border: "none", borderRadius: 4, padding: "2px 4px", color: "#2563eb", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>✏️</button>
                                <button onClick={() => handleRemoveTeammate(activeTeamProj.id, u.id)} style={{ background: "#fef2f2", border: "none", borderRadius: 4, padding: "2px 4px", color: "#dc2626", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>🗑️</button>
                              </div>
                            </div>

                            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1e293b", background: "#f8fafc", padding: "3px 6px", borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              📍 {assignedTaskTitle}
                            </div>

                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, fontWeight: 700, marginBottom: 2 }}>
                                <span style={{ color: "#64748b" }}>Completion</span>
                                <span style={{ color: "var(--ink)" }}>{percent}%</span>
                              </div>
                              <Bar value={percent} color={barColor(percent)} />
                            </div>
                          </div>
                        );
                      })}

                      {activeTeamTeammates.length === 0 && (
                        <div style={{ padding: 12, textAlign: "center", border: "1px dashed var(--line)", borderRadius: 8, background: "var(--surface)" }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: "var(--ink)" }}>No teammates assigned to this team</div>
                        </div>
                      )}
                    </div>
                  </div>
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
        <div className="split-1-18" style={{ gap: 10 }}>
          {/* Clients List Master Pane */}
          <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 14, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="h3 disp" style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>Clients Directory</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{db.clients.length} Total Clients</div>
              </div>
              <button className="btn sm" onClick={() => setModal({ type: "client" })} style={{ background: "var(--accent)", color: "#fff", fontWeight: 700, borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                ＋ Create
              </button>
            </div>

            {/* Filter Search Input */}
            <input
              type="text"
              className="inp"
              placeholder="🔍 Filter clients..."
              value={adminClientSearchQuery}
              onChange={(e) => setAdminClientSearchQuery(e.target.value)}
              style={{ fontSize: 11.5, padding: "5px 8px", background: "#f8fafc" }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 180px)", overflowY: "auto", paddingRight: 2 }}>
              {db.clients
                .filter(c => !adminClientSearchQuery.trim() || (c.name || "").toLowerCase().includes(adminClientSearchQuery.toLowerCase()) || (c.sector || "").toLowerCase().includes(adminClientSearchQuery.toLowerCase()))
                .map(c => {
                  const clientProjects = getClientProjects(c);
                  const isSelected = selClientId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelClientId(c.id);
                        setIsEditingClient(false);
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        background: isSelected ? "#f0f7ff" : "#ffffff",
                        boxShadow: isSelected ? "0 2px 8px rgba(37,99,235,0.08)" : "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: isSelected ? "#1e40af" : "var(--ink)" }}>{c.name}</span>
                        <span className="pill" style={{ fontSize: 9.5, background: isSelected ? "#dbeafe" : "#f1f5f9", color: isSelected ? "#1e40af" : "#475569", fontWeight: 700, padding: "1px 6px" }}>
                          {clientProjects.length} Proj
                        </span>
                      </div>
                      <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 600 }}>
                        Sector: {c.sector || "General"}
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
              <div className="card" style={{ padding: 16, background: "#fff", borderRadius: 14, border: "1.5px solid var(--accent2)", display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="h3 disp" style={{ margin: 0, fontSize: 16, fontWeight: 800, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                  ✏️ Edit Client Details: {selectedClient.name}
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field l="Client Organization Name">
                    <input className="inp" style={{ fontSize: 12, padding: "5px 8px" }} value={editClientForm.name} onChange={e => setEditClientVal("name", e.target.value)} />
                  </Field>

                  <Field l="Industry / Sector">
                    <input className="inp" style={{ fontSize: 12, padding: "5px 8px" }} value={editClientForm.sector} onChange={e => setEditClientVal("sector", e.target.value)} />
                  </Field>
                </div>

                {/* ASSIGNED PROJECT MANAGER WITH SEARCH BAR */}
                <Field l="Assigned Project Manager / Staff Lead">
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <input
                      type="text"
                      className="inp"
                      placeholder="🔍 Search existing staff by name, role, or discipline..."
                      value={editPmSearchQuery}
                      onChange={e => setEditPmSearchQuery(e.target.value)}
                      style={{ fontSize: 11, padding: "4px 8px", background: "#f8fafc" }}
                    />
                    <select
                      className="inp"
                      style={{ fontSize: 12, padding: "5px 8px" }}
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
                    </select>
                  </div>
                </Field>

                <div className="row2">
                  <Field l="Contact Email">
                    <input className="inp" style={{ fontSize: 12, padding: "5px 8px" }} value={editClientForm.email} onChange={e => setEditClientVal("email", e.target.value)} />
                  </Field>
                  <Field l="Contact Phone">
                    <input className="inp" style={{ fontSize: 12, padding: "5px 8px" }} value={editClientForm.phone} onChange={e => setEditClientVal("phone", e.target.value)} />
                  </Field>
                </div>

                <div className="row2" style={{ borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
                  <Field l="Portal Username">
                    <input className="inp" style={{ fontSize: 12, padding: "5px 8px" }} value={editClientForm.username} onChange={e => setEditClientVal("username", e.target.value)} />
                  </Field>
                  <Field l="Portal Password">
                    <input className="inp" style={{ fontSize: 12, padding: "5px 8px" }} type="text" value={editClientForm.password} onChange={e => setEditClientVal("password", e.target.value)} />
                  </Field>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                  <button className="btn sec sm" style={{ fontSize: 11 }} onClick={() => setIsEditingClient(false)}>Cancel</button>
                  <button className="btn sm" style={{ fontSize: 11, background: "var(--accent)", color: "#fff", fontWeight: 700 }} onClick={saveEditedClient}>Save Changes</button>
                </div>
              </div>
            ) : (
              /* Details View Mode */
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* EXECUTIVE CLIENT HERO BANNER */}
                <div className="card" style={{ padding: "8px 12px", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderRadius: 10, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
                    <Avatar name={selectedClient.name} size={38} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h2 className="disp" style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#fff" }}>{selectedClient.name}</h2>
                        <span className="pill" style={{ background: "rgba(56,189,248,0.2)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.4)", fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
                          {selectedClient.sector || "General Sector"}
                        </span>
                      </div>
                      <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>
                        Client Record ID: <strong style={{ color: "#e2e8f0" }}>#{selectedClient.id}</strong> · Committed Projects: <strong style={{ color: "#38bdf8" }}>{getClientProjects(selectedClient).length}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      className="btn sm"
                      onClick={() => startEditClient(selectedClient)}
                      style={{ background: "#3b82f6", color: "#fff", border: "none", fontWeight: 700, padding: "4px 10px", borderRadius: 6, fontSize: 10.5, cursor: "pointer" }}
                    >
                      ✏️ Edit Details
                    </button>
                    <button
                      className="btn sm"
                      onClick={() => handleDeleteClient(selectedClient.id)}
                      style={{ background: "#ef4444", color: "#fff", border: "none", fontWeight: 700, padding: "4px 10px", borderRadius: 6, fontSize: 10.5, cursor: "pointer" }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* 2-COLUMN SIDE-BY-SIDE FLEX CONTAINER */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
                  
                  {/* LEFT COLUMN: Contact Information & Security Credentials */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Contact Info Card */}
                    <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 11.5, color: "var(--ink)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", display: "flex", alignItems: "center", gap: 4 }}>
                        <span>🏢</span> Organization & Contact Details
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700 }}>Email Address</span>
                          <span style={{ fontWeight: 800, fontSize: 11.5, color: selectedClient.email || selectedClient.contact ? "#2563eb" : "#94a3b8" }}>
                            {selectedClient.email || selectedClient.contact || "Not specified"}
                          </span>
                        </div>

                        <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700 }}>Contact Phone</span>
                          <span style={{ fontWeight: 800, fontSize: 11.5, color: selectedClient.phone ? "#1e293b" : "#94a3b8" }}>
                            {selectedClient.phone || "Not specified"}
                          </span>
                        </div>

                        <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700 }}>Industry Sector</span>
                          <span style={{ fontWeight: 800, fontSize: 11.5, color: "var(--ink)" }}>
                            {selectedClient.sector || "Commercial"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Portal Security Credentials Card */}
                    <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 11.5, color: "var(--ink)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", display: "flex", alignItems: "center", gap: 4 }}>
                        <span>🔑</span> Portal Security Credentials
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <div style={{ padding: "6px 8px", background: "#f0f7ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                          <div style={{ fontSize: 9.5, color: "#1e40af", fontWeight: 700 }}>Username</div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {selectedClient.username || "—"}
                          </div>
                        </div>

                        <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 9.5, color: "#64748b", fontWeight: 700 }}>Password</span>
                            <button
                              onClick={() => setShowClientPassword(!showClientPassword)}
                              style={{ border: "none", background: "none", color: "#2563eb", fontSize: 9, cursor: "pointer", fontWeight: 800 }}
                            >
                              {showClientPassword ? "Hide" : "Show"}
                            </button>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                            {selectedClient.password ? (showClientPassword ? selectedClient.password : "••••••••") : "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: PM Card & Committed Projects */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Assigned PM Card */}
                    <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 11.5, color: "var(--ink)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", display: "flex", alignItems: "center", gap: 4 }}>
                        <span>👔</span> Assigned PM / Staff Lead
                      </div>

                      {(() => {
                        const pm = db.users.find(u => String(u.id) === String(selectedClient.projectManagerId) || String(u.uuid) === String(selectedClient.projectManagerId)) || getProjectManager();
                        return (
                          <div style={{ padding: "6px 8px", background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 10, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar name={pm.name} size={32} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 13 }}>{pm.name}</div>
                              <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 1 }}>
                                {pm.role || "Project Manager"} · <span style={{ color: "#2563eb", fontWeight: 700 }}>{pm.discipline || "MEP"}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Committed Projects Card */}
                    <div className="card" style={{ padding: 12, background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 11.5, color: "var(--ink)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", display: "flex", alignItems: "center", gap: 4 }}>
                        <span>📁</span> Committed Projects ({getClientProjects(selectedClient).length})
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
                        {getClientProjects(selectedClient).map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelProjectId(p.id);
                              setSubTab("projects");
                            }}
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: 8,
                              padding: "6px 8px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                              <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                                {p.category || "Engineering"}
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#2563eb" }}>{p.progress || 0}%</span>
                              <Tag label={p.status} color={statusColor(p.status, db.settings.projectStatuses)} />
                            </div>
                          </div>
                        ))}

                        {getClientProjects(selectedClient).length === 0 && (
                          <div style={{ padding: 12, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 8, background: "#f8fafc" }}>
                            <div style={{ fontWeight: 700, fontSize: 11, color: "var(--ink)" }}>No projects committed yet</div>
                          </div>
                        )}
                      </div>
                    </div>
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

      {/* DOCUMENT PREVIEW MODAL FOR ADMIN */}
      {previewDoc && (
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
          <div className="card" style={{
            width: "100%",
            maxWidth: 480,
            background: "#fff",
            borderRadius: 16,
            padding: 22,
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: 14
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>
                  📄
                </div>
                <div>
                  <h3 className="disp" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>
                    Document Viewer
                  </h3>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Official Compliance Record</div>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{ background: "none", border: "none", fontSize: 18, color: "var(--muted)", cursor: "pointer", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--line)" }}>
                <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Document Title</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>{previewDoc.documentName}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>Compliance Status</div>
                  <div style={{ marginTop: 4 }}>
                    <Tag label={previewDoc.status || "Pending"} color={previewDoc.status === "Approved" ? "#22c55e" : previewDoc.status === "Rejected" ? "#ef4444" : "#f59e0b"} />
                  </div>
                </div>

                <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>Attached File</div>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: previewDoc.fileName ? "#2563eb" : "#94a3b8", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {previewDoc.fileName ? `📎 ${previewDoc.fileName}` : "No file attached"}
                  </div>
                </div>
              </div>

              {previewDoc.fileName ? (
                <div style={{ padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 11.5, color: "#166534", fontWeight: 700, marginBottom: 8 }}>✓ Document file is ready</div>
                  <button
                    className="btn sm"
                    onClick={() => {
                      window.open(`/uploads/${previewDoc.fileName}`, '_blank');
                    }}
                    style={{ background: "#16a34a", color: "#fff", fontWeight: 700, padding: "6px 14px", borderRadius: 6, fontSize: 11 }}
                  >
                    👁️ Open Document File
                  </button>
                </div>
              ) : (
                <div style={{ padding: 12, background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 10, textAlign: "center", color: "#64748b", fontSize: 11.5, fontStyle: "italic" }}>
                  No file attachment uploaded yet for this document requirement.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 10, borderTop: "1px solid var(--line)" }}>
              <button className="btn sec sm" onClick={() => setPreviewDoc(null)} style={{ padding: "5px 14px", fontWeight: 700, fontSize: 11 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
