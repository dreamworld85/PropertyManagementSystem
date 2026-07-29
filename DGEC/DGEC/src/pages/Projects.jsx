import React, { useState } from 'react';
import Tag from '../components/Tag';
import Bar from '../components/Bar';
import { statusColor, barColor } from '../utils/helpers';

export default function Projects({ company, projects, db, onOpen, onNew }) {
  const [q, setQ] = useState("");
  const [sf, setSf] = useState("All");
  const list = projects.filter((p) => (sf === "All" || p.status === sf) && p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      {/* Client Assignment Notifications Banner for Project Manager */}
      {(() => {
        const clientNotifications = (db.history || []).filter(h => h.action && h.action.includes("Project Manager for Client"));
        if (clientNotifications.length === 0) return null;
        return (
          <div style={{ marginBottom: 16, padding: "14px 18px", background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", borderRadius: 12, border: "1px solid #6ee7b7", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 20 }}>🔔</div>
              <div>
                <div style={{ fontWeight: 800, color: "#065f46", fontSize: 13.5 }}>Client Assignment Notification</div>
                <div style={{ fontSize: 12.5, color: "#047857", marginTop: 2 }}>
                  {clientNotifications[0].action}
                </div>
              </div>
            </div>
            <span className="pill" style={{ background: "#10b981", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px" }}>
              {clientNotifications[0].at}
            </span>
          </div>
        );
      })()}

      <div className="toolbar">
        <div className="searchbox">
          <span className="muted">⌕</span>
          <input placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="inp" style={{ width: 140 }} value={sf} onChange={(e) => setSf(e.target.value)}>
          {["All", ...db.settings.projectStatuses].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {company && (
          <button className="btn" onClick={onNew}>
            ＋ New project
          </button>
        )}
      </div>
      <div className="tbl">
        <div className="trow head">
          <span>Project</span>
          <span>Client</span>
          <span>Doc Numbers</span>
          <span>Approvals</span>
          <span>Status</span>
          <span>Service</span>
          <span>Progress</span>
        </div>
        {list.map((p) => {
          const open = db.tasks.filter((t) => t.projectId === p.id && t.status !== "Done").length;
          return (
            <button key={p.id} className="trow body" onClick={() => onOpen(p.id)}>
              <span>
                <span className="pname">{p.name}</span>
                {open > 0 && <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>{open} open</span>}
              </span>
              <span style={{ fontSize: 13.5 }}>{db.clients.find((c) => c.id === p.clientId)?.name || "—"}</span>
              <span className="muted" style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }} title={(p.docNumbers || []).join(", ")}>
                {(p.docNumbers || []).join(", ") || "—"}
              </span>
              <span>
                <Tag label={p.approvalStatus || "Required"} color={statusColor(p.approvalStatus || "Required", db.settings.approvalStatuses)} />
              </span>
              <span>
                <Tag label={p.status} color={statusColor(p.status, db.settings.projectStatuses)} />
              </span>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {p.category}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bar value={p.progress} color={barColor(p.progress)} />
                <span className="muted" style={{ fontSize: 12, width: 30 }}>{p.progress}%</span>
              </span>
            </button>
          );
        })}
        {list.length === 0 && <div className="empty">No projects to show.</div>}
      </div>
    </div>
  );
}
