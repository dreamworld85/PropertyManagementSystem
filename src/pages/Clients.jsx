import React, { useState } from 'react';
import Avatar from '../components/Avatar';
import Bar from '../components/Bar';
import Tag from '../components/Tag';
import { fmt, statusColor, barColor } from '../utils/helpers';

export default function Clients({ db = {}, onAdd, onOpenProject }) {
  const [selectedId, setSelectedId] = useState(null);
  const safeDb = db || {};
  const clients = safeDb.clients || [];
  const projects = safeDb.projects || [];
  const tasks = safeDb.tasks || [];
  const users = safeDb.users || [];

  // Helper to get all committed projects for a client
  const getClientProjects = (c) => {
    if (!c || !projects) return [];
    const cNames = [
      c.name ? String(c.name).trim().toLowerCase() : "",
      c.contact_name ? String(c.contact_name).trim().toLowerCase() : "",
      c.username ? String(c.username).trim().toLowerCase() : ""
    ].filter(Boolean);

    const cIds = [
      c.id !== undefined ? String(c.id) : null,
      c.uuid !== undefined ? String(c.uuid) : null
    ].filter(Boolean);

    return projects.filter((p) => {
      // 1. Match by ID (clientId or client_id)
      const pCid = p.clientId !== undefined ? String(p.clientId) : (p.client_id !== undefined ? String(p.client_id) : null);
      if (pCid && cIds.includes(pCid)) return true;

      // 2. Match by Client Name property
      const pCname = p.clientName ? String(p.clientName).trim().toLowerCase() : (p.client ? String(p.client).trim().toLowerCase() : "");
      if (pCname && cNames.some(cn => cn === pCname || cn.includes(pCname) || pCname.includes(cn))) return true;

      // 3. Match by Client Name in Project Name
      if (c.name && p.name && String(p.name).toLowerCase().includes(String(c.name).toLowerCase())) return true;

      return false;
    });
  };

  // Helper to find the Project Manager for a given project
  const getProjectManager = (proj) => {
    if (!proj) return "Project Manager";
    if (typeof proj === "string" || typeof proj === "number") {
      proj = projects.find(p => String(p.id) === String(proj) || String(p.uuid) === String(proj));
    }
    if (proj && proj.project_manager && proj.project_manager.trim()) return proj.project_manager;
    if (proj && proj.pm_name && proj.pm_name.trim()) return proj.pm_name;

    if (proj && (proj.pm_id || proj.projectManagerId || proj.pmId)) {
      const pPmId = String(proj.pm_id || proj.projectManagerId || proj.pmId).toLowerCase();
      const pmUser = users.find(u => String(u.id).toLowerCase() === pPmId || String(u.uuid).toLowerCase() === pPmId);
      if (pmUser && pmUser.name) return pmUser.name;
    }

    try {
      const stored = localStorage.getItem('dgec_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.name) return u.name;
      }
    } catch(e) {}

    return "Project Manager";
  };

  if (selectedId) {
    const c = clients.find(item => String(item.id) === String(selectedId) || String(item.uuid) === String(selectedId));
    if (!c) {
      setSelectedId(null);
      return null;
    }
    const clientProjects = getClientProjects(c);

    return (
      <div>
        <button
          onClick={() => setSelectedId(null)}
          className="muted"
          style={{ fontSize: 13.5, marginBottom: 14, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          ← Back to Clients Directory
        </button>

        {/* Client Summary Header Card */}
        <div className="card" style={{ padding: 24, marginBottom: 20, background: "#fff", borderRadius: 16, border: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar name={c.name} size={64} />
            <div>
              <h2 className="disp" style={{ fontWeight: 800, fontSize: 22, color: "var(--ink)", margin: 0 }}>{c.name}</h2>
              <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>Sector: <strong>{c.sector || "General"}</strong></p>
            </div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600 }}>Email Address</div>
              <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14, marginTop: 4, wordBreak: "break-all" }}>{c.email || c.contact || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600 }}>Phone Number</div>
              <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14, marginTop: 4 }}>{c.phone || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600 }}>Total Committed Projects</div>
              <div style={{ fontWeight: 600, color: "var(--accent2)", fontSize: 16, marginTop: 4 }}>{clientProjects.length} Projects</div>
            </div>
          </div>
        </div>

        {/* Committed Projects Details Section */}
        <div className="card" style={{ padding: 24, background: "#fff", borderRadius: 16, border: "1px solid var(--line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 className="disp" style={{ margin: 0, fontSize: 18, color: "var(--ink)", fontWeight: 700 }}>
                Committed Projects ({clientProjects.length})
              </h3>
              <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                Click any project card to view its full project workspace and live status details.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {clientProjects.map((p) => (
              <div
                key={p.id || p.uuid}
                onClick={() => onOpenProject(p.id || p.uuid || p.name)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--surface)",
                  padding: "16px 20px",
                  borderRadius: 14,
                  border: "1.5px solid var(--line)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent2)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(47, 93, 138, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--line)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 16 }}>{p.name}</div>
                    <Tag label={p.status} color={statusColor(p.status, db.settings?.projectStatuses)} />
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
                    Category: <strong>{p.category || "Full Engineering"}</strong> · PM: <strong style={{ color: "var(--accent2)" }}>{getProjectManager(p)}</strong>
                  </div>
                  {p.desc && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 450 }}>
                      Scope: {p.desc}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "right", minWidth: 100 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Progress</div>
                    <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 15 }}>{p.progress}%</div>
                  </div>
                  <button
                    className="btn sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProject(p.id || p.uuid || p.name);
                    }}
                    style={{ background: "var(--accent2)", color: "#fff", border: "none", padding: "6px 14px", fontSize: 12, borderRadius: 8 }}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}

            {clientProjects.length === 0 && (
              <div className="empty" style={{ padding: 24, textAlign: "center" }}>
                No active projects committed for {c.name} yet.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 className="disp" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
            Clients Directory ({db.clients.length})
          </h2>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            Select any client to view contact info and committed projects.
          </p>
        </div>
        <button className="btn" onClick={onAdd}>
          ＋ Add client
        </button>
      </div>

      <div className="grid3">
        {db.clients.map((c) => {
          const clientProjects = getClientProjects(c);
          const n = clientProjects.length;

          return (
            <div
              key={c.id}
              className="card"
              onClick={() => setSelectedId(c.id)}
              style={{
                padding: 20,
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                border: "1px solid var(--line)",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 190
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.border = "1px solid var(--accent2)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(47, 93, 138, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = "1px solid var(--line)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={c.name} size={38} />
                <div>
                  <div className="disp" style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
                    {c.name}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {c.sector || "General Sector"}
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, borderTop: "1px solid var(--surface)", paddingTop: 10 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="muted" style={{ width: 65 }}>Email:</span>
                  <span style={{ color: "var(--text)", wordBreak: "break-all" }}>{c.email || c.contact || "—"}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="muted" style={{ width: 65 }}>Phone:</span>
                  <span style={{ color: "var(--text)" }}>{c.phone || "—"}</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  Committed Projects
                </span>
                <span className="disp" style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6, color: "var(--accent2)" }}>
                  {n} Project{n !== 1 ? "s" : ""}
                  <span style={{ fontSize: 12 }}>→</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
