import React, { useState } from 'react';
import Avatar from '../components/Avatar';
import Bar from '../components/Bar';
import Tag from '../components/Tag';
import { fmt, statusColor, barColor } from '../utils/helpers';

export default function Team({ db = {}, onAdd, onOpenProject, setModal, updateUser }) {
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const safeDb = db || {};
  const users = safeDb.users || [];
  const projects = safeDb.projects || [];
  const clients = safeDb.clients || [];

  // Get current PM info if available
  const pmUser = users.find(u => 
    (u.role || "").toLowerCase().includes("project manager") || 
    (u.userType || "").toLowerCase().includes("project manager")
  ) || { name: "Project Manager", role: "Project Manager" };

  const allProjects = projects;
  
  // Filter projects by search and status
  const filteredProjects = allProjects.filter(p => {
    const client = clients.find(c => String(c.id) === String(p.clientId) || String(c.id) === String(p.client_id) || String(c.uuid) === String(p.client_id));
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
    } else if (onAdd) {
      onAdd();
    }
  };

  const handleRemoveTeammate = (projectId, userId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this teammate from the project?")) return;
    const targetUser = users.find(u => String(u.id) === String(userId) || String(u.uuid) === String(userId));
    const uName = targetUser?.name;

    try {
      fetch('/api/delete-teammate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectId, name: uName })
      }).catch(err => console.error("Failed to delete teammate API:", err));
    } catch(err) {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 1400, margin: "0 auto" }}>
      <style>{`
        @media (max-width: 768px) {
          .my-teams-projects-grid {
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
      
      {/* Executive Header Banner */}
      <div 
        className="card" 
        style={{ 
          padding: "16px 22px", 
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", 
          color: "#fff", 
          borderRadius: 14,
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.15)",
          border: "1px solid rgba(255,255,255,0.1)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={pmUser.name} size={44} />
            <div>
              <div style={{ fontSize: 10.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700 }}>
                Project Manager Control Centre
              </div>
              <h2 className="disp" style={{ margin: "2px 0 0 0", fontSize: 20, color: "#fff", fontWeight: 800 }}>
                My Projects & Teammates Directory ({filteredProjects.length})
              </h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn sm" onClick={onAdd} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ＋ Create Teammate
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
          Showing {filteredProjects.length} Committed Projects with Teammates Roster
        </div>

        <div className="my-teams-filter-bar" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            className="inp"
            placeholder="🔍 Search project or client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ minWidth: 240, height: 36, fontSize: 12, background: "#fff", borderRadius: 8, border: "1px solid var(--line)" }}
          />
          <select
            className="inp"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ background: "#fff", height: 36, fontSize: 12, borderRadius: 8, border: "1px solid var(--line)", width: "auto", minWidth: 130 }}
          >
            <option value="All">All Statuses</option>
            {(db.settings?.projectStatuses || ["Active", "On Hold", "Concept", "Closed"]).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* OPTIMIZED MULTI-COLUMN RESPONSIVE GRID LAYOUT WITH EQUAL HEIGHT STRETCH */}
      <div 
        className="my-teams-projects-grid"
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", 
          gap: 16,
          alignItems: "stretch"
        }}
      >
        {filteredProjects.map((project) => {
          const client = db.clients.find(c => String(c.id) === String(project.clientId) || String(c.id) === String(project.client_id) || String(c.uuid) === String(project.client_id));
          const projectTasks = db.tasks.filter(t => String(t.projectId) === String(project.id) || String(t.project_id) === String(project.id) || String(t.projectId) === String(project.uuid));
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
              key={project.id || project.uuid}
              className="card"
              style={{
                padding: 16,
                background: "#fff",
                borderRadius: 14,
                border: isExpanded ? "1.5px solid var(--accent2)" : "1px solid var(--line)",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                gap: 12,
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* PROJECT CARD HEADER */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <h3 
                        className="disp" 
                        onClick={() => onOpenProject && onOpenProject(project.id)}
                        style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e40af", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title="Click to view full project details"
                      >
                        🔗 {project.name}
                      </h3>
                      <Tag label={project.status || 'Active'} color={statusColor(project.status, db.settings?.projectStatuses)} />
                    </div>
                    
                    {/* CLEAN SIDE-BY-SIDE BADGES (NO OVERLAPPING TEXT) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <span className="pill" style={{ background: "#e0f2fe", color: "#0369a1", fontWeight: 700, fontSize: 10.5, padding: "2px 8px", border: "1px solid #bae6fd" }}>
                        🏢 {client ? client.name : "Unassigned Client"}
                      </span>
                      <span className="pill" style={{ background: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: 10.5, padding: "2px 8px", border: "1px solid #e2e8f0" }}>
                        ⚙️ {project.category || "Full Engineering"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn sm"
                      onClick={(e) => handleAddTeammateToProject(project.id, e)}
                      style={{
                        background: "var(--accent)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 7,
                        boxShadow: "0 2px 5px rgba(16, 185, 129, 0.2)",
                        cursor: "pointer"
                      }}
                    >
                      ＋ Teammate
                    </button>

                    <button
                      onClick={() => toggleProjectExpand(project.id)}
                      className="btn sec sm"
                      style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 7, fontWeight: 700, background: isExpanded ? "var(--ink)" : "#f8fafc", color: isExpanded ? "#fff" : "var(--ink)", cursor: "pointer" }}
                    >
                      {isExpanded ? "▲ Hide" : "▼ Details"}
                    </button>
                  </div>
                </div>

                {/* Progress Bar Row */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3, fontWeight: 700 }}>
                    <span style={{ color: "#64748b" }}>Overall Project Progress</span>
                    <span style={{ color: "#2563eb" }}>{project.progress || 0}%</span>
                  </div>
                  <Bar value={project.progress || 0} color={barColor(project.progress || 0)} />
                </div>

                {/* ASSIGNED TEAMMATES ROSTER */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 10.5, color: "var(--ink)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>👥</span> Assigned Teammates ({projectTeammates.length})
                    </div>
                    <span style={{ fontSize: 10.5, color: "#64748b", fontWeight: 600 }}>
                      {activeTasksCount} active task{activeTasksCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {projectTeammates.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: 140, overflowY: "auto", paddingRight: 2 }}>
                      {projectTeammates.map((teammate) => {
                        const mateTasks = projectTasks.filter(t => 
                          String(t.assignee) === String(teammate.id) || 
                          String(t.assignee) === String(teammate.uuid) || 
                          (t.assignee && String(t.assignee).toLowerCase() === teammate.name.toLowerCase())
                        );
                        const primaryTask = mateTasks[0];
                        const taskTitle = primaryTask ? primaryTask.title : (teammate.taskName || teammate.taskTitle || `${teammate.name} - Assignment`);
                        const percent = primaryTask ? (primaryTask.percent !== undefined ? primaryTask.percent : (primaryTask.status === "Done" ? 100 : 0)) : (teammate.progress || 0);
                        const taskStatus = primaryTask ? primaryTask.status : "In Progress";

                        return (
                          <div
                            key={teammate.id || teammate.uuid}
                            style={{
                              padding: "7px 9px",
                              background: "#f8fafc",
                              borderRadius: 8,
                              border: "1px solid #e2e8f0",
                              display: "flex",
                              flexDirection: "column",
                              gap: 4
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                <Avatar name={teammate.name} size={28} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 800, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {teammate.name}
                                  </div>
                                  <div style={{ fontSize: 10, color: "#64748b" }}>
                                    {teammate.role || teammate.discipline || "Staff"}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span className="pill" style={{ fontSize: 9, padding: "1px 5px", background: taskStatus === "Done" ? "#dcfce7" : "#e0f2fe", color: taskStatus === "Done" ? "#15803d" : "#0369a1", fontWeight: 700 }}>
                                  {taskStatus} ({percent}%)
                                </span>
                                <button
                                  onClick={(e) => handleRemoveTeammate(project.id, teammate.id, e)}
                                  title="Remove Teammate"
                                  style={{
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: 5,
                                    padding: "2px 5px",
                                    color: "#dc2626",
                                    cursor: "pointer",
                                    fontSize: 10,
                                    fontWeight: 700
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            <div style={{ fontSize: 10.5, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              📌 <strong>{taskTitle}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div 
                      style={{ 
                        padding: "16px 12px", 
                        background: "#f8fafc", 
                        borderRadius: 8, 
                        border: "1px dashed #cbd5e1", 
                        textAlign: "center",
                        height: 140,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginBottom: 8 }}>
                        No teammates assigned to tasks in this project yet.
                      </div>
                      <button
                        className="btn sm"
                        onClick={(e) => handleAddTeammateToProject(project.id, e)}
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 11,
                          padding: "5px 14px",
                          borderRadius: 7,
                          cursor: "pointer"
                        }}
                      >
                        ＋ Assign First Teammate
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* EXPANDABLE DETAILS DRAWER AT BOTTOM OF CARD */}
              {isExpanded && (
                <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: 10, marginTop: 10, display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                  <div style={{ color: "#64748b" }}>
                    💰 Total Budget: <strong style={{ color: "#059669" }}>AED {(parseFloat(project.total_cost || project.totalCost) || 0).toLocaleString()}</strong>
                  </div>
                  {client && (
                    <div style={{ color: "#64748b" }}>
                      ✉️ Client Email: <strong>{client.email || 'N/A'}</strong> · 📞 <strong>{client.phone || 'N/A'}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
