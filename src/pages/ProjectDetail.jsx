import React, { useState } from 'react';
import Avatar from '../components/Avatar';
import Bar from '../components/Bar';
import Tag from '../components/Tag';
import { daysFrom, fmt, statusColor, barColor } from '../utils/helpers';

export default function ProjectDetail({
  proj,
  isClient,
  db,
  S,
  userName,
  clientName,
  addComment,
  cycleStatus,
  setPercent,
  onBack,
  openTask,
  asClient,
  setProjectProgress,
  setProjectApproval,
  setProjectDocNumbers,
  setProjectTotalCost,
  updateProjectDocState,
  updateProjectDocStatus,
  updateInvoiceStatus,
  setModal
}) {
  if (!proj) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <button onClick={onBack} className="btn sec sm" style={{ marginBottom: 16 }}>← Back to Projects</button>
        <div className="empty">Project details unavailable. Please select a valid project.</div>
      </div>
    );
  }

  const projIdMatches = [
    String(proj.id).toLowerCase(),
    String(proj.uuid).toLowerCase(),
    proj.db_id !== undefined ? String(proj.db_id).toLowerCase() : null,
    proj.name ? String(proj.name).toLowerCase() : null
  ].filter(Boolean);

  const tasks = (db.tasks || []).filter((t) => t.projectId && projIdMatches.includes(String(t.projectId).toLowerCase()));
  const comments = (db.comments || []).filter((m) => m.projectId && projIdMatches.includes(String(m.projectId).toLowerCase()));
  const grouped = (S?.disciplines || []).map((d) => [d, tasks.filter((t) => t.discipline === d)]).filter(([, t]) => t.length);
  const [draft, setDraft] = useState("");
  const [newDocNameInput, setNewDocNameInput] = useState("");
  const [isDocsExpanded, setIsDocsExpanded] = useState(false);

  const projectDocs = (db.project_documents || db.documents || []).filter(doc => 
    projIdMatches.includes(String(doc.projectId || doc.project_id || '').toLowerCase())
  );

  const handleAddRequiredDocument = async () => {
    if (!newDocNameInput.trim()) return;
    const docName = newDocNameInput.trim();
    const tempDocId = 'doc_' + Math.random().toString(36).substring(2, 9);
    const newDocObj = {
      id: tempDocId,
      uuid: tempDocId,
      projectId: String(proj.id),
      project_id: String(proj.id),
      documentName: docName,
      status: 'Pending',
      fileName: null,
      filePath: null
    };

    if (updateProjectDocState) {
      updateProjectDocState(newDocObj);
    }

    setNewDocNameInput("");

    try {
      await fetch(`/api/projects/${proj.id}/required-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentName: docName })
      });
    } catch(e) {
      console.error("Failed to save required document:", e);
    }
  };

  const handleDocumentFileUpload = async (doc, file) => {
    if (!file) return;
    const fileName = file.name;
    const fakePath = `uploads/${fileName}`;

    const updatedDoc = {
      ...doc,
      fileName,
      filePath: fakePath,
      uploadedAt: new Date().toISOString()
    };

    if (updateProjectDocState) {
      updateProjectDocState(updatedDoc);
    }

    try {
      await fetch(`/api/projects/${proj.id}/upload-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: doc.id || doc.uuid,
          documentName: doc.documentName,
          fileName,
          fileData: fakePath,
          status: doc.status || 'Pending'
        })
      });
    } catch(e) {
      console.error("Failed to upload document file:", e);
    }
  };

  const handleDocumentStatusChange = async (docId, newStatus) => {
    if (updateProjectDocStatus) {
      updateProjectDocStatus(docId, newStatus);
    }

    try {
      await fetch(`/api/documents/${docId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch(e) {
      console.error("Failed to update document status:", e);
    }
  };

  const [isEditingCost, setIsEditingCost] = useState(false);
  const [costInput, setCostInput] = useState(proj.totalCost !== undefined ? proj.totalCost : (proj.total_cost || 0));

  const totalCost = Number(proj.totalCost !== undefined ? proj.totalCost : (proj.total_cost || 0));
  const projectInvoices = (db.invoices || []).filter((i) => i.projectId && projIdMatches.includes(String(i.projectId).toLowerCase()));
  const totalInvoiced = projectInvoices.filter((i) => i.status !== "Draft").reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalPaid = projectInvoices.filter((i) => i.status === "Paid").reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalPendingInvoices = projectInvoices.filter((i) => i.status === "Pending" || i.status === "Overdue").reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const pendingCount = projectInvoices.filter((i) => i.status === "Pending" || i.status === "Overdue").length;

  // Outstanding calculation: If total project cost is set, outstanding balance = (totalCost - totalPaid). Otherwise (totalInvoiced - totalPaid)
  const outstandingBalance = totalCost > 0 ? Math.max(0, totalCost - totalPaid) : Math.max(0, totalInvoiced - totalPaid);
  const paidPercent = totalCost > 0 ? Math.min(100, Math.round((totalPaid / totalCost) * 100)) : (totalInvoiced > 0 ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 0);
  const remainingPercent = Math.max(0, 100 - paidPercent);

  // 1. Robust Client Name Resolution
  const resolvedClientName = (() => {
    const cid = proj.clientId !== undefined ? proj.clientId : proj.client_id;
    const found = (db.clients || []).find((c) => 
      String(c.id) === String(cid) || 
      String(c.uuid) === String(cid) ||
      (c.name && proj.clientName && String(c.name).toLowerCase() === String(proj.clientName).toLowerCase())
    );
    if (found && found.name) return found.name;
    if (proj.clientName) return proj.clientName;
    if (cid && clientName) return clientName(cid);
    return "—";
  })();

  // 2. Robust Project Manager Resolution
  const resolvedPM = (() => {
    if (proj.project_manager && proj.project_manager.trim()) {
      return { name: proj.project_manager, role: "Project Manager" };
    }
    if (proj.pm_name && proj.pm_name.trim()) {
      return { name: proj.pm_name, role: "Project Manager" };
    }

    const pmId = proj.projectManagerId || proj.pm_id || proj.pmId;
    if (pmId) {
      const pmUser = (db.users || []).find(u => String(u.id).toLowerCase() === String(pmId).toLowerCase() || String(u.uuid).toLowerCase() === String(pmId).toLowerCase());
      if (pmUser) return pmUser;
    }

    try {
      const stored = localStorage.getItem('dgec_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.name) return u;
      }
    } catch(e) {}

    return { name: "Project Manager", role: "Project Manager" };
  })();

  // Helper to resolve staff user by ID, UUID, name, or db_id across db.users, db.staff, and db.teammates
  const resolveStaffUser = (assigneeVal) => {
    if (!assigneeVal) return null;
    const val = String(assigneeVal).trim().toLowerCase();

    // 1. Search in db.users
    let found = (db.users || []).find(u =>
      String(u.id).toLowerCase() === val ||
      String(u.uuid || '').toLowerCase() === val ||
      String(u.db_id || '').toLowerCase() === val ||
      String(u.name || '').trim().toLowerCase() === val ||
      String(u.username || '').trim().toLowerCase() === val
    );
    if (found) return found;

    // 2. Search in db.staff
    found = (db.staff || []).find(s =>
      String(s.id).toLowerCase() === val ||
      String(s.uuid || '').toLowerCase() === val ||
      String(s.name || '').trim().toLowerCase() === val
    );
    if (found) {
      return {
        id: found.id || found.uuid,
        uuid: found.uuid || found.id,
        name: found.name,
        role: found.role || 'Staff',
        discipline: found.role || found.discipline || 'Engineering'
      };
    }

    // 3. Search in db.teammates
    found = (db.teammates || []).find(tm =>
      String(tm.id || '').toLowerCase() === val ||
      String(tm.uuid || '').toLowerCase() === val ||
      String(tm.name || '').trim().toLowerCase() === val
    );
    if (found) return found;

    // Return non-numeric name string if passed directly
    if (isNaN(val) && val.length > 1) {
      return { id: assigneeVal, name: assigneeVal, role: "Staff", discipline: "Engineering" };
    }

    return null;
  };

  // 3. Robust Teammates Resolution (Filter out Project Manager & duplicate entries)
  const assignedTeammates = (() => {
    const team = [];
    const seen = new Set();

    const pmId = proj.projectManagerId || proj.pm_id;
    const pmName = resolvedPM ? resolvedPM.name : "Project Manager";

    const isPM = (item) => {
      if (!item) return false;
      const nameLower = String(item.name || '').trim().toLowerCase();
      const roleLower = String(item.role || item.userType || item.user_type || '').trim().toLowerCase();
      return nameLower === "saurabh m." || nameLower === pmName.toLowerCase() || roleLower.includes("project manager") || roleLower.includes("project_manager");
    };

    tasks.forEach(t => {
      if (t.assignee) {
        const u = resolveStaffUser(t.assignee);
        if (u && !isPM(u) && !seen.has(String(u.name || u.id).toLowerCase())) {
          seen.add(String(u.name || u.id).toLowerCase());
          team.push({
            id: u.id || u.uuid,
            uuid: u.uuid || u.id,
            name: u.name,
            role: u.role || u.discipline || t.discipline || "Staff",
            discipline: u.discipline || u.role || t.discipline || "Engineering",
            taskTitle: t.title,
            taskStatus: t.status
          });
        }
      }
    });

    (db.teammates || []).forEach(tm => {
      if (projIdMatches.includes(String(tm.projectId || tm.project_id).toLowerCase())) {
        if (!isPM(tm) && !seen.has(String(tm.name || tm.id).toLowerCase())) {
          seen.add(String(tm.name || tm.id).toLowerCase());
          team.push(tm);
        }
      }
    });

    return team;
  })();

  return (
    <div>
      <button onClick={onBack} className="muted" style={{ fontSize: 13.5, marginBottom: 14 }}>
        ← Back
      </button>
      <div className="card detailhead" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h2 className="disp" style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-.5px", color: "var(--ink)" }}>
              {proj.name}
            </h2>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 4, maxWidth: 620, lineHeight: 1.5 }}>
              {proj.desc}
            </p>
          </div>
          <Tag label={proj.status} color={statusColor(proj.status, S.projectStatuses)} />
        </div>
        <div className="meta">
          {[
            ["Client", resolvedClientName],
            ["Project Manager", resolvedPM.name],
            ["Service", proj.category],
            ["Architect of Record", proj.aor],
            ["Start", fmt(proj.start)],
            ["Target finish", fmt(proj.end)]
          ].map(([k, v]) => (
            <div key={k}>
              <div className="k">{k}</div>
              <div className="v" style={{ fontWeight: 700, color: k === "Project Manager" ? "var(--accent2)" : "inherit" }}>{v}</div>
            </div>
          ))}
          <div>
            <div className="k">Approval Status</div>
            <div className="v" style={{ marginTop: 2 }}>
              {isClient ? (
                <Tag label={proj.approvalStatus || "Required"} color={statusColor(proj.approvalStatus || "Required", S.approvalStatuses)} />
              ) : (
                <select
                  className="inp"
                  style={{ padding: "4px 8px", height: "auto", width: "auto", fontSize: 12.5 }}
                  value={proj.approvalStatus || "Required"}
                  onChange={(e) => setProjectApproval(proj.id, e.target.value)}
                >
                  {(S.approvalStatuses || ["Required", "Sent", "Pending", "Rejected", "Approved"]).map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Document Numbers Section */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600 }}>
            Document Numbers
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {(proj.docNumbers || []).map((doc, idx) => (
              <span key={idx} className="chipx" style={{ padding: "4px 10px", fontSize: 12 }}>
                {doc}
                {!isClient && (
                  <button
                    onClick={() => setProjectDocNumbers(proj.id, proj.docNumbers.filter((_, i) => i !== idx))}
                    style={{ marginLeft: 6, color: "var(--muted)", fontWeight: "bold", border: "none", background: "none", cursor: "pointer" }}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {(proj.docNumbers || []).length === 0 && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>No document numbers linked.</span>}
            {!isClient && (
              <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
                <input
                  id="new-doc-input"
                  className="inp"
                  placeholder="Add doc number..."
                  style={{ padding: "4px 8px", width: 140, fontSize: 12 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      setProjectDocNumbers(proj.id, [...(proj.docNumbers || []), e.target.value.trim()]);
                      e.target.value = "";
                    }
                  }}
                />
                <button
                  className="btn sm"
                  style={{ padding: "4px 10px", height: 28 }}
                  onClick={() => {
                    const el = document.getElementById("new-doc-input");
                    if (el && el.value.trim()) {
                      setProjectDocNumbers(proj.id, [...(proj.docNumbers || []), el.value.trim()]);
                      el.value = "";
                    }
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {isClient ? "Overall progress" : "Overall progress (drag slider to adjust)"}
            </span>
            <span className="disp" style={{ fontWeight: 700 }}>
              {proj.progress}%
            </span>
          </div>
          {isClient ? (
            <Bar value={proj.progress} color={barColor(proj.progress)} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={proj.progress}
                onChange={(e) => setProjectProgress(proj.id, +e.target.value)}
                style={{ flex: 1, accentColor: "var(--accent)" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* REPOSITIONED COLLAPSIBLE REQUIRED PROJECT DOCUMENTS MANAGEMENT CARD */}
      <div className="card" style={{ marginBottom: 18, padding: "16px 20px", background: "#fff", borderRadius: 16, border: "1px solid var(--line)" }}>
        {/* Accordion Header Banner */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none"
          }}
          onClick={() => setIsDocsExpanded(!isDocsExpanded)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
              📂
            </div>
            <div>
              <h3 className="disp" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
                Required Project Documents
                <span className="pill" style={{ background: "var(--surface)", color: "var(--accent2)", border: "1px solid var(--line)", fontSize: 11, fontWeight: 700, padding: "2px 8px" }}>
                  {projectDocs.length} Document{projectDocs.length !== 1 ? "s" : ""}
                </span>
              </h3>
              <p className="muted" style={{ fontSize: 11.5, margin: "2px 0 0 0" }}>
                Upload required compliance documents and manage approval statuses.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!isClient && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  className="inp"
                  placeholder="New doc name (e.g., Land Tax)..."
                  value={newDocNameInput}
                  onChange={(e) => setNewDocNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddRequiredDocument();
                  }}
                  style={{ fontSize: 12, padding: "5px 10px", width: 190 }}
                />
                <button
                  className="btn sm"
                  onClick={handleAddRequiredDocument}
                  style={{ background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 11.5 }}
                >
                  ＋ Add Document
                </button>
              </div>
            )}

            {/* Accordion Chevron Icon */}
            <button
              type="button"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink)",
                cursor: "pointer"
              }}
            >
              {isDocsExpanded ? "▲" : "▼"}
            </button>
          </div>
        </div>

        {/* Accordion Body Grid Content */}
        {isDocsExpanded && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {projectDocs.map((doc) => {
                const isApproved = doc.status === "Approved";
                const isRejected = doc.status === "Rejected";

                const badgeBg = isApproved ? "#dcfce7" : isRejected ? "#fee2e2" : "#fef3c7";
                const badgeColor = isApproved ? "#15803d" : isRejected ? "#b91c1c" : "#b45309";
                const badgeBorder = isApproved ? "#86efac" : isRejected ? "#fca5a5" : "#fcd34d";

                return (
                  <div
                    key={doc.id || doc.uuid}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justify: "space-between",
                      gap: 12,
                      padding: "16px",
                      borderRadius: 14,
                      background: isApproved ? "#f0fdf4" : "#ffffff",
                      border: `1px solid ${isApproved ? "#bbf7d0" : "var(--line)"}`,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.02)"
                    }}
                  >
                    {/* Header: Icon & Title */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: badgeBg,
                          border: `1px solid ${badgeBorder}`,
                          color: badgeColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {isApproved ? "✓" : isRejected ? "✕" : "📄"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.documentName}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.fileName ? (
                            <span style={{ color: "#2563eb", fontWeight: 600 }}>
                              📎 {doc.fileName}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                              No file uploaded yet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions: File Upload & Status Dropdown */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
                      <label
                        className="btn sec sm"
                        style={{
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "5px 10px",
                          background: "#fff",
                          border: "1px solid var(--line)"
                        }}
                      >
                        📤 {doc.fileName ? "Change" : "Upload"}
                        <input
                          type="file"
                          style={{ display: "none" }}
                          onChange={(e) => handleDocumentFileUpload(doc, e.target.files[0])}
                        />
                      </label>

                      {!isClient ? (
                        <select
                          value={doc.status || "Pending"}
                          onChange={(e) => handleDocumentStatusChange(doc.id || doc.uuid, e.target.value)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`,
                            cursor: "pointer"
                          }}
                        >
                          <option value="Pending">⌛ Pending</option>
                          <option value="Approved">✅ Approved</option>
                          <option value="Rejected">❌ Rejected</option>
                        </select>
                      ) : (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`
                          }}
                        >
                          {doc.status || "Pending"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {projectDocs.length === 0 && (
                <div style={{ gridColumn: "1 / -1", padding: "24px", textAlign: "center", border: "1px dashed var(--line)", borderRadius: 12, background: "var(--surface)" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>📂</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>No required documents configured yet</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                    Type a required document name above (e.g. Land Tax, Building Permit) and click "＋ Add Document".
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DEDICATED PROJECT MANAGER & ASSIGNED TEAMMATES CARD */}
      <div className="card" style={{ marginBottom: 18, padding: 20, background: "#fff", borderRadius: 16, border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 className="disp" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>👥</span> Project Leadership & Assigned Teammates
          </h3>
          <span className="pill" style={{ background: "var(--surface)", color: "var(--accent2)", border: "1px solid var(--line)", fontSize: 11.5, fontWeight: 700 }}>
            {assignedTeammates.length + 1} Team Members
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {/* Project Manager Card */}
          <div style={{ padding: 14, background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 12, border: "1.5px solid #cbd5e1", display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={resolvedPM.name} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: "var(--accent2)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px" }}>Project Manager</div>
              <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 14, marginTop: 1 }}>{resolvedPM.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>{resolvedPM.role || "Engineering Lead"}</div>
            </div>
          </div>

          {/* Teammates Cards with Integrated Task Progress Sliders */}
          {assignedTeammates.map((tm) => {
            const taskObj = tasks.find(t =>
              (t.assignee && (String(t.assignee) === String(tm.id) || String(t.assignee) === String(tm.uuid) || String(t.assignee).toLowerCase() === String(tm.name).toLowerCase())) ||
              (tm.taskTitle && t.title === tm.taskTitle)
            );

            const currentPercent = taskObj ? taskObj.percent : (tm.percent || 0);
            const currentStatus = taskObj ? taskObj.status : (tm.taskStatus || "In Progress");
            const taskTitleText = taskObj ? taskObj.title : (tm.taskTitle || "Project Task");

            return (
              <div key={tm.id || tm.name} style={{ padding: 14, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--line)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={tm.name} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>
                        {tm.discipline || tm.role || "Engineering Staff"}
                      </div>
                      {taskObj && !isClient && (
                        <span
                          className="chip sm"
                          onClick={() => cycleStatus(taskObj.id, tm.name)}
                          title="Click to advance status"
                          style={{
                            fontSize: 9.5,
                            padding: "2px 6px",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontWeight: 700,
                            background: (currentStatus === "Done" ? "#dcfce7" : currentStatus === "In Progress" ? "#dbeafe" : "#f3f4f6"),
                            color: (currentStatus === "Done" ? "#15803d" : currentStatus === "In Progress" ? "#1d4ed8" : "#4b5563")
                          }}
                        >
                          {currentStatus}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 14, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tm.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--accent2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                      📌 Task: {taskTitleText}
                    </div>
                  </div>
                </div>

                {/* Integrated Task Progress Slider Directly Under Teammate Card */}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                    <span style={{ color: "var(--muted)" }}>Task Progress</span>
                    <span style={{ color: "var(--accent2)", fontWeight: 800 }}>{currentPercent}%</span>
                  </div>

                  {!isClient && taskObj ? (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={currentPercent}
                      onChange={(e) => setPercent(taskObj.id, +e.target.value, tm.name)}
                      onMouseUp={(e) => setPercent(taskObj.id, +e.target.value, tm.name)}
                      onTouchEnd={(e) => setPercent(taskObj.id, +e.target.value, tm.name)}
                      style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
                    />
                  ) : (
                    <Bar value={currentPercent} color={barColor(currentPercent)} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REPOSITIONED PROJECT FINANCIALS & BUDGET TRACKING CARD */}
      {!isClient && (
        <div className="card" style={{ marginBottom: 18, padding: 20, background: "#fff", borderRadius: 16, border: "1px solid var(--line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div className="h3 disp" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🪙</span> Project Financials & Budget Tracking
              </div>
              <p className="muted" style={{ fontSize: 11.5, margin: "2px 0 0 0" }}>
                Track total project cost, invoiced amounts, collected payments, and remaining balance.
              </p>
            </div>

            <button className="btn sm" onClick={() => setModal({ type: "invoice", projectId: proj.id })} style={{ background: "var(--accent)", color: "#fff", fontWeight: 700 }}>
              ＋ Create invoice
            </button>
          </div>

          {/* 5 Financial Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}>
            {/* 1. Total Project Cost */}
            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Project Cost</span>
                {!isEditingCost && (
                  <button
                    onClick={() => { setCostInput(totalCost); setIsEditingCost(true); }}
                    style={{ border: "none", background: "none", color: "#2563eb", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {!isEditingCost ? (
                <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>
                  ${totalCost.toLocaleString()}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>$</span>
                  <input
                    type="number"
                    className="inp"
                    style={{ padding: "4px 8px", fontSize: 13, width: 100 }}
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setProjectTotalCost(proj.id, Number(costInput));
                        setIsEditingCost(false);
                      }
                    }}
                  />
                  <button
                    className="btn sm"
                    style={{ padding: "4px 8px", fontSize: 11, background: "var(--accent)", color: "#fff" }}
                    onClick={() => {
                      setProjectTotalCost(proj.id, Number(costInput));
                      setIsEditingCost(false);
                    }}
                  >
                    ✓
                  </button>
                </div>
              )}
            </div>

            {/* 2. Total Invoiced */}
            <div style={{ background: "var(--surface)", padding: 14, borderRadius: 12, border: "1px solid var(--line)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Total Invoiced</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--ink)", marginTop: 4 }}>
                ${totalInvoiced.toLocaleString()}
              </div>
            </div>

            {/* 3. Total Paid */}
            <div style={{ background: "#f0fdf4", padding: 14, borderRadius: 12, border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 11, color: "#15803d", fontWeight: 700, textTransform: "uppercase" }}>Total Paid</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#166534", marginTop: 4 }}>
                ${totalPaid.toLocaleString()}
              </div>
            </div>

            {/* 4. Total Pending Invoices */}
            <div style={{ background: "#fff7ed", padding: 14, borderRadius: 12, border: "1px solid #ffedd5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#c2410c", fontWeight: 700, textTransform: "uppercase" }}>Total Pending Invoices</span>
                <span style={{ fontSize: 10, background: "#ffedd5", color: "#c2410c", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                  {pendingCount} Pending
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#9a3412", marginTop: 4 }}>
                ${totalPendingInvoices.toLocaleString()}
              </div>
            </div>

            {/* 5. Outstanding Balance */}
            <div style={{ background: "#fffbeb", padding: 14, borderRadius: 12, border: "1px solid #fde68a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#b45309", fontWeight: 700, textTransform: "uppercase" }}>Outstanding Balance</span>
                {totalCost > 0 && (
                  <span style={{ fontSize: 10, background: "#fef3c7", color: "#b45309", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                    {remainingPercent}% Rem.
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#92400e", marginTop: 4 }}>
                ${outstandingBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Financial Budget Progress Bar Indicator */}
          {totalCost > 0 && (
            <div style={{ marginBottom: 16, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
                <span>Budget Collection Progress ({paidPercent}% Paid)</span>
                <span style={{ color: "#64748b" }}>${totalPaid.toLocaleString()} of ${totalCost.toLocaleString()}</span>
              </div>
              <Bar value={paidPercent} color={paidPercent >= 100 ? "#22c55e" : "#2563eb"} />
            </div>
          )}

          <div className="tbl">
            <div className="trow head" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr", padding: "8px 12px" }}>
              <span>Invoice No</span>
              <span>Amount</span>
              <span>Due Date</span>
              <span>Status</span>
            </div>
            {projectInvoices.map((inv) => (
              <div
                key={inv.id}
                className="trow body"
                style={{
                  gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                  padding: "8px 12px",
                  background: "#fff",
                  alignItems: "center",
                  borderBottom: "1px solid var(--line)"
                }}
              >
                <span style={{ fontWeight: 600 }}>{inv.invoiceNo}</span>
                <span>${inv.amount.toLocaleString()}</span>
                <span>{fmt(inv.dueDate)}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <select
                    value={inv.status}
                    onChange={(e) => updateInvoiceStatus(inv.id, e.target.value)}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: inv.status === "Paid" ? "1px solid #bbf7d0" : inv.status === "Pending" ? "1px solid #ffedd5" : inv.status === "Overdue" ? "1px solid #fecaca" : "1px solid var(--line)",
                      background: inv.status === "Paid" ? "#f0fdf4" : inv.status === "Pending" ? "#fff7ed" : inv.status === "Overdue" ? "#fef2f2" : "#f8fafc",
                      color: inv.status === "Paid" ? "#15803d" : inv.status === "Pending" ? "#c2410c" : inv.status === "Overdue" ? "#b91c1c" : "var(--ink)",
                      cursor: "pointer"
                    }}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Paid">Paid</option>
                  </select>
                </span>
              </div>
            ))}
            {projectInvoices.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 12.5 }}>
                No invoices for this project.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discussion Section */}
      <div className="card" style={{ padding: 20, marginTop: 18 }}>
        <div className="h3 disp">💬 Discussion</div>
          {comments.length === 0 && (
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              No comments yet.
            </div>
          )}
          {comments.map((m) => (
            <div key={m.id} className="comment">
              <Avatar name={m.author} size={28} />
              <div className="bubble">
                <div className="who">
                  <b style={{ fontSize: 13.5 }}>{m.author}</b>
                  <span
                    className="tag"
                    style={{
                      fontSize: 9.5,
                      textTransform: "uppercase",
                      background: (m.role === "client" ? "var(--accent2)" : "var(--accent)") + "1a",
                      color: m.role === "client" ? "var(--accent2)" : "var(--accent)"
                    }}
                  >
                    {m.role}
                  </span>
                  <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>
                    {fmt(m.at)}
                  </span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5 }}>{m.body}</p>
              </div>
            </div>
          ))}
          <div className="commentbox">
            <textarea
              rows="2"
              placeholder={isClient ? "Add a comment for the DGEC team…" : "Reply…"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              className="send"
              onClick={() => {
                addComment(proj.id, isClient ? "client" : "company", isClient ? clientName(asClient) : "You", draft);
                setDraft("");
              }}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
  );
}
