import React, { useState } from 'react';
import Avatar from '../components/Avatar';
import Bar from '../components/Bar';
import Tag from '../components/Tag';
import { fmt, statusColor, barColor } from '../utils/helpers';

export default function Team({ db = {}, onAdd, onOpenProject, setModal, updateUser, commit }) {
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Create Teammate Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [newTmName, setNewTmName] = useState('');
  const [newTmRole, setNewTmRole] = useState('CAD Technician');
  const [newTmTaskTitle, setNewTmTaskTitle] = useState('');
  const [newTmEmail, setNewTmEmail] = useState('');
  const [newTmPhone, setNewTmPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleOpenCreateModal = (projId = null, e) => {
    if (e) e.stopPropagation();
    setTargetProjectId(projId || (filteredProjects[0] ? filteredProjects[0].id : ''));
    setShowCreateModal(true);
  };

  const handleCreateTeammateSubmit = (e) => {
    e.preventDefault();
    if (!newTmName.trim()) {
      alert("Please enter teammate's name");
      return;
    }
    const projId = targetProjectId || (filteredProjects[0] ? filteredProjects[0].id : null);
    if (!projId) {
      alert("Please select a project to assign teammate");
      return;
    }

    const tmUuid = 'tm_' + Math.random().toString(36).substring(2, 9);
    const taskUuid = 'task_' + Math.random().toString(36).substring(2, 9);
    const tmName = newTmName.trim();
    const taskTitle = newTmTaskTitle.trim() || `${tmName} - Project Assignment`;
    const email = newTmEmail.trim() || `${tmName.toLowerCase().replace(/\s+/g, '')}@dgec.com`;
    const phone = newTmPhone.trim() || '+968 9400 0000';

    // 1. INSTANT LOCAL STATE COMMIT VIA PROPS
    if (commit) {
      commit((d) => {
        const nextUsers = [...(d.users || [])];
        const nextTeammates = [...(d.teammates || [])];
        const nextTasks = [...(d.tasks || [])];
        const nextStaff = [...(d.staff || [])];

        const newUser = {
          id: tmUuid,
          uuid: tmUuid,
          name: tmName,
          username: tmName.toLowerCase().replace(/\s+/g, ''),
          role: newTmRole,
          discipline: newTmRole,
          email,
          phone,
          projectId: projId
        };

        if (!nextUsers.some(u => String(u.name).toLowerCase() === String(tmName).toLowerCase())) {
          nextUsers.push(newUser);
        }
        if (!nextStaff.some(s => String(s.name).toLowerCase() === String(tmName).toLowerCase())) {
          nextStaff.push(newUser);
        }

        nextTeammates.push({
          id: tmUuid,
          uuid: tmUuid,
          name: tmName,
          role: newTmRole,
          projectId: projId,
          taskName: taskTitle
        });

        nextTasks.push({
          id: taskUuid,
          uuid: taskUuid,
          projectId: projId,
          project_id: projId,
          title: taskTitle,
          assignee: tmName,
          assignee_id: tmUuid,
          discipline: newTmRole,
          percent: 0,
          status: 'In Progress'
        });

        return {
          ...d,
          users: nextUsers,
          staff: nextStaff,
          teammates: nextTeammates,
          tasks: nextTasks
        };
      }, `Created and assigned teammate ${tmName}`);
    }

    // 2. CLOSE MODAL IMMEDIATELY
    setIsSubmitting(false);
    setShowCreateModal(false);
    setNewTmName('');
    setNewTmTaskTitle('');
    setNewTmEmail('');
    setNewTmPhone('');

    // 3. PERSIST TO MYSQL DATABASE VIA API ENDPOINTS
    Promise.all([
      fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: tmUuid,
          name: tmName,
          contact_number: phone,
          email,
          role: newTmRole
        })
      }),
      fetch('/api/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: taskUuid,
          projectId: projId,
          title: taskTitle,
          discipline: newTmRole,
          assignee: tmName,
          status: 'In Progress',
          percent: 0
        })
      })
    ]).then(() => {
      console.log(`✅ Saved teammate ${tmName} and task ${taskTitle} to MySQL database!`);
    }).catch(err => console.error("Error saving teammate to database:", err));
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

    if (commit) {
      commit((d) => {
        const nextTasks = (d.tasks || []).filter(t => 
          !(String(t.projectId) === String(projectId) && (String(t.assignee) === String(userId) || (uName && String(t.assignee).toLowerCase() === uName.toLowerCase())))
        );
        const nextTeammates = (d.teammates || []).filter(tm => 
          !(String(tm.id) === String(userId) || (uName && String(tm.name).toLowerCase() === uName.toLowerCase()))
        );
        return { ...d, tasks: nextTasks, teammates: nextTeammates };
      }, `Removed teammate from project`);
    }
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
          const clientName = (() => {
            if (project.client_name) return project.client_name;
            if (project.clientName && typeof project.clientName === 'string') return project.clientName;
            
            const rawVal = project.client || project.clientId || project.client_id;
            const cId = String(rawVal || '').toLowerCase().trim();

            if (!cId || cId === '[object object]') return "Unassigned Client";

            // 1. Search in db.clients
            const foundClient = (db.clients || []).find(c => {
              const cidStr = String(c.id || '').toLowerCase();
              const cuuidStr = String(c.uuid || '').toLowerCase();
              const cnameStr = String(c.name || '').toLowerCase();
              const ccompStr = String(c.company || '').toLowerCase();
              return cidStr === cId || cuuidStr === cId || cnameStr === cId || ccompStr === cId;
            });
            if (foundClient) return foundClient.name || foundClient.company || foundClient.contact_name;

            // 2. Search in db.users for role=client
            const foundClientUser = (db.users || []).find(u => {
              const r = String(u.role || '').toLowerCase();
              const ut = String(u.userType || u.user_type || '').toLowerCase();
              const isClient = r.includes('client') || ut.includes('client');
              const uidStr = String(u.id || '').toLowerCase();
              const uuuidStr = String(u.uuid || '').toLowerCase();
              const unameStr = String(u.name || '').toLowerCase();
              const uuserStr = String(u.username || '').toLowerCase();
              return isClient && (uidStr === cId || uuuidStr === cId || unameStr === cId || uuserStr === cId);
            });
            if (foundClientUser) return foundClientUser.name || foundClientUser.username;

            // 3. String value fallback if it's a valid string name
            if (typeof rawVal === 'string' && rawVal.trim().length > 0 && !rawVal.includes('{')) {
              return rawVal.trim();
            }

            return "Unassigned Client";
          })();

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
                    
                    {/* CLEAN SIDE-BY-SIDE BADGES */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <span className="pill" style={{ background: "#e0f2fe", color: "#0369a1", fontWeight: 700, fontSize: 10.5, padding: "2px 8px", border: "1px solid #bae6fd" }}>
                        🏢 {clientName}
                      </span>
                      <span className="pill" style={{ background: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: 10.5, padding: "2px 8px", border: "1px solid #e2e8f0" }}>
                        ⚙️ {project.category || "Full Engineering"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {/* CREATE & ASSIGN TEAMMATE BUTTON IN CARD HEADER */}
                    <button
                      className="btn sm"
                      onClick={(e) => handleOpenCreateModal(project.id, e)}
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
                      <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
                        No teammates assigned to tasks in this project yet.
                      </div>
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

      {/* CREATE & ASSIGN TEAMMATE MODAL POPUP */}
      {showCreateModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(15, 23, 42, 0.75)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 99999, 
            padding: 20 
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: '100%', 
              maxWidth: 500, 
              background: '#fff', 
              borderRadius: 16, 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)' 
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>👤</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>Create & Assign Teammate</h3>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Add engineering staff and assign initial project task</div>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', width: 30, height: 30, borderRadius: 8, fontSize: 16, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTeammateSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* SEARCH & SELECT EXISTING STAFF DROPDOWN */}
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #cbd5e1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#1e40af', marginBottom: 4 }}>
                  🔍 Search & Select Existing Company Staff
                </label>
                <select
                  className="inp"
                  onChange={(e) => {
                    const selId = e.target.value;
                    if (!selId) return;
                    const found = (() => {
                      const dbStaff = db.staff || [];
                      const dbUsers = db.users || [];
                      return [...dbStaff, ...dbUsers].find(s => String(s.id) === String(selId) || String(s.uuid) === String(selId));
                    })();
                    if (found) {
                      setNewTmName(found.name || '');
                      setNewTmRole(found.role || found.discipline || 'CAD Technician');
                      setNewTmEmail(found.email || '');
                      setNewTmPhone(found.contact_number || found.phone || '');
                      setNewTmTaskTitle(prev => prev || `${found.name} - Project Assignment`);
                    }
                  }}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8, background: '#fff', border: '1.5px solid #93c5fd', fontWeight: 600 }}
                >
                  <option value="">-- Click to search & select from company staff --</option>
                  {(() => {
                    const map = new Map();
                    const allStaff = [...(db.staff || []), ...(db.users || [])];
                    allStaff.forEach(u => {
                      if (!u || !u.name) return;
                      const r = String(u.role || '').toLowerCase();
                      const ut = String(u.userType || u.user_type || '').toLowerCase();
                      if (r.includes('admin') || ut.includes('admin') || r.includes('client') || ut.includes('client')) return;
                      const key = u.name.trim().toLowerCase();
                      if (!map.has(key)) {
                        map.set(key, u);
                      }
                    });
                    return Array.from(map.values());
                  })().map((s) => (
                    <option key={s.id || s.uuid || s.name} value={s.id || s.uuid}>
                      👤 {s.name} ({s.role || s.discipline || 'Staff'}) — {s.email || 'No email'}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                  💡 Select an existing staff member to auto-fill details, or type manually below.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  Teammate Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="inp"
                  list="team-staff-names"
                  required
                  placeholder="e.g. Tomas, Boby, Rohan K."
                  value={newTmName}
                  onChange={(e) => setNewTmName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                />
                <datalist id="team-staff-names">
                  {(db.staff || db.users || []).map(s => s.name && <option key={s.id || s.name} value={s.name} />)}
                </datalist>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Role / Discipline</label>
                  <select 
                    className="inp"
                    value={newTmRole}
                    onChange={(e) => setNewTmRole(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                  >
                    <option value="CAD Technician">CAD Technician</option>
                    <option value="Architect Lead">Architect Lead</option>
                    <option value="Structural Engineer">Structural Engineer</option>
                    <option value="MEP Specialist">MEP Specialist</option>
                    <option value="Site Engineer">Site Engineer</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Assign to Project</label>
                  <select 
                    className="inp"
                    value={targetProjectId}
                    onChange={(e) => setTargetProjectId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                  >
                    {filteredProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  Assigned Task Title
                </label>
                <input 
                  type="text" 
                  className="inp"
                  placeholder="e.g. make the 3d plan, HVAC duct design"
                  value={newTmTaskTitle}
                  onChange={(e) => setNewTmTaskTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Email (Optional)</label>
                  <input 
                    type="email" 
                    className="inp"
                    placeholder="tomas@dgec.com"
                    value={newTmEmail}
                    onChange={(e) => setNewTmEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Contact Phone (Optional)</label>
                  <input 
                    type="text" 
                    className="inp"
                    placeholder="+968 9400 1234"
                    value={newTmPhone}
                    onChange={(e) => setNewTmPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                <button 
                  type="button" 
                  className="btn sec sm" 
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  onClick={handleCreateTeammateSubmit}
                  className="btn pri sm" 
                  disabled={isSubmitting}
                  style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Saving...' : '💾 Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
