import React, { useState } from 'react';
import Field from './Field';

export default function Modals({ modal, close, db, S, addProject, addTask, addClient, addUser, addInvoice }) {
  const loggedInUser = (() => {
    try {
      const stored = localStorage.getItem('dgec_user');
      return stored ? JSON.parse(stored) : null;
    } catch(e) {
      return null;
    }
  })();

  const isPmUser = loggedInUser && (
    loggedInUser.username === "projectmanager" ||
    loggedInUser.name === "Saurabh M." ||
    (loggedInUser.role && loggedInUser.role.toLowerCase().includes("project manager")) ||
    (loggedInUser.role && loggedInUser.role.toLowerCase().includes("project_manager")) ||
    (loggedInUser.userType && loggedInUser.userType.toLowerCase().includes("project_manager"))
  );

  const [f, setF] = useState(() => {
    if (modal.type === "project") {
      const pmDefault = isPmUser && loggedInUser 
        ? (db.users.find(u => String(u.id) === String(loggedInUser.id) || String(u.uuid) === String(loggedInUser.id) || u.name === loggedInUser.name)?.id || db.users.find(u => u.name === "Saurabh M.")?.id || loggedInUser.id)
        : (db.users.find(u => u.name === "Saurabh M." || u.role?.toLowerCase().includes("project manager"))?.id || db.users[0]?.id);

      return {
        name: "",
        clientId: db.clients[0]?.id || db.clients[0]?.uuid,
        projectManagerId: pmDefault,
        status: S.projectStatuses[0],
        category: S.categories[0],
        aor: "DGEC",
        start: "2026-06-08",
        end: "2026-12-31",
        progress: 0,
        selectedTeammates: []
      };
    }
    if (modal.type === "task")
      return {
        projectId: modal.projectId,
        discipline: S.disciplines[1] || S.disciplines[0],
        title: "",
        assignee: db.users[0]?.id,
        start: "2026-06-08",
        target: "2026-06-30",
        status: S.taskStatuses[0],
        percent: 0
      };
    if (modal.type === "client") return { name: "", sector: "", contactName: "", email: "", phone: "", contact: "", username: "", password: "" };
    if (modal.type === "user") return { name: "", username: "", password: "", userType: "Employee", clientId: db.clients[0]?.id || "", role: "", discipline: S.disciplines[1] || S.disciplines[0] || "" };
    if (modal.type === "invoice")
      return {
        invoiceNo: "INV-2026-" + Math.floor(100 + Math.random() * 900),
        projectId: modal.projectId || db.projects[0]?.id,
        amount: 0,
        status: "Pending",
        issueDate: "2026-06-08",
        dueDate: "2026-07-08"
      };
    return {};
  });

  const [staffList, setStaffList] = React.useState([]);
  const [searchFilter, setSearchFilter] = React.useState("");

  // Client Search State for Project Creation
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  // Staff / PM Search State for Client Creation
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  // Teammates Filter State for Project Creation
  const [staffFilterQuery, setStaffFilterQuery] = useState("");

  React.useEffect(() => {
    if (modal.type === "user") {
      fetch('/api/staff')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.staff) {
            setStaffList(data.staff);
          }
        })
        .catch(err => console.error("Failed to fetch staff roster:", err));
    }
  }, [modal.type]);

  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const titles = {
    project: "New project",
    task: "Add task",
    client: "Add client",
    user: "Add team member",
    invoice: "New Invoice"
  };

  const submit = () => {
    if (modal.type === "project") {
      if (!f.name.trim()) return;
      addProject(f);
    }
    if (modal.type === "task") {
      if (!f.title.trim()) return;
      addTask(f);
    }
    if (modal.type === "client") {
      if (!f.name.trim()) return;
      addClient(f);
    }
    if (modal.type === "user") {
      const targetProjId = modal.projectId || db.projects[0]?.id;
      const taskTitle = (f.initialTask && f.initialTask.trim()) 
        ? f.initialTask.trim() 
        : (f.taskName && f.taskName.trim()) 
          ? f.taskName.trim() 
          : "General Engineering Task";

      const isExistingMode = f.mode === "existing" || !!f.existingUserId || (modal.projectId && f.mode !== "new");
      if (isExistingMode) {
        const staffRosterPool = [...(staffList.length > 0 ? staffList : (db.staff || [])), ...(db.users || [])];
        const selectedUser = staffRosterPool.find(s => 
          String(s.id) === String(f.existingUserId) || 
          String(s.uuid) === String(f.existingUserId) || 
          (s.name && f.name && s.name.toLowerCase() === f.name.toLowerCase())
        ) || staffRosterPool.find(s => s.name && s.name !== "Saurabh M.") || staffRosterPool[0];

        const staffName = selectedUser?.name || f.name || "Staff Member";
        const staffRole = selectedUser?.role || f.role || "Staff";
        const staffDiscipline = selectedUser?.discipline || selectedUser?.role || "Structure";
        const staffEmail = selectedUser?.email || f.email || "";
        const staffPhone = selectedUser?.contact_number || selectedUser?.phone || f.phone || "";

        addUser({
          name: staffName,
          role: staffRole,
          discipline: staffDiscipline,
          projectId: targetProjId,
          taskName: taskTitle,
          initialTask: taskTitle,
          email: staffEmail,
          phone: staffPhone
        });
      } else {
        if (!f.name.trim()) return;
        addUser({
          ...f,
          name: f.name.trim(),
          role: f.role || f.roleTitle || (f.userType === "Project Manager" ? "Project Manager" : "Staff"),
          discipline: f.discipline || f.disciplineGroup || "Structure",
          projectId: targetProjId,
          taskName: taskTitle,
          initialTask: taskTitle
        });
      }
    }
    if (modal.type === "invoice") {
      if (!f.invoiceNo.trim() || !f.amount) return;
      addInvoice({ ...f, amount: Number(f.amount) });
    }
    close();
  };

  return (
    <div className="modalbg" onClick={close}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="disp">{titles[modal.type]}</h3>
          <button className="muted" onClick={close} style={{ fontSize: 18, border: "none", background: "none", cursor: "pointer" }}>×</button>
        </div>
        <div className="body">
          {modal.type === "project" && (
            <>
              <Field l="Project name">
                <input className="inp" value={f.name} onChange={e => set("name", e.target.value)} />
              </Field>
              <div className="row2">
                <Field l="Client Organization">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      type="text"
                      className="inp"
                      placeholder="🔍 Search client by name or sector..."
                      value={clientSearchQuery}
                      onChange={e => setClientSearchQuery(e.target.value)}
                      style={{ fontSize: 12, padding: "6px 10px", background: "#f8fafc" }}
                    />
                    <select
                      className="inp"
                      value={f.clientId}
                      onChange={e => set("clientId", e.target.value)}
                    >
                      {(db.clients || [])
                        .filter(c =>
                          (c.name || "").toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                          (c.sector || "").toLowerCase().includes(clientSearchQuery.toLowerCase())
                        )
                        .map(c => (
                          <option key={c.id || c.uuid} value={c.id || c.uuid}>
                            {c.name} {c.sector ? `(${c.sector})` : ""}
                          </option>
                        ))}
                      {(db.clients || []).filter(c =>
                        (c.name || "").toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                        (c.sector || "").toLowerCase().includes(clientSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <option value="" disabled>No matching clients found</option>
                      )}
                    </select>
                  </div>
                </Field>
                <Field l="Service Category">
                  <select className="inp" value={f.category} onChange={e => set("category", e.target.value)}>
                    {S.categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field l="Project Manager">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <select
                    className="inp"
                    value={f.projectManagerId}
                    onChange={e => set("projectManagerId", e.target.value)}
                    disabled={isPmUser}
                    style={{
                      background: isPmUser ? "#f1f5f9" : "#fff",
                      cursor: isPmUser ? "not-allowed" : "pointer",
                      fontWeight: isPmUser ? 700 : 500,
                      color: isPmUser ? "var(--ink)" : "inherit"
                    }}
                  >
                    {db.users.filter(u => u.name === "Saurabh M." || u.role?.toLowerCase().includes("project manager")).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role || "Project Manager"})
                      </option>
                    ))}
                  </select>
                  {isPmUser && (
                    <div style={{ fontSize: 11, color: "var(--accent2)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <span>🔒</span> Locked to active Project Manager ({loggedInUser?.name || "Saurabh M."})
                    </div>
                  )}
                </div>
              </Field>
              <div className="row3">
                <Field l="Status">
                  <select className="inp" value={f.status} onChange={e => set("status", e.target.value)}>
                    {S.projectStatuses.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field l="Start">
                  <input type="date" className="inp" value={f.start} onChange={e => set("start", e.target.value)} />
                </Field>
                <Field l="Target">
                  <input type="date" className="inp" value={f.end} onChange={e => set("end", e.target.value)} />
                </Field>
              </div>
              <Field l={`Initial Progress: ${f.progress}%`}>
                <input type="range" min="0" max="100" step="5" value={f.progress} onChange={e => set("progress", +e.target.value)} style={{ accentColor: "var(--accent)", width: "100%" }} />
              </Field>

              {/* ASSIGNED TEAMMATES SECTION */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <Field l={`Assign Teammates / Engineering Team (${(f.selectedTeammates || []).length} Selected)`}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* SELECTED TEAMMATES SUMMARY BADGES */}
                    {(f.selectedTeammates || []).length > 0 && (
                      <div style={{ padding: "10px 12px", background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", borderRadius: 10, border: "1px solid #6ee7b7", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#065f46", letterSpacing: ".4px" }}>
                          Selected Teammates ({(f.selectedTeammates || []).length}):
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(f.selectedTeammates || []).map(tm => (
                            <div key={tm.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#ffffff", borderRadius: 20, border: "1px solid #a7f3d0", fontSize: 12, fontWeight: 600, color: "#065f46", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                              <span>👤 {tm.name}</span>
                              <span style={{ fontSize: 10.5, color: "#047857" }}>({tm.discipline})</span>
                              {tm.taskTitle && <span style={{ fontSize: 10.5, color: "#0284c7" }}>📌 {tm.taskTitle}</span>}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (f.selectedTeammates || []).filter(t => String(t.id) !== String(tm.id));
                                  set("selectedTeammates", updated);
                                }}
                                style={{ border: "none", background: "none", color: "#ef4444", fontWeight: 800, fontSize: 13, cursor: "pointer", marginLeft: 4, padding: 0 }}
                                title="Remove teammate"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <input
                      type="text"
                      className="inp"
                      placeholder="🔍 Filter staff by name, role, or discipline..."
                      value={staffFilterQuery}
                      onChange={e => setStaffFilterQuery(e.target.value)}
                      style={{ fontSize: 12, padding: "6px 10px", background: "#f8fafc" }}
                    />
                    
                    <div style={{ maxHeight: 200, overflowY: "auto", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {(db.users || [])
                        .filter(u => !u.role?.toLowerCase().includes("client") && !u.userType?.toLowerCase().includes("client"))
                        .filter(u =>
                          (u.name || "").toLowerCase().includes(staffFilterQuery.toLowerCase()) ||
                          (u.role || "").toLowerCase().includes(staffFilterQuery.toLowerCase()) ||
                          (u.discipline || "").toLowerCase().includes(staffFilterQuery.toLowerCase())
                        )
                        .map(u => {
                          const isSelected = (f.selectedTeammates || []).some(t => String(t.id) === String(u.id));
                          const teammateObj = (f.selectedTeammates || []).find(t => String(t.id) === String(u.id));

                          return (
                            <div key={u.id} style={{ padding: "8px 10px", background: isSelected ? "#ecfdf5" : "#fff", border: `1px solid ${isSelected ? "#6ee7b7" : "var(--line)"}`, borderRadius: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1, margin: 0, fontWeight: isSelected ? 700 : 500, fontSize: 13, color: "var(--ink)" }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      let current = f.selectedTeammates || [];
                                      if (checked) {
                                        current = [...current, { id: u.id, name: u.name, discipline: u.discipline || u.role || "Structural", taskTitle: "" }];
                                      } else {
                                        current = current.filter(t => String(t.id) !== String(u.id));
                                      }
                                      set("selectedTeammates", current);
                                    }}
                                    style={{ accentColor: "var(--accent)" }}
                                  />
                                  <span>{u.name === "You" ? "Administrator" : u.name}</span>
                                  <span style={{ fontSize: 11, color: "var(--muted)" }}>({u.role || u.discipline || "Staff"})</span>
                                </label>
                              </div>

                              {isSelected && (
                                <div style={{ marginTop: 6, paddingLeft: 24 }}>
                                  <input
                                    type="text"
                                    className="inp"
                                    placeholder={`📌 Assign initial task for ${u.name}...`}
                                    value={teammateObj?.taskTitle || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const current = (f.selectedTeammates || []).map(t => String(t.id) === String(u.id) ? { ...t, taskTitle: val } : t);
                                      set("selectedTeammates", current);
                                    }}
                                    style={{ fontSize: 11.5, padding: "4px 8px" }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      {(db.users || []).filter(u => !u.role?.toLowerCase().includes("client")).length === 0 && (
                        <div style={{ fontSize: 12, color: "var(--muted)", padding: 8, textAlign: "center" }}>No staff members available</div>
                      )}
                    </div>
                  </div>
                </Field>
              </div>
            </>
          )}
          {modal.type === "task" && (
            <>
              <Field l="Task">
                <input className="inp" value={f.title} onChange={e => set("title", e.target.value)} />
              </Field>
              <div className="row2">
                <Field l="Discipline">
                  <select className="inp" value={f.discipline} onChange={e => set("discipline", e.target.value)}>
                    {S.disciplines.map(d => <option key={d}>{d}</option>)}
                  </select>
                </Field>
                <Field l="Assignee Teammate">
                  <select className="inp" value={f.assignee} onChange={e => set("assignee", e.target.value)}>
                    {db.users.map(u => {
                      const displayName = u.name === "You" ? "Administrator" : u.name;
                      return (
                        <option key={u.id} value={u.id}>
                          {displayName} {u.role ? `(${u.role})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </Field>
              </div>
              <div className="row3">
                <Field l="Status">
                  <select className="inp" value={f.status} onChange={e => set("status", e.target.value)}>
                    {S.taskStatuses.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field l="Start">
                  <input type="date" className="inp" value={f.start} onChange={e => set("start", e.target.value)} />
                </Field>
                <Field l="Target">
                  <input type="date" className="inp" value={f.target} onChange={e => set("target", e.target.value)} />
                </Field>
              </div>
            </>
          )}
          {modal.type === "client" && (
            <>
              <Field l="Client name *">
                <input className="inp" value={f.name} onChange={e => set("name", e.target.value)} />
              </Field>
              <Field l="Sector">
                <input className="inp" value={f.sector} onChange={e => set("sector", e.target.value)} />
              </Field>
              
              {/* ASSIGNED PROJECT MANAGER / STAFF LEAD WITH SEARCH BAR */}
              <div style={{ marginTop: 12 }}>
                <Field l="Assigned Project Manager / Staff Lead">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      type="text"
                      className="inp"
                      placeholder="🔍 Search existing staff by name, role, or discipline..."
                      value={staffSearchQuery}
                      onChange={e => setStaffSearchQuery(e.target.value)}
                      style={{ fontSize: 12, padding: "6px 10px", background: "#f8fafc" }}
                    />
                    <select
                      className="inp"
                      value={f.projectManagerId}
                      onChange={e => set("projectManagerId", e.target.value)}
                    >
                      {(db.users || [])
                        .filter(u => !u.role?.toLowerCase().includes("client") && !u.userType?.toLowerCase().includes("client"))
                        .filter(u =>
                          (u.name || "").toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                          (u.role || "").toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                          (u.discipline || "").toLowerCase().includes(staffSearchQuery.toLowerCase())
                        )
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name === "You" ? "Administrator" : u.name} {u.role ? `(${u.role})` : ""}
                          </option>
                        ))}
                      {(db.users || [])
                        .filter(u => !u.role?.toLowerCase().includes("client") && !u.userType?.toLowerCase().includes("client"))
                        .filter(u =>
                          (u.name || "").toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                          (u.role || "").toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                          (u.discipline || "").toLowerCase().includes(staffSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <option value="" disabled>No matching staff found</option>
                        )}
                    </select>
                  </div>
                </Field>
              </div>

              <div className="row2" style={{ marginTop: 12 }}>
                <Field l="Contact Email">
                  <input className="inp" value={f.email} onChange={e => {
                    const val = e.target.value;
                    set("email", val);
                    set("contact", val); // Fallback alias
                  }} />
                </Field>
                <Field l="Contact Phone">
                  <input className="inp" value={f.phone} onChange={e => set("phone", e.target.value)} />
                </Field>
              </div>
              <div className="row2" style={{ marginTop: 12 }}>
                <Field l="Portal Username">
                  <input className="inp" value={f.username} onChange={e => set("username", e.target.value)} />
                </Field>
                <Field l="Portal Password">
                  <input type="password" className="inp" value={f.password} onChange={e => set("password", e.target.value)} />
                </Field>
              </div>
            </>
          )}
          {modal.type === "user" && (
            <>
              {modal.projectId && (
                <div style={{ marginBottom: 14, padding: "10px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
                    Assignment Option for Project: {db.projects.find(p => String(p.id) === String(modal.projectId) || String(p.uuid) === String(modal.projectId))?.name || ""}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className={`btn sm ${f.mode === "existing" ? "" : "sec"}`}
                      onClick={() => {
                        const firstEmp = db.users.find(u => u.name !== "Saurabh M." && !u.role?.toLowerCase().includes("client"));
                        set("mode", "existing");
                        if (firstEmp) {
                          set("existingUserId", firstEmp.id);
                          set("name", firstEmp.name);
                        }
                      }}
                      style={{ flex: 1, fontSize: 11.5 }}
                    >
                      Assign Existing Employee
                    </button>
                    <button
                      type="button"
                      className={`btn sm ${f.mode !== "existing" ? "" : "sec"}`}
                      onClick={() => set("mode", "new")}
                      style={{ flex: 1, fontSize: 11.5 }}
                    >
                      Create New Employee
                    </button>
                  </div>
                </div>
              )}

              {f.mode === "existing" ? (
                <>
                  {/* Dynamic Staff Roster Selection with Search Filter */}
                  {(() => {
                    const combinedRoster = [];

                    // 1. Add staff members from Staff Management API / DB
                    (staffList.length > 0 ? staffList : (db.staff || [])).forEach(s => {
                      if (s.name && !combinedRoster.some(item => item.name.toLowerCase() === s.name.toLowerCase())) {
                        combinedRoster.push({
                          id: s.id || s.uuid,
                          uuid: s.uuid || s.id,
                          name: s.name,
                          role: s.role || 'Staff',
                          email: s.email || '',
                          phone: s.contact_number || s.phone || ''
                        });
                      }
                    });

                    // 2. Add non-client users from db.users
                    (db.users || []).forEach(u => {
                      if (
                        u.name &&
                        u.name !== "Saurabh M." &&
                        !u.role?.toLowerCase().includes("client") &&
                        !u.userType?.toLowerCase().includes("client") &&
                        !u.role?.toLowerCase().includes("admin")
                      ) {
                        if (!combinedRoster.some(item => item.name.toLowerCase() === u.name.toLowerCase() || String(item.id) === String(u.id))) {
                          combinedRoster.push({
                            id: u.id,
                            uuid: u.uuid || u.id,
                            name: u.name === "You" ? "Administrator" : u.name,
                            role: u.role || u.discipline || "Staff",
                            email: u.email || '',
                            phone: u.phone || ''
                          });
                        }
                      }
                    });

                    // 3. Search Filter logic
                    const filteredRoster = combinedRoster.filter(item => 
                      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      item.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      item.email.toLowerCase().includes(searchFilter.toLowerCase())
                    );

                    return (
                      <>
                        <Field l="Search Staff Roster">
                          <input
                            className="inp"
                            type="text"
                            placeholder="🔍 Type to search by name or role..."
                            value={searchFilter}
                            onChange={e => setSearchFilter(e.target.value)}
                            style={{ width: "100%", marginBottom: 4 }}
                          />
                        </Field>
                        <Field l="Select Employee from Roster">
                          <select
                            className="inp"
                            value={f.existingUserId || (filteredRoster[0]?.id || "")}
                            onChange={e => {
                              const selVal = e.target.value;
                              const selectedStaff = combinedRoster.find(item => String(item.id) === String(selVal) || String(item.uuid) === String(selVal));
                              set("existingUserId", selVal);
                              if (selectedStaff) {
                                set("name", selectedStaff.name);
                                set("role", selectedStaff.role);
                                set("email", selectedStaff.email);
                                set("phone", selectedStaff.phone);
                              }
                            }}
                          >
                            {filteredRoster.length === 0 ? (
                              <option value="">No staff members match search</option>
                            ) : (
                              filteredRoster.map(s => (
                                <option key={s.id || s.uuid} value={s.id || s.uuid}>
                                  {s.name} ({s.role})
                                </option>
                              ))
                            )}
                          </select>
                        </Field>
                      </>
                    );
                  })()}
                  <Field l="Assign Task Name">
                    <input
                      className="inp"
                      placeholder="e.g. Structural Calculation & Drawing Review"
                      value={f.initialTask || ""}
                      onChange={e => set("initialTask", e.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field l="Full Name">
                    <input className="inp" value={f.name} onChange={e => set("name", e.target.value)} />
                  </Field>
                  <div className="row2">
                    <Field l="Username">
                      <input className="inp" value={f.username} onChange={e => set("username", e.target.value)} />
                    </Field>
                    <Field l="Password">
                      <input type="password" className="inp" value={f.password} onChange={e => set("password", e.target.value)} />
                    </Field>
                  </div>
                  <Field l="User Type / Role Assignment">
                    <select className="inp" value={f.userType} onChange={e => {
                      const type = e.target.value;
                      set("userType", type);
                      if (type === "Project Manager") {
                        set("role", "Project Manager");
                        set("discipline", "Admin / Management");
                      } else if (type === "Client") {
                        set("role", "Client Representative");
                        set("discipline", "Admin / Management");
                      } else if (type === "Admin") {
                        set("role", "Administrator");
                        set("discipline", "Admin / Management");
                      } else {
                        set("role", "");
                        set("discipline", S.disciplines[0] || "");
                      }
                    }}>
                      <option value="Employee">Employee (Related Department Lead/Staff)</option>
                      <option value="Project Manager">Project Manager</option>
                      <option value="Client">Client Representative</option>
                      <option value="Admin">System Administrator</option>
                    </select>
                  </Field>

                  {f.userType === "Client" && (
                    <Field l="Link to Client Account">
                      <select className="inp" value={f.clientId} onChange={e => set("clientId", e.target.value)}>
                        {db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                  )}

                  {(f.userType === "Employee" || f.userType === "Project Manager" || f.userType === "Admin") && (
                    <>
                      <div className="row2">
                        <Field l="Role Title (e.g. Structural Lead)">
                          <input className="inp" value={f.role} onChange={e => set("role", e.target.value)} disabled={f.userType === "Project Manager" || f.userType === "Admin"} />
                        </Field>
                        <Field l="Discipline Group">
                          <select className="inp" value={f.discipline} onChange={e => set("discipline", e.target.value)} disabled={f.userType === "Project Manager" || f.userType === "Admin"}>
                            {S.disciplines.map(d => <option key={d}>{d}</option>)}
                          </select>
                        </Field>
                      </div>
                      <div className="row2">
                        <Field l="Mail ID (Email)">
                          <input className="inp" placeholder="e.g. teammate@dgec.com" value={f.email || ""} onChange={e => set("email", e.target.value)} />
                        </Field>
                        <Field l="Contact Number (Phone)">
                          <input className="inp" placeholder="e.g. +968 9400 1122" value={f.phone || ""} onChange={e => set("phone", e.target.value)} />
                        </Field>
                      </div>
                      <Field l="Assign Task Name (Optional)">
                        <input className="inp" placeholder="e.g. Structural Frame Calculation & Drawing Review" value={f.initialTask || ""} onChange={e => set("initialTask", e.target.value)} />
                      </Field>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {modal.type === "invoice" && (
            <>
              <Field l="Invoice Number">
                <input className="inp" value={f.invoiceNo} onChange={e => set("invoiceNo", e.target.value)} />
              </Field>
              <div className="row2">
                <Field l="Project">
                  <select className="inp" value={f.projectId} onChange={e => set("projectId", e.target.value)}>
                    {db.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field l="Amount ($)">
                  <input type="number" className="inp" value={f.amount} onChange={e => set("amount", e.target.value)} />
                </Field>
              </div>
              <div className="row3">
                <Field l="Status">
                  <select className="inp" value={f.status} onChange={e => set("status", e.target.value)}>
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Paid">Paid</option>
                  </select>
                </Field>
                <Field l="Issue Date">
                  <input type="date" className="inp" value={f.issueDate} onChange={e => set("issueDate", e.target.value)} />
                </Field>
                <Field l="Due Date">
                  <input type="date" className="inp" value={f.dueDate} onChange={e => set("dueDate", e.target.value)} />
                </Field>
              </div>
            </>
          )}
        </div>
        <div className="foot">
          <button className="btn sec" onClick={close}>Cancel</button>
          <button className="btn" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  );
}
