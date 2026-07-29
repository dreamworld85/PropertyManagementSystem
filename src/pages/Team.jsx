import React, { useState } from 'react';
import Avatar from '../components/Avatar';
import Bar from '../components/Bar';
import Tag from '../components/Tag';
import { fmt, statusColor, barColor } from '../utils/helpers';

export default function Team({ db, onAdd, onOpenProject, setModal, updateUser }) {
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingTeammate, setEditingTeammate] = useState(null);

  // Get current PM info if available
  const pmUser = db.users.find(u => 
    (u.role || "").toLowerCase().includes("project manager") || 
    (u.userType || "").toLowerCase().includes("project manager")
  ) || { name: "Project Manager", role: "Project Manager" };

  const allProjects = db.projects || [];
  
  // Filter projects by search and status
  const filteredProjects = allProjects.filter(p => {
    const client = db.clients.find(c => c.id === p.clientId);
    const clientName = client ? client.name : "";
    const matchesSearch = (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleProjectExpand = (projId) => {
    setExpandedProjectId(prev => prev === projId ? null : projId);
  };

  const handleAddTeammateToProject = (projectId, e) => {
    if (e) e.stopPropagation();
    if (setModal) {
      setModal({ type: "task", projectId });
    } else {
      onAdd();
    }
  };

  const handleRemoveTeammate = (projectId, userId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this teammate from the project?")) return;
    const targetUser = db.users.find(u => String(u.id) === String(userId) || String(u.uuid) === String(userId));
    const uName = targetUser?.name;

    commit((d) => {
      const projObj = d.projects.find(p => String(p.id) === String(projectId) || String(p.uuid) === String(projectId));
      const projIdMatches = [
        String(projectId),
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
        return false;
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
        body: JSON.stringify({ userId, projectId, name: uName })
      }).catch(err => console.error("Failed to delete teammate API:", err));
    } catch(err) {}
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 1400, margin: "0 auto" }}>
      <style>{`
        @media (max-width: 768px) {
          .my-teams-grid {
            grid-template-columns: 1fr !important;
          }
          .my-teams-filter-bar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .my-teams-filter-bar input, .my-teams-filter-bar select {
            width: 100% !important;
            min-width: 100% !important;
          }
        }
      `}</style>
      
      {/* Main Banner Header */}
      <div 
        className="card" 
          style={{ 
            padding: "20px 24px", 
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", 
            color: "#fff", 
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.15)",
            border: "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar name={pmUser.name} size={48} />
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700 }}>
                  Project Manager Control Centre
                </div>
                <h2 className="disp" style={{ margin: "2px 0 0 0", fontSize: 22, color: "#fff", fontWeight: 800 }}>
                  My Projects & Teammates
                </h2>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn sm" onClick={onAdd} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
                ＋ Create Teammate
              </button>
            </div>
          </div>
        </div>

        {/* Section Title & Filter Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="disp" style={{ margin: 0, fontSize: 20, color: "var(--ink)", fontWeight: 800 }}>
              My Projects ({filteredProjects.length})
            </h2>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
              Committed projects under Project Manager with assigned teammates and client details.
            </p>
          </div>

          <div className="my-teams-filter-bar" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              className="inp"
              placeholder="🔍 Search project or client..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ minWidth: 200, background: "#fff" }}
            />
            <select
              className="inp"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ background: "#fff", width: "auto", minWidth: 120 }}
            >
              <option value="All">All Statuses</option>
              {(db.settings?.projectStatuses || ["Active", "On Hold", "Concept", "Closed"]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* MY PROJECTS LIST CARDS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {filteredProjects.map((project) => {
            const client = db.clients.find(c => c.id === project.clientId);
            const projectTasks = db.tasks.filter(t => t.projectId === project.id);
            const activeTasksCount = projectTasks.filter(t => t.status !== "Done").length;

            // Find all teammates explicitly added in db.teammates or assigned active tasks
            const projIdMatches = [
              String(project.id).toLowerCase(),
              project.uuid ? String(project.uuid).toLowerCase() : null,
              project.db_id ? String(project.db_id).toLowerCase() : null,
              project.name ? String(project.name).toLowerCase() : null
            ].filter(Boolean);

            const projectTeammates = [];

            const addUniqueTeammateToTeam = (item) => {
              if (!item || !item.name) return;
              if (item.name === "Saurabh M." || item.username === "projectmanager") return;

              const normName = item.name.trim().toLowerCase();
              if (!projectTeammates.some(t => t.name.trim().toLowerCase() === normName)) {
                projectTeammates.push({
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
                addUniqueTeammateToTeam(tm);
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
                  addUniqueTeammateToTeam({
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
                addUniqueTeammateToTeam(u);
              }
            });

            const isExpanded = expandedProjectId === project.id;

            return (
              <div
                key={project.id}
                className="card"
                style={{
                  padding: 22,
                  background: "#fff",
                  borderRadius: 16,
                  border: isExpanded ? "1.5px solid var(--accent2)" : "1px solid var(--line)",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
                  transition: "all 0.2s"
                }}
              >
                {/* PROJECT CARD HEADER */}
                <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                    
                    {/* Project & Client Title Info */}
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h3 className="disp" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>
                          {project.name}
                        </h3>
                        <Tag label={project.status} color={statusColor(project.status, db.settings?.projectStatuses)} />
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, fontSize: 13 }}>
                        <span style={{ color: "var(--ink)", fontWeight: 700 }}>
                          🏢 Client: <span style={{ color: "var(--accent2)" }}>{client ? client.name : "Unassigned Client"}</span>
                        </span>
                        <span className="muted">·</span>
                        <span className="muted">
                          Category: <strong>{project.category || "Full Engineering"}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Action Controls & Progress */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {/* ADD TEAMMATE BUTTON IN EVERY PROJECT CARD */}
                      <button
                        className="btn sm"
                        onClick={(e) => handleAddTeammateToProject(project.id, e)}
                        style={{
                          background: "var(--accent)",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 12.5,
                          padding: "7px 14px",
                          borderRadius: 9,
                          boxShadow: "0 2px 6px rgba(16, 185, 129, 0.2)"
                        }}
                      >
                        ＋ Add Teammate
                      </button>

                      <button
                        onClick={() => toggleProjectExpand(project.id)}
                        className="btn sec sm"
                        style={{ fontSize: 12, padding: "7px 12px", background: isExpanded ? "var(--ink)" : "#fff", color: isExpanded ? "#fff" : "var(--ink)" }}
                      >
                        {isExpanded ? "▲ Hide Details" : "▼ Project Details"}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar Row */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                      <span className="muted">Overall Project Progress</span>
                      <span style={{ color: "var(--ink)" }}>{project.progress}%</span>
                    </div>
                    <Bar value={project.progress} color={barColor(project.progress)} />
                  </div>
                </div>

                {/* TEAMMATES OF THIS PROJECT SECTION */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700 }}>
                      👥 Assigned Teammates on this Project ({projectTeammates.length})
                    </div>
                    <span className="muted" style={{ fontSize: 11.5 }}>
                      {activeTasksCount} active task{activeTasksCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* REDESIGNED & STREAMLINED ASSIGNED TEAMMATES CARDS */}
                  <div className="my-teams-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                    {projectTeammates.map((teammate) => {
                      const mateTasks = projectTasks.filter(t => 
                        String(t.assignee) === String(teammate.id) || 
                        String(t.assignee) === String(teammate.uuid) || 
                        (t.assignee && String(t.assignee).toLowerCase() === teammate.name.toLowerCase())
                      );
                      const primaryTask = mateTasks[0];
                      const taskTitle = primaryTask ? primaryTask.title : (teammate.taskName || teammate.taskTitle || `${teammate.name} - Project Assignment`);
                      const percent = primaryTask ? (primaryTask.percent !== undefined ? primaryTask.percent : (primaryTask.status === "Done" ? 100 : 0)) : (teammate.progress || 0);
                      const taskStatus = primaryTask ? primaryTask.status : "In Progress";

                      return (
                        <div
                          key={teammate.id}
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
                          {/* 1. TOP HEADER: Teammate Name & Role + Edit / Remove Options */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <Avatar name={teammate.name} size={38} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", lineHeight: 1.2 }}>
                                  {teammate.name}
                                </div>
                                <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600, marginTop: 2 }}>
                                  {teammate.role || teammate.discipline || "Staff"}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Tag label={taskStatus} color={statusColor(taskStatus)} />
                              <button
                                onClick={(e) => {
                                  if (e) e.stopPropagation();
                                  setEditingTeammate(teammate);
                                }}
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
                                onClick={(e) => handleRemoveTeammate(project.id, teammate.id, e)}
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

                          {/* 2. MIDDLE SECTION: Specific Task Assigned */}
                          <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}>
                            <span style={{ color: "#475569", fontWeight: 600 }}>📌 Task: </span>
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

                    {projectTeammates.length === 0 && (
                      <div 
                        style={{ 
                          gridColumn: "1 / -1", 
                          padding: "16px 20px", 
                          background: "#f8fafc", 
                          borderRadius: 12, 
                          border: "1px dashed #cbd5e1",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <span style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>
                          No teammates assigned to tasks in this project yet.
                        </span>
                        <button
                          className="btn sm"
                          onClick={(e) => handleAddTeammateToProject(project.id, e)}
                          style={{ fontSize: 12, padding: "5px 12px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8 }}
                        >
                          ＋ Assign First Teammate
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* EXPANDABLE PROJECT METADATA DRAWER (STREAMLINED) */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: "1.5px solid var(--line)",
                      background: "#f8fafc",
                      borderRadius: 12,
                      padding: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      border: "1px solid var(--line)"
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 12.5 }}>
                      <div>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Start Date</div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{fmt(project.start)}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Target Completion</div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{fmt(project.end)}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Approval Status</div>
                        <div style={{ marginTop: 2 }}>
                          <Tag label={project.approvalStatus || "Required"} color="var(--accent2)" />
                        </div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Document Numbers</div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                          {project.docNumbers && project.docNumbers.length > 0 ? project.docNumbers.join(", ") : "None assigned"}
                        </div>
                      </div>
                    </div>

                    {project.desc && (
                      <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid var(--line)", fontSize: 12.5 }}>
                        <strong style={{ color: "var(--ink)" }}>Project Scope & Notes: </strong>
                        <span className="muted">{project.desc}</span>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                      <button
                        onClick={() => onOpenProject(project.id)}
                        style={{ border: "none", background: "none", color: "var(--accent2)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        Open Full Project Workspace →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredProjects.length === 0 && (
            <div className="card empty" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>No committed projects match your filter.</div>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Try clearing your search term or status dropdown.</p>
            </div>
          )}
        </div>

      {editingTeammate && (
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
              <button onClick={() => setEditingTeammate(null)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Full Name</label>
                <input className="inp" value={editingTeammate.name || ""} onChange={e => setEditingTeammate({ ...editingTeammate, name: e.target.value })} />
              </div>
              <div className="row2">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Role Title</label>
                  <input className="inp" value={editingTeammate.role || ""} onChange={e => setEditingTeammate({ ...editingTeammate, role: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Discipline Group</label>
                  <select className="inp" value={editingTeammate.discipline || ""} onChange={e => setEditingTeammate({ ...editingTeammate, discipline: e.target.value })}>
                    {(db.settings?.disciplines || ["Architecture", "Structure", "HVAC", "Electrical", "Plumbing", "Fire"]).map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="row2">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Mail ID (Email)</label>
                  <input className="inp" value={editingTeammate.email || ""} onChange={e => setEditingTeammate({ ...editingTeammate, email: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Contact Number (Phone)</label>
                  <input className="inp" value={editingTeammate.phone || ""} onChange={e => setEditingTeammate({ ...editingTeammate, phone: e.target.value })} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <button className="btn sec sm" onClick={() => setEditingTeammate(null)}>Cancel</button>
              <button
                className="btn sm"
                onClick={() => {
                  if (updateUser) updateUser(editingTeammate);
                  setEditingTeammate(null);
                }}
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
