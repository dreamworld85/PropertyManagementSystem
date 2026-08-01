import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import Avatar from "./components/Avatar";
import Bar from "./components/Bar";
import Tag from "./components/Tag";
import { fmt, statusColor, barColor, uid } from "./utils/helpers";
import { SEED } from "./data/seed";
import { loadDB, saveDB } from "./utils/storage";
import "./index.css";

export default function ClientPortal() {
  const [sessionUser, setSessionUser] = useState(() => {
    try {
      const stored = localStorage.getItem('dgec_user');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return { name: "Client Representative", username: "client", role: "Client", userType: "Client", clientId: "1" };
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dgec_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.username) setSessionUser(u);
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (!sessionUser) return;
    const role = (sessionUser.role || '').toLowerCase();
    const userType = (sessionUser.userType || '').toLowerCase();

    if (role === 'employee' || userType === 'employee') {
      window.location.href = '/staff';
    }
  }, [sessionUser]);

  if (!sessionUser || !sessionUser.username) return null;

  const [db, setDb] = useState(() => SEED);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selProjectId, setSelProjectId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Sync DB states across open tabs
  useEffect(() => {
    let live = true;
    (async () => {
      const d = await loadDB();
      if (!live) return;
      if (d && d.projects && d.projects.length > 0) {
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

  // Determine user scoping
  const roleStr = (sessionUser.role || '').toLowerCase();
  const userTypeStr = (sessionUser.userType || '').toLowerCase();
  const isManager = roleStr.includes('manager') || userTypeStr.includes('manager') || sessionUser.username === 'projectmanager' || sessionUser.name === 'Saurabh M.' || sessionUser.name === 'Tharun';

  const pmId = String(sessionUser.uuid || sessionUser.pm_id || sessionUser.id || '').toLowerCase();
  const pmName = String(sessionUser.name || '').toLowerCase();

  // 1. Projects belonging to active user / PM
  const availableProjects = isManager
    ? (db.projects || []).filter(p => {
        const pPmId = String(p.pm_id || p.pmId || '').toLowerCase();
        const pPmName = String(p.project_manager || p.pm_name || '').toLowerCase();
        return (pmId && pPmId === pmId) || (pmName && pPmName.includes(pmName)) || (pmName && pmName.includes(pPmName));
      })
    : (db.projects || []);

  // 2. Scoped clients list
  const scopedClients = isManager
    ? (db.clients || []).filter(c => {
        const cPmId = String(c.pm_id || c.pmId || '').toLowerCase();
        const cPmName = String(c.pm_name || '').toLowerCase();

        if (pmId && cPmId === pmId) return true;
        if (pmName && cPmName && cPmName.includes(pmName)) return true;

        const cIdStr = String(c.id);
        const cUuidStr = String(c.uuid || '');
        const cNameStr = String(c.name || '').toLowerCase().trim();

        return availableProjects.some(p => 
          String(p.client_id) === cIdStr ||
          String(p.client_id) === cUuidStr ||
          (p.client_name && String(p.client_name).toLowerCase().trim() === cNameStr) ||
          (cNameStr && p.name && String(p.name).toLowerCase().includes(cNameStr))
        );
      })
    : (db.clients || []);

  // Helper to get committed projects for a specific client
  const getClientCommittedProjects = (clientObj) => {
    if (!clientObj || !availableProjects) return [];
    const cIdStr = String(clientObj.id);
    const cUuidStr = String(clientObj.uuid || '');
    const cNameStr = String(clientObj.name || '').toLowerCase().trim();

    return availableProjects.filter(p => {
      const pCid = String(p.client_id || p.clientId || '');
      if (pCid && (pCid === cIdStr || pCid === cUuidStr)) return true;
      if (p.client_name && String(p.client_name).toLowerCase().trim() === cNameStr) return true;
      if (cNameStr && p.name && String(p.name).toLowerCase().includes(cNameStr)) return true;
      return false;
    });
  };

  // Selected client object
  const activeClient = selectedClientId 
    ? scopedClients.find(c => String(c.id) === String(selectedClientId) || String(c.uuid) === String(selectedClientId))
    : null;

  const activeClientProjects = activeClient ? getClientCommittedProjects(activeClient) : [];

  // Selected Project object
  const selectedProj = activeClientProjects.find(p => String(p.id) === String(selProjectId) || String(p.uuid) === String(selProjectId)) || activeClientProjects[0];

  // Helper to get Project Manager details
  const getProjectManager = (proj) => {
    if (!proj) return { name: sessionUser.name || "Project Manager", role: "Project Manager" };
    if (proj.project_manager) return { name: proj.project_manager, role: "Project Manager" };
    if (proj.pm_name) return { name: proj.pm_name, role: "Project Manager" };
    return { name: sessionUser.name || "Project Manager", role: "Project Manager" };
  };

  // Helper to get assigned engineering teammates for a project
  const getProjectTeam = (proj) => {
    if (!proj || !db) return [];
    const projIdMatches = [
      String(proj.id).toLowerCase(),
      String(proj.uuid || '').toLowerCase(),
      String(proj.name || '').toLowerCase()
    ].filter(Boolean);

    const projTasks = (db.tasks || []).filter(t => t.projectId && projIdMatches.includes(String(t.projectId).toLowerCase()));
    const taskAssignees = Array.from(new Set(projTasks.map(t => String(t.assignee)).filter(Boolean)));
    
    const isEngineeringStaff = (u) => 
      !u.role?.toLowerCase().includes("admin") &&
      !u.userType?.toLowerCase().includes("admin") &&
      !u.role?.toLowerCase().includes("client") &&
      !u.userType?.toLowerCase().includes("client");

    return (db.users || []).filter(u => {
      if (!isEngineeringStaff(u)) return false;
      return taskAssignees.includes(String(u.id)) || taskAssignees.includes(String(u.uuid)) || (u.name && projTasks.some(t => String(t.assignee).toLowerCase() === u.name.toLowerCase()));
    });
  };

  // Client Document & Financial Accordion States and Handlers
  const [clientDocInput, setClientDocInput] = useState("");
  const [isClientFinancialsExpanded, setIsClientFinancialsExpanded] = useState(true);
  const [isClientDocsExpanded, setIsClientDocsExpanded] = useState(true);

  const handleClientDocStatusChange = async (docId, newStatus) => {
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

  const handleClientDocUpload = async (doc, file) => {
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

  const handleClientAddDoc = async (projId) => {
    if (!clientDocInput.trim()) return;
    const docName = clientDocInput.trim();
    setClientDocInput("");
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

  // Helper to resolve task assignee
  const getTaskAssignee = (task) => {
    if (!task || !db) return { name: "Unassigned" };
    const rawVal = String(task.assignee_id || task.assignee || '').trim();
    if (!rawVal) return { name: "Unassigned" };

    const rawLower = rawVal.toLowerCase();

    // 1. Search in db.users
    const userMatch = (db.users || []).find(u => 
      String(u.id) === rawVal ||
      String(u.uuid) === rawVal ||
      (u.name && u.name.toLowerCase() === rawLower) ||
      (u.username && u.username.toLowerCase() === rawLower)
    );
    if (userMatch && userMatch.name) return userMatch;

    // 2. Search in db.staff
    const staffMatch = (db.staff || []).filter(Boolean).find(s => 
      String(s.id) === rawVal ||
      String(s.uuid) === rawVal ||
      (s.name && s.name.toLowerCase() === rawLower)
    );
    if (staffMatch && staffMatch.name) return staffMatch;

    // 3. Search in db.teammates
    const tmMatch = (db.teammates || []).filter(Boolean).find(tm => 
      String(tm.id) === rawVal ||
      String(tm.uuid) === rawVal ||
      (tm.name && tm.name.toLowerCase() === rawLower)
    );
    if (tmMatch && tmMatch.name) return tmMatch;

    // If string name passed directly
    if (isNaN(rawVal) && rawVal.length > 1) {
      return { name: rawVal };
    }

    // Default fallback to engineering teammate if numeric ID without match
    const engTeammates = (db.users || []).filter(u => !u.role?.toLowerCase().includes("admin") && !u.role?.toLowerCase().includes("client") && !u.userType?.toLowerCase().includes("admin") && !u.userType?.toLowerCase().includes("client"));
    const idx = (parseInt(rawVal, 10) || 0) % (engTeammates.length || 1);
    return engTeammates[idx] || engTeammates[0] || { name: "Ria" };
  };

  const getPhone = (user) => {
    if (!user) return "+968 9412 4455";
    if (user.phone) return user.phone;
    const strId = String(user.id || user.uuid || "1");
    return `+968 941${strId.slice(-2)} 4455`;
  };

  const getEmail = (user) => {
    if (!user) return "contact@dgec.com";
    if (user.email) return user.email;
    return `${(user.name || "user").toLowerCase().replace(/\s+/g, ".")}@dgec.com`;
  };

  if (!db) {
    return (
      <div className="wrap">
        <div className="splash">Loading Client Portal…</div>
      </div>
    );
  }

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
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <div>
                  <div className="t1 disp">Client Portal</div>
                  <div className="t2">Engineering Control</div>
                </div>
              </div>
              <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? "✕" : "☰"}
              </button>
            </div>

            <div className={menuOpen ? "side-nav-mobile-visible" : "side-nav-mobile-hidden"}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={sessionUser.name} size={36} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "#fff" }}>{sessionUser.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>{sessionUser.role || "Client Representative"}</div>
                  </div>
                </div>
              </div>

              {/* Navigation list */}
              <div className="muted" style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", padding: "14px 14px 6px" }}>
                Clients Directory ({scopedClients.length})
              </div>
              <nav className="nav" style={{ maxHeight: "48vh", overflowY: "auto" }}>
                <button
                  className={selectedClientId === null ? "on" : ""}
                  onClick={() => { setSelectedClientId(null); setSelProjectId(null); setMenuOpen(false); }}
                >
                  <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>🏢</span> All Clients Grid
                </button>

                {scopedClients.map(c => {
                  const isClientSelected = selectedClientId === c.id || selectedClientId === c.uuid;
                  const cProjects = getClientCommittedProjects(c);

                  return (
                    <React.Fragment key={c.id || c.uuid}>
                      <button
                        className={isClientSelected && !selProjectId ? "on" : ""}
                        onClick={() => {
                          setSelectedClientId(c.id || c.uuid);
                          setSelProjectId(cProjects[0]?.id || cProjects[0]?.uuid || null);
                          setMenuOpen(false);
                        }}
                      >
                        <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>📁</span> {c.name}
                      </button>

                      {/* Indented Projects under selected client */}
                      {isClientSelected && cProjects.map(p => {
                        const isProjSelected = String(selProjectId) === String(p.id) || String(selProjectId) === String(p.uuid);
                        return (
                          <button
                            key={p.id || p.uuid}
                            className={isProjSelected ? "on" : ""}
                            onClick={() => {
                              setSelectedClientId(c.id || c.uuid);
                              setSelProjectId(p.id || p.uuid);
                              setMenuOpen(false);
                            }}
                            style={{
                              paddingLeft: 28,
                              fontSize: 12,
                              opacity: isProjSelected ? 1 : 0.85
                            }}
                          >
                            <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>📑</span> {p.name}
                          </button>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
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

        {/* Main Content Area */}
        <main className="main" style={{ padding: 20 }}>
          {/* VIEW 1: BOXED CLIENTS GRID (Staff Portal Style) */}
          {selectedClientId === null ? (
            <div>
              {/* Topbar */}
              <div className="topbar" style={{ marginBottom: 20 }}>
                <div>
                  <h1 className="disp" style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Clients Directory</h1>
                  <p style={{ margin: "2px 0 0 0", color: "var(--muted)", fontSize: 13 }}>
                    Showing clients and committed project details under {sessionUser.name}'s supervision.
                  </p>
                </div>
              </div>

              {/* Boxed Desktop Grid */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
                  gap: 18,
                  alignItems: 'start'
                }}
              >
                {scopedClients.map((c) => {
                  const cProjects = getClientCommittedProjects(c);
                  const n = cProjects.length;
                  const totalContract = cProjects.reduce((acc, p) => acc + (parseFloat(p.total_cost || p.totalCost) || 0), 0);
                  const avgProg = cProjects.length > 0 ? Math.round(cProjects.reduce((acc, p) => acc + (Number(p.progress) || 0), 0) / cProjects.length) : 0;

                  return (
                    <div
                      key={c.id || c.uuid}
                      className="card"
                      onClick={() => setSelectedClientId(c.id || c.uuid)}
                      style={{
                        padding: '20px 22px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        border: '1px solid var(--line)',
                        background: '#fff',
                        borderRadius: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent2)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(47, 93, 138, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--line)';
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <Avatar name={c.name} size={46} />
                        <div>
                          <div className="disp" style={{ fontWeight: 800, fontSize: 16.5, color: 'var(--ink)' }}>
                            {c.name}
                          </div>
                          <div className="muted" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>
                            {c.company || c.sector || 'General Engineering Sector'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="muted" style={{ fontWeight: 600 }}>Email Address:</span>
                          <span style={{ color: 'var(--ink)', fontWeight: 600, wordBreak: 'break-all' }}>{c.email || c.contact || 'contact@client.com'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="muted" style={{ fontWeight: 600 }}>Phone Number:</span>
                          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.phone || c.contact_number || '+968 9000 0000'}</span>
                        </div>
                      </div>

                      {/* Stat Metrics Pill */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--surface)', padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>
                        <div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Contract Value</div>
                          <div style={{ fontWeight: 800, color: '#10b981', fontSize: 13.5, marginTop: 2 }}>
                            {totalContract > 0 ? `$${totalContract.toLocaleString()}` : 'Active Agreement'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Avg Progress</div>
                          <div style={{ fontWeight: 800, color: avgProg >= 80 ? '#10b981' : '#3b82f6', fontSize: 13.5, marginTop: 2 }}>
                            {avgProg}% Completed
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                        <span className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                          Committed Projects
                        </span>
                        <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6', fontSize: 13.5 }}>
                          {n} Project{n !== 1 ? 's' : ''} →
                        </span>
                      </div>
                    </div>
                  );
                })}

                {scopedClients.length === 0 && (
                  <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: '#fff', gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 6px', color: 'var(--ink)' }}>No Clients Found</h3>
                    <p style={{ color: 'var(--muted)', fontSize: 13.5, maxWidth: 440, margin: '0 auto' }}>
                      No clients registered under {sessionUser.name}'s supervision.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* VIEW 2: DETAILED CLIENT WORKSPACE & COMMITTED PROJECTS DETAILS */
            <div>
              {/* Compact Integrated Topbar */}
              <div className="card" style={{ padding: "12px 18px", background: "#fff", borderRadius: 14, border: "1px solid var(--line)", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => setSelectedClientId(null)}
                    className="btn sec sm"
                    style={{ padding: "5px 10px", fontSize: 12, fontWeight: 700, borderRadius: 6 }}
                  >
                    ← Back
                  </button>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>{activeClient?.name || "Client Workspace"}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      Sector: <strong>{activeClient?.company || activeClient?.sector || "General Sector"}</strong> · Contact: <strong>{activeClient?.email || activeClient?.contact || "—"}</strong>
                    </div>
                  </div>
                </div>

                {/* Project Tabs */}
                {activeClientProjects.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {activeClientProjects.map(p => (
                      <button
                        key={p.id || p.uuid}
                        onClick={() => setSelProjectId(p.id || p.uuid)}
                        className={selectedProj?.id === p.id || selectedProj?.uuid === p.uuid ? "btn pri sm" : "btn sec sm"}
                        style={{ borderRadius: 6, padding: "5px 12px", fontSize: 11.5, fontWeight: 700 }}
                      >
                        📁 {p.name} ({p.progress || 0}%)
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedProj ? (() => {
                const projTotalCost = Number(selectedProj.totalCost !== undefined ? selectedProj.totalCost : (selectedProj.total_cost || selectedProj.cost || 500000));
                const projInvoices = (db.invoices || []).filter(inv => 
                  String(inv.projectId || inv.project_id || '').toLowerCase() === String(selectedProj.id || selectedProj.uuid || '').toLowerCase() ||
                  String(inv.projectName || inv.project_name || '').toLowerCase() === String(selectedProj.name || '').toLowerCase()
                );
                const projPaidInvoices = projInvoices.filter(inv => (inv.status || '').toLowerCase() === 'paid');
                const totalInvoicedVal = projInvoices.filter(inv => (inv.status || '').toLowerCase() !== 'draft').reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
                const totalPaidVal = projPaidInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
                const outstandingVal = projTotalCost > 0 ? Math.max(0, projTotalCost - totalPaidVal) : Math.max(0, totalInvoicedVal - totalPaidVal);
                const paidPercentVal = projTotalCost > 0 ? Math.min(100, Math.round((totalPaidVal / projTotalCost) * 100)) : (totalInvoicedVal > 0 ? Math.min(100, Math.round((totalPaidVal / totalInvoicedVal) * 100)) : 0);

                return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  
                  {/* Compact Project Control Header Bar */}
                  <div className="card" style={{ padding: "14px 18px", background: "#fff", borderRadius: 14, border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h2 className="disp" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>{selectedProj.name}</h2>
                        <Tag label={selectedProj.status} color={statusColor(selectedProj.status, db.settings?.projectStatuses)} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        Category: <strong>{selectedProj.category || "Full Engineering"}</strong> · Start: <strong>{fmt(selectedProj.start)}</strong> · Target: <strong>{fmt(selectedProj.end)}</strong>
                      </div>
                    </div>

                    <div style={{ minWidth: 200, flex: "0 0 220px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: "var(--muted)" }}>PROJECT PROGRESS</span>
                        <span style={{ color: "var(--ink)" }}>{selectedProj.progress || 0}%</span>
                      </div>
                      <Bar value={selectedProj.progress} color={barColor(selectedProj.progress)} />
                    </div>
                  </div>

                  {/* 2-Column Split: Left Side = PM Contact & Financial Overview; Right Side = Teammates & Task Breakdown */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14, alignItems: "start" }}>
                    
                    {/* Left Column: PM Contact & Financial Overview */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {getProjectManager(selectedProj) && (
                        <div className="card" style={{ padding: 16, background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 14, border: "1px solid var(--line)" }}>
                          <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>👔</span> Project Manager Direct Contact
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar name={getProjectManager(selectedProj).name} size={44} />
                            <div>
                              <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 15 }}>{getProjectManager(selectedProj).name}</div>
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                                {getProjectManager(selectedProj).role} · <span style={{ color: "var(--accent2)", fontWeight: 700 }}>MEP & Engineering</span>
                              </div>
                              <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12 }}>
                                <span style={{ fontWeight: 700, color: "var(--accent)" }}>📞 {getPhone(getProjectManager(selectedProj))}</span>
                                <span className="muted">✉ {getEmail(getProjectManager(selectedProj))}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ACCORDION CARD 1: FINANCIAL OVERVIEW & BILLING */}
                      <div className="card" style={{ padding: "14px 16px", background: "#fff", borderRadius: 14, border: "1px solid var(--line)" }}>
                        {/* Accordion Header Banner */}
                        <div
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
                          onClick={() => setIsClientFinancialsExpanded(!isClientFinancialsExpanded)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 6, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                              💳
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                              Financial Overview & Billing
                              <span className="pill" style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", fontSize: 10.5, fontWeight: 800 }}>
                                {paidPercentVal}% Paid
                              </span>
                            </span>
                          </div>

                          <button
                            type="button"
                            style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}
                          >
                            {isClientFinancialsExpanded ? "▲" : "▼"}
                          </button>
                        </div>

                        {/* Accordion Body: Financial Stats & Invoices */}
                        {isClientFinancialsExpanded && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                            {/* 4 Financial Metric Stat Chips */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                              <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--line)" }}>
                                <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>Contract Value</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                                  ${projTotalCost.toLocaleString()}
                                </div>
                              </div>

                              <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--line)" }}>
                                <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>Total Paid</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
                                  ${totalPaidVal.toLocaleString()}
                                </div>
                              </div>

                              <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--line)" }}>
                                <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>Total Invoiced</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)", marginTop: 2 }}>
                                  ${totalInvoicedVal.toLocaleString()}
                                </div>
                              </div>

                              <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--line)" }}>
                                <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>Outstanding</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "#d97706", marginTop: 2 }}>
                                  ${outstandingVal.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            {/* Payment Progress Bar */}
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                                <span style={{ color: "var(--muted)" }}>PAYMENT COMPLETED</span>
                                <span style={{ color: "var(--ink)" }}>{paidPercentVal}%</span>
                              </div>
                              <Bar value={paidPercentVal} color="#16a34a" />
                            </div>

                            {/* Invoices List */}
                            <div>
                              <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                                Project Invoices ({projInvoices.length})
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {projInvoices.map((inv) => (
                                  <div key={inv.id || inv.number} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: 12, color: "var(--ink)" }}>{inv.number || inv.invoice_number || `INV-${inv.id}`}</div>
                                      <div style={{ fontSize: 10.5, color: "var(--muted)" }}>Due: {fmt(inv.due || inv.dueDate)}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                      <div style={{ fontWeight: 800, fontSize: 12.5, color: "var(--ink)" }}>${(Number(inv.amount) || 0).toLocaleString()}</div>
                                      <Tag label={inv.status} color={statusColor(inv.status, db.settings?.invoiceStatuses)} />
                                    </div>
                                  </div>
                                ))}
                                {projInvoices.length === 0 && (
                                  <div style={{ padding: 8, fontSize: 11.5, color: "var(--muted)", textAlign: "center", fontStyle: "italic" }}>
                                    No invoices issued for this project yet.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ACCORDION CARD 2: REQUIRED DOCUMENT UPLOAD & COMPLIANCE */}
                      {(() => {
                        const pMatches = [
                          String(selectedProj.id).toLowerCase(),
                          String(selectedProj.uuid || '').toLowerCase(),
                          String(selectedProj.name || '').toLowerCase()
                        ];
                        const pDocs = (db.project_documents || db.documents || []).filter(d => d.projectId && pMatches.includes(String(d.projectId).toLowerCase()));

                        return (
                          <div className="card" style={{ padding: "14px 16px", background: "#fff", borderRadius: 14, border: "1px solid var(--line)" }}>
                            {/* Accordion Header Banner */}
                            <div
                              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
                              onClick={() => setIsClientDocsExpanded(!isClientDocsExpanded)}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 26, height: 26, borderRadius: 6, background: "#fef3c7", border: "1px solid #fde68a", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                                  📂
                                </div>
                                <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                                  Required Document Upload & Compliance
                                  <span className="pill" style={{ background: "#fef3c7", color: "#b45309", fontSize: 10.5, fontWeight: 800 }}>
                                    {pDocs.length} Docs
                                  </span>
                                </span>
                              </div>

                              <button
                                type="button"
                                style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}
                              >
                                {isClientDocsExpanded ? "▲" : "▼"}
                              </button>
                            </div>

                            {/* Accordion Body: Add Document & Documents Grid */}
                            {isClientDocsExpanded && (
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                                {/* Add Document Bar */}
                                <div style={{ display: "flex", gap: 6, marginBottom: 12, background: "#f8fafc", padding: 6, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                  <input
                                    type="text"
                                    className="inp"
                                    placeholder="New document name (e.g. Land Tax)..."
                                    value={clientDocInput}
                                    onChange={(e) => setClientDocInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleClientAddDoc(selectedProj.id);
                                    }}
                                    style={{ fontSize: 11.5, padding: "5px 8px", flex: 1, background: "#fff" }}
                                  />
                                  <button
                                    type="button"
                                    className="btn sm"
                                    onClick={() => handleClientAddDoc(selectedProj.id)}
                                    style={{ padding: "5px 10px", fontSize: 11, background: "var(--accent)", color: "#fff", fontWeight: 700, borderRadius: 6 }}
                                  >
                                    ＋ Add Document
                                  </button>
                                </div>

                                {/* Document Cards Grid */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {pDocs.map((doc) => {
                                    const isApproved = doc.status === "Approved";
                                    const isRejected = doc.status === "Rejected";
                                    const badgeBg = isApproved ? "#dcfce7" : isRejected ? "#fee2e2" : "#fef3c7";
                                    const badgeColor = isApproved ? "#15803d" : isRejected ? "#b91c1c" : "#b45309";
                                    const badgeBorder = isApproved ? "#86efac" : isRejected ? "#fca5a5" : "#fcd34d";

                                    return (
                                      <div
                                        key={doc.id || doc.uuid}
                                        style={{
                                          padding: "10px 12px",
                                          borderRadius: 10,
                                          border: `1px solid ${isApproved ? "#bbf7d0" : "#e2e8f0"}`,
                                          background: isApproved ? "#f0fdf4" : "#ffffff",
                                          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 8
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 6, background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                              {isApproved ? "✓" : isRejected ? "✕" : "📄"}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <div style={{ fontWeight: 800, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {doc.documentName}
                                              </div>
                                              <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {doc.fileName ? <span style={{ color: "#2563eb", fontWeight: 700 }}>📎 {doc.fileName}</span> : <span style={{ fontStyle: "italic" }}>No file uploaded yet</span>}
                                              </div>
                                            </div>
                                          </div>

                                          <select
                                            value={doc.status || "Pending"}
                                            onChange={(e) => handleClientDocStatusChange(doc.id || doc.uuid, e.target.value)}
                                            style={{ fontSize: 11, fontWeight: 700, padding: "3px 6px", borderRadius: 6, background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`, cursor: "pointer" }}
                                          >
                                            <option value="Pending">⌛ Pending</option>
                                            <option value="Approved">✅ Approved</option>
                                            <option value="Rejected">❌ Rejected</option>
                                          </select>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 6, borderTop: "1px dashed #e2e8f0" }}>
                                          <label className="btn sec sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, padding: "4px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 6, color: "#1e293b" }}>
                                            📤 {doc.fileName ? "Change File" : "Upload File"}
                                            <input type="file" style={{ display: "none" }} onChange={(e) => handleClientDocUpload(doc, e.target.files[0])} />
                                          </label>
                                          {doc.fileName && <span style={{ fontSize: 10.5, color: "#166534", fontWeight: 700 }}>✓ Ready for review</span>}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {pDocs.length === 0 && (
                                    <div style={{ padding: 12, textAlign: "center", fontSize: 11.5, color: "#94a3b8", fontStyle: "italic", background: "#f8fafc", borderRadius: 8 }}>
                                      No required documents configured yet.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Right Column: Teammates & Task Progress Breakdown */}
                    <div className="card" style={{ padding: 16, background: "#fff", borderRadius: 14, border: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 12 }}>
                        📋 Teammates & Task Progress Breakdown ({(db.tasks || []).filter(t => String(t.projectId) === String(selectedProj.id) || String(t.project_id) === String(selectedProj.id)).length})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {(db.tasks || []).filter(t => String(t.projectId) === String(selectedProj.id) || String(t.project_id) === String(selectedProj.id)).map((t) => {
                          const assignee = getTaskAssignee(t);
                          return (
                            <div
                              key={t.id}
                              style={{
                                padding: "12px 14px",
                                borderRadius: 10,
                                border: "1px solid var(--line)",
                                background: "var(--surface)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8
                              }}
                            >
                              {/* Teammate Name - Big & Bold */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Avatar name={assignee.name} size={32} />
                                  <div>
                                    <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--ink)", letterSpacing: "-.2px" }}>
                                      {assignee.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                                      {assignee.role || assignee.discipline || "Engineering Teammate"} · <span style={{ color: "var(--accent)", fontWeight: 700 }}>📞 {getPhone(assignee)}</span>
                                    </div>
                                  </div>
                                </div>
                                <Tag label={t.status} color={statusColor(t.status, db.settings?.taskStatuses)} />
                              </div>

                              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", background: "#fff", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)" }}>
                                Task: {t.title}
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                                <span className="muted">Due: {fmt(t.target)}</span>
                                <span style={{ fontWeight: 800, color: "var(--ink)" }}>{t.percent}%</span>
                              </div>
                              <Bar value={t.percent} color={barColor(t.percent)} />
                            </div>
                          );
                        })}
                        {(db.tasks || []).filter(t => String(t.projectId) === String(selectedProj.id) || String(t.project_id) === String(selectedProj.id)).length === 0 && (
                          <div style={{ padding: 16, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
                            No specific tasks assigned to this project yet.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
                );
              })() : (
                <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                  No active projects committed for {activeClient?.name} yet.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClientPortal />
  </React.StrictMode>
);
