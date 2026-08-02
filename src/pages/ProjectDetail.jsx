import React, { useState } from 'react';
import Avatar from '../components/Avatar';
import Bar from '../components/Bar';
import Tag from '../components/Tag';
import { daysFrom, fmt, statusColor, barColor } from '../utils/helpers';

function getDocumentImagePreview(doc) {
  if (!doc) return '';
  const fileData = doc.fileDataUrl || doc.fileData || doc.filePath;
  if (fileData) {
    if (fileData.startsWith('data:image') || fileData.startsWith('data:application') || fileData.startsWith('http') || fileData.startsWith('/')) {
      return fileData;
    }
  }
  const title = doc.documentName || 'Engineering Document';
  const fileName = doc.fileName || 'official_document.pdf';
  const status = doc.status || 'Pending';
  const bg = status === 'Approved' ? '#064e3b' : status === 'Rejected' ? '#7f1d1d' : '#1e293b';
  const strokeColor = status === 'Approved' ? '#34d399' : status === 'Rejected' ? '#f87171' : '#38bdf8';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
    <rect width="800" height="560" fill="${bg}" rx="16" />
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${strokeColor}" stroke-width="0.5" opacity="0.2"/>
    </pattern>
    <rect width="800" height="560" fill="url(#grid)" />
    
    <rect x="24" y="24" width="752" height="512" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="8 4" rx="8" opacity="0.6"/>
    <rect x="36" y="36" width="728" height="488" fill="none" stroke="${strokeColor}" stroke-width="1.5" rx="6"/>

    <rect x="50" y="50" width="700" height="70" fill="rgba(255,255,255,0.06)" rx="8" stroke="${strokeColor}" stroke-width="1" />
    <text x="70" y="82" fill="#ffffff" font-family="monospace, sans-serif" font-size="20" font-weight="bold">DAR AL GULF ENGINEERING CONSULTANTS (DGEC)</text>
    <text x="70" y="104" fill="${strokeColor}" font-family="sans-serif" font-size="13" font-weight="bold">OFFICIAL PROJECT CONTROL DOCUMENT • ${title.toUpperCase()}</text>

    <g transform="translate(100, 150)">
      <rect x="0" y="0" width="360" height="240" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
      <rect x="40" y="30" width="120" height="90" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4 2"/>
      <text x="50" y="80" fill="#cbd5e1" font-family="sans-serif" font-size="11">MAIN OFFICE HALL</text>

      <rect x="180" y="30" width="140" height="90" fill="none" stroke="${strokeColor}" stroke-width="1.5"/>
      <text x="190" y="80" fill="#cbd5e1" font-family="sans-serif" font-size="11">MEP CONTROL ROOM</text>

      <rect x="40" y="140" width="280" height="70" fill="none" stroke="${strokeColor}" stroke-width="1.5"/>
      <text x="110" y="180" fill="#cbd5e1" font-family="sans-serif" font-size="11">STRUCTURAL LOBBY SECTION</text>

      <line x1="0" y1="-15" x2="360" y2="-15" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="140" y="-22" fill="#f59e0b" font-family="monospace" font-size="12" font-weight="bold">L = 36.50 m</text>
      
      <line x1="-15" y1="0" x2="-15" y2="240" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="-70" y="125" fill="#f59e0b" font-family="monospace" font-size="12" font-weight="bold">W = 24.0 m</text>
    </g>

    <g transform="translate(560, 260)">
      <circle cx="90" cy="90" r="75" fill="none" stroke="${strokeColor}" stroke-width="3" />
      <circle cx="90" cy="90" r="68" fill="none" stroke="${strokeColor}" stroke-dasharray="4 3" stroke-width="1.5" />
      <text x="90" y="70" fill="${strokeColor}" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">APPROVED DOCUMENT</text>
      <text x="90" y="95" fill="#ffffff" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle">${status.toUpperCase()}</text>
      <text x="90" y="115" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="middle">DGEC CONTROL ID: ${doc.id || 'DOC-8821'}</text>
    </g>

    <rect x="50" y="445" width="700" height="65" fill="rgba(0,0,0,0.4)" rx="6" stroke="${strokeColor}" stroke-width="1"/>
    <text x="70" y="470" fill="#e2e8f0" font-family="sans-serif" font-size="12" font-weight="bold">File Name: ${fileName}</text>
    <text x="70" y="492" fill="#94a3b8" font-family="sans-serif" font-size="11">Uploaded: ${doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'Official Version 1.0'} | Security Status: Verified</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

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
  const [isDocsExpanded, setIsDocsExpanded] = useState(true);
  const [previewDocModal, setPreviewDocModal] = useState(null);

  // Add Teammate Modal State
  const [showAddTeammateModal, setShowAddTeammateModal] = useState(false);
  const [newTmName, setNewTmName] = useState('');
  const [newTmRole, setNewTmRole] = useState('CAD Technician');
  const [newTmTaskTitle, setNewTmTaskTitle] = useState('');
  const [newTmEmail, setNewTmEmail] = useState('');
  const [newTmPhone, setNewTmPhone] = useState('');
  const [isSubmittingTm, setIsSubmittingTm] = useState(false);

  const handleCreateTeammateSubmitInProject = (e) => {
    e.preventDefault();
    if (!newTmName.trim()) {
      alert("Please enter teammate's name");
      return;
    }
    const tmUuid = 'tm_' + Math.random().toString(36).substring(2, 9);
    const taskUuid = 'task_' + Math.random().toString(36).substring(2, 9);
    const tmName = newTmName.trim();
    const taskTitle = newTmTaskTitle.trim() || `${tmName} - ${proj.name} Assignment`;
    const projId = proj.id;
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
      }, `Created and assigned teammate ${tmName} to ${proj.name}`);
    }

    // 2. CLOSE MODAL IMMEDIATELY
    setIsSubmittingTm(false);
    setShowAddTeammateModal(false);
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

    let fileDataUrl = '';
    try {
      fileDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    } catch(e) {}

    const updatedDoc = {
      ...doc,
      fileName,
      filePath: fileDataUrl || `uploads/${fileName}`,
      fileDataUrl: fileDataUrl || `uploads/${fileName}`,
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
          fileData: fileDataUrl || `uploads/${fileName}`,
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
  const [isTeammatesExpanded, setIsTeammatesExpanded] = useState(true);

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
      {/* Top Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onBack} className="btn sec sm" style={{ padding: "6px 12px", fontSize: 12, borderRadius: 6, fontWeight: 700 }}>
          ← Back to Projects
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Tag label={proj.status} color={statusColor(proj.status, S.projectStatuses)} />
        </div>
      </div>

      {/* 2-COLUMN SIDE-BY-SIDE FLEX CONTAINER (Zero Gap between Box 1 and Box 3) */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        
        {/* LEFT COLUMN: Box 1 (Project Overview) + Box 3 (Financials & Budget) */}
        <div style={{ flex: "1 1 420px", display: "flex", flexDirection: "column", gap: 14 }}>
          
          {/* ============================================================ */}
          {/* BOX 1: PROJECT DETAILS, DOCUMENT NUMBERS & PROGRESS BOX */}
          {/* ============================================================ */}
          <div className="card" style={{ padding: 16, background: "#fff", borderRadius: 14, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>📁</span> Project Overview & Details
              </span>
              <Tag label={proj.status} color={statusColor(proj.status, S.projectStatuses)} />
            </div>

            {/* Project Title & Client / PM Meta */}
            <div style={{ marginBottom: 14 }}>
              <h2 className="disp" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{proj.name}</h2>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 12 }}>
                <span>Client: <strong style={{ color: "var(--ink)" }}>{resolvedClientName}</strong></span>
                <span>Manager: <strong style={{ color: "var(--accent2)" }}>👔 {resolvedPM.name}</strong></span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Service: <strong>{proj.category || "Full Engineering"}</strong> · Start: <strong>{fmt(proj.start)}</strong> · Target: <strong>{fmt(proj.end)}</strong>
              </div>
            </div>

            {/* Document Numbers Section */}
            <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--line)", marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                Document Numbers
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {(proj.docNumbers || []).map((doc, idx) => (
                  <span key={idx} className="chipx" style={{ padding: "3px 8px", fontSize: 11.5 }}>
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
                {(proj.docNumbers || []).length === 0 && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>No document numbers linked.</span>}
                {!isClient && (
                  <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                    <input
                      id="new-doc-input-box1"
                      className="inp"
                      placeholder="Add doc number..."
                      style={{ padding: "3px 6px", width: 120, fontSize: 11 }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          setProjectDocNumbers(proj.id, [...(proj.docNumbers || []), e.target.value.trim()]);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button
                      className="btn sm"
                      style={{ padding: "3px 8px", height: 26, fontSize: 11 }}
                      onClick={() => {
                        const el = document.getElementById("new-doc-input-box1");
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

            {/* Overall Progress Slider Box */}
            <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 10, border: "1px solid #cbd5e1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                <span style={{ color: "var(--muted)" }}>OVERALL PROJECT PROGRESS</span>
                <span style={{ color: "var(--ink)", fontWeight: 800 }}>{proj.progress}%</span>
              </div>
              <Bar value={proj.progress} color={barColor(proj.progress)} />
              {!isClient && (
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={proj.progress}
                  onChange={(e) => setProjectProgress(proj.id, +e.target.value)}
                  style={{ width: "100%", marginTop: 6, accentColor: "var(--accent)", cursor: "pointer" }}
                />
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* BOX 3: PROJECT FINANCIALS & BUDGET BOX */}
          {/* ============================================================ */}
          {!isClient && (
            <div className="card" style={{ padding: 16, background: "#fff", borderRadius: 14, border: "1px solid var(--line)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🪙</span> Financials & Budget Tracking
                </span>
                <button className="btn sm" onClick={() => setModal({ type: "invoice", projectId: proj.id })} style={{ padding: "4px 10px", fontSize: 11, background: "var(--accent)", color: "#fff", fontWeight: 700 }}>
                  ＋ Create Invoice
                </button>
              </div>

              {/* 4 Stat Chips with Edit Button for Total Cost */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>TOTAL PROJECT COST</div>
                    {!isEditingCost && (
                      <button
                        onClick={() => { setCostInput(totalCost); setIsEditingCost(true); }}
                        style={{ border: "none", background: "none", color: "#2563eb", cursor: "pointer", fontSize: 10.5, fontWeight: 700 }}
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>

                  {!isEditingCost ? (
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>${totalCost.toLocaleString()}</div>
                  ) : (
                    <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>$</span>
                      <input
                        type="number"
                        className="inp"
                        style={{ padding: "2px 6px", fontSize: 12, width: 80 }}
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
                        style={{ padding: "2px 6px", fontSize: 11, background: "var(--accent)", color: "#fff" }}
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

                <div style={{ padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: 10, color: "#15803d", fontWeight: 700 }}>TOTAL PAID</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#166534", marginTop: 2 }}>${totalPaid.toLocaleString()}</div>
                </div>

                <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>TOTAL INVOICED</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)", marginTop: 2 }}>${totalInvoiced.toLocaleString()}</div>
                </div>

                <div style={{ padding: "10px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                  <div style={{ fontSize: 10, color: "#b45309", fontWeight: 700 }}>OUTSTANDING</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#92400e", marginTop: 2 }}>${outstandingBalance.toLocaleString()}</div>
                </div>
              </div>

              {/* Invoices List */}
              <div className="tbl">
                <div className="trow head" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr", padding: "6px 10px", fontSize: 11 }}>
                  <span>Invoice No</span>
                  <span>Amount</span>
                  <span>Due Date</span>
                  <span>Status</span>
                </div>
                {projectInvoices.map((inv) => (
                  <div key={inv.id} className="trow body" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr", padding: "6px 10px", fontSize: 11.5, alignItems: "center" }}>
                    <span style={{ fontWeight: 700 }}>{inv.invoiceNo}</span>
                    <span>${inv.amount.toLocaleString()}</span>
                    <span>{fmt(inv.dueDate)}</span>
                    <select
                      value={inv.status}
                      onChange={(e) => updateInvoiceStatus(inv.id, e.target.value)}
                      style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 4px", borderRadius: 6 }}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                ))}
                {projectInvoices.length === 0 && (
                  <div style={{ padding: 12, textAlign: "center", color: "var(--muted)", fontSize: 11.5 }}>
                    No invoices issued for this project.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Box 2 (Teammates) & Box 4 (Compliance Documents) as Accordion Type Cards */}
        <div style={{ flex: "1 1 420px", display: "flex", flexDirection: "column", gap: 14 }}>
          
          {/* ACCORDION CARD 1: TEAMMATES & WORK PROGRESS */}
          <div className="card" style={{ padding: "14px 18px", background: "#fff", borderRadius: 16, border: "1px solid var(--line)", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            {/* Accordion Header Banner */}
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
              onClick={() => setIsTeammatesExpanded(!isTeammatesExpanded)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                  👥
                </div>
                <h3 className="disp" style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                  Project Teammates & Work Progress
                  <span className="pill" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontSize: 10.5, fontWeight: 700, padding: "1px 6px" }}>
                    {assignedTeammates.length + 1} Members
                  </span>
                </h3>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}
                >
                  {isTeammatesExpanded ? "▲" : "▼"}
                </button>
              </div>
            </div>

            {/* Accordion Body: Teammates Grid */}
            {isTeammatesExpanded && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  {/* PM Card */}
                  <div style={{ padding: "12px 14px", background: "linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)", borderRadius: 12, border: "1.5px solid #cbd5e1", display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={resolvedPM.name} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: "var(--accent2)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px" }}>👔 Project Manager</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)", marginTop: 1 }}>{resolvedPM.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>MEP & Engineering Lead</div>
                    </div>
                  </div>

                  {/* Teammates Cards */}
                  {assignedTeammates.map((tm) => {
                    const taskObj = tasks.find(t =>
                      (t.assignee && (String(t.assignee) === String(tm.id) || String(t.assignee) === String(tm.uuid) || String(t.assignee).toLowerCase() === String(tm.name).toLowerCase())) ||
                      (tm.taskTitle && t.title === tm.taskTitle)
                    );
                    const currentPercent = taskObj ? taskObj.percent : (tm.percent || 0);
                    const currentStatus = taskObj ? taskObj.status : (tm.taskStatus || "In Progress");

                    return (
                      <div key={tm.id || tm.name} style={{ padding: "12px 14px", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar name={tm.name} size={36} />
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)", letterSpacing: "-.2px" }}>{tm.name}</div>
                              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{tm.discipline || tm.role || "Engineering Staff"}</div>
                            </div>
                          </div>
                          {taskObj && <Tag label={currentStatus} color={statusColor(currentStatus, S.taskStatuses)} />}
                        </div>

                        {taskObj && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", background: "#f8fafc", padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            📌 Task: <span style={{ color: "#2563eb" }}>{taskObj.title}</span>
                          </div>
                        )}

                        <div style={{ marginTop: 2 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                            <span style={{ color: "#64748b" }}>Task Completion</span>
                            <span style={{ color: "var(--ink)", fontWeight: 800 }}>{currentPercent}%</span>
                          </div>
                          <Bar value={currentPercent} color={barColor(currentPercent)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION CARD 2: REQUIRED DOCUMENT UPLOAD & COMPLIANCE */}
          <div className="card" style={{ padding: "14px 18px", background: "#fff", borderRadius: 16, border: "1px solid var(--line)", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            {/* Accordion Header Banner */}
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
              onClick={() => setIsDocsExpanded(!isDocsExpanded)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "#fef3c7", border: "1px solid #fde68a", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                  📂
                </div>
                <h3 className="disp" style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                  Required Document Upload & Compliance
                  <span className="pill" style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", fontSize: 10.5, fontWeight: 700, padding: "1px 6px" }}>
                    {projectDocs.length} Docs
                  </span>
                </h3>
              </div>

              <button
                type="button"
                style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}
              >
                {isDocsExpanded ? "▲" : "▼"}
              </button>
            </div>

            {/* Accordion Body: Documents Grid */}
            {isDocsExpanded && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                {/* Input Bar to Add Required Document */}
                {!isClient && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "#f8fafc", padding: 8, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <input
                      type="text"
                      className="inp"
                      placeholder="New document name (e.g. Land Tax)..."
                      value={newDocNameInput}
                      onChange={(e) => setNewDocNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddRequiredDocument();
                      }}
                      style={{ fontSize: 12, padding: "6px 10px", flex: 1, background: "#fff" }}
                    />
                    <button
                      className="btn sm"
                      onClick={handleAddRequiredDocument}
                      style={{ padding: "6px 12px", fontSize: 11.5, background: "var(--accent)", color: "#fff", fontWeight: 700, borderRadius: 8 }}
                    >
                      ＋ Add Document
                    </button>
                  </div>
                )}

                {/* List of Document Cards in Grid Layout Model */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
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
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: `1px solid ${isApproved ? "#bbf7d0" : "#e2e8f0"}`,
                          background: isApproved ? "#f0fdf4" : "#ffffff",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                              {isApproved ? "✓" : isRejected ? "✕" : "📄"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {doc.documentName}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {doc.fileName ? <span style={{ color: "#2563eb", fontWeight: 700 }}>📎 {doc.fileName}</span> : <span style={{ fontStyle: "italic" }}>No file uploaded yet</span>}
                              </div>
                            </div>
                          </div>

                          {!isClient ? (
                            <select
                              value={doc.status || "Pending"}
                              onChange={(e) => handleDocumentStatusChange(doc.id || doc.uuid, e.target.value)}
                              style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 8px", borderRadius: 8, background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`, cursor: "pointer" }}
                            >
                              <option value="Pending">⌛ Pending</option>
                              <option value="Approved">✅ Approved</option>
                              <option value="Rejected">❌ Rejected</option>
                            </select>
                          ) : (
                            <Tag label={doc.status || "Pending"} color={isApproved ? "#22c55e" : "#f59e0b"} />
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, paddingTop: 8, borderTop: "1px dashed #e2e8f0" }}>
                          <label className="btn sec sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "5px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, color: "#1e293b" }}>
                            📤 {doc.fileName ? "Change File" : "Upload Document File"}
                            <input type="file" style={{ display: "none" }} onChange={(e) => handleDocumentFileUpload(doc, e.target.files[0])} />
                          </label>

                          {(() => {
                            const hasUploadedFile = Boolean(doc.fileName || doc.filePath || doc.fileData || doc.fileDataUrl);
                            return (
                              <button
                                type="button"
                                className="btn sec sm"
                                disabled={!hasUploadedFile}
                                onClick={() => {
                                  if (hasUploadedFile) setPreviewDocModal(doc);
                                }}
                                title={hasUploadedFile ? "View uploaded document file" : "Upload a document file to enable viewing"}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "5px 12px",
                                  background: hasUploadedFile ? "#eff6ff" : "#f1f5f9",
                                  color: hasUploadedFile ? "#1d4ed8" : "#94a3b8",
                                  border: hasUploadedFile ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                                  borderRadius: 8,
                                  cursor: hasUploadedFile ? "pointer" : "not-allowed",
                                  opacity: hasUploadedFile ? 1 : 0.55,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                              >
                                👁️ View
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}

                  {projectDocs.length === 0 && (
                    <div style={{ padding: 20, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 12, background: "#f8fafc" }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>📂</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>No required documents configured</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                        Type a document name above (e.g. Building Permit) and click "＋ Add Document".
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discussion Card Below */}
      <div className="card" style={{ padding: 16, marginTop: 14, background: "#fff", borderRadius: 14, border: "1px solid var(--line)" }}>
        <div className="h3 disp" style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>💬 Discussion ({comments.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto", marginBottom: 10 }}>
          {comments.map((m) => (
            <div key={m.id} style={{ display: "flex", gap: 8, fontSize: 12 }}>
              <Avatar name={m.author} size={24} />
              <div style={{ background: "var(--surface)", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 11.5, color: "var(--ink)" }}>{m.author}</div>
                <div style={{ fontSize: 12, color: "#334155" }}>{m.body}</div>
              </div>
            </div>
          ))}
          {comments.length === 0 && <div style={{ fontSize: 11.5, color: "var(--muted)" }}>No comments yet.</div>}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="inp"
            placeholder="Add comment..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ fontSize: 12, padding: "5px 8px", flex: 1 }}
          />
          <button
            className="btn sm"
            style={{ background: "var(--accent)", color: "#fff", padding: "5px 10px" }}
            onClick={() => {
              if (draft.trim()) {
                addComment(proj.id, isClient ? "client" : "company", isClient ? clientName(asClient) : "You", draft);
                setDraft("");
              }
            }}
          >
            Send
          </button>
        </div>
      </div>

      {/* DOCUMENT IMAGE POPUP LIGHTBOX MODAL */}
      {previewDocModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(15, 23, 42, 0.8)', 
            backdropFilter: 'blur(8px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 99999, 
            padding: 20 
          }}
          onClick={() => setPreviewDocModal(null)}
        >
          <div 
            className="card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: '100%', 
              maxWidth: 840, 
              background: '#fff', 
              borderRadius: 18, 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Top Header */}
            <div style={{ padding: '16px 22px', background: '#1e293b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>🖼️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff' }}>
                    {previewDocModal.documentName || 'Document Image Preview'}
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                    File Name: <strong style={{ color: '#38bdf8' }}>{previewDocModal.fileName || 'Official Project Document'}</strong> · Status: <span style={{ color: previewDocModal.status === 'Approved' ? '#34d399' : '#f59e0b', fontWeight: 800 }}>{previewDocModal.status || 'Pending'}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setPreviewDocModal(null)}
                style={{ border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', width: 34, height: 34, borderRadius: 10, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Specific Document Image Area */}
            <div style={{ padding: 24, background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 380, maxHeight: '68vh', overflow: 'auto' }}>
              {(() => {
                const docFile = previewDocModal.fileData || previewDocModal.fileDataUrl || previewDocModal.filePath || (previewDocModal.fileName ? `/uploads/${previewDocModal.fileName}` : null);
                if (docFile) {
                  const isImage = String(docFile).startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(String(previewDocModal.fileName || docFile));
                  if (isImage) {
                    return (
                      <img 
                        src={docFile} 
                        alt={previewDocModal.documentName} 
                        style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 10, boxShadow: '0 12px 30px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}
                      />
                    );
                  }
                  return (
                    <iframe 
                      src={docFile} 
                      title={previewDocModal.documentName} 
                      style={{ width: '100%', height: '55vh', borderRadius: 10, border: 'none', background: '#fff' }}
                    />
                  );
                }
                return (
                  <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#f8fafc" }}>No Uploaded Document File</div>
                    <div style={{ fontSize: 12, marginTop: 4, color: "#94a3b8" }}>Upload a document file to view its image preview.</div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Controls */}
            <div style={{ padding: '14px 22px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                🔍 Specific Document Image Record ({previewDocModal.documentName})
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {(() => {
                  const docFile = previewDocModal.fileData || previewDocModal.fileDataUrl || previewDocModal.filePath || (previewDocModal.fileName ? `/uploads/${previewDocModal.fileName}` : null);
                  if (docFile) {
                    return (
                      <a
                        href={docFile}
                        download={previewDocModal.fileName || `${(previewDocModal.documentName || 'document').toLowerCase().replace(/\s+/g, '_')}.png`}
                        className="btn sec sm"
                        style={{ padding: '7px 16px', fontSize: 12, borderRadius: 8, fontWeight: 700, textDecoration: 'none', background: '#fff', border: '1px solid #cbd5e1', color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        📥 Download Uploaded File
                      </a>
                    );
                  }
                  return null;
                })()}
                <button
                  onClick={() => setPreviewDocModal(null)}
                  className="btn pri sm"
                  style={{ padding: '7px 18px', fontSize: 12, borderRadius: 8, fontWeight: 700, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Close Popup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
