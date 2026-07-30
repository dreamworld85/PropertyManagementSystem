import React from 'react';
import Bar from '../components/Bar';
import { daysFrom, fmt, statusColor, barColor } from '../utils/helpers';
import { SEED } from '../data/seed';

export default function Overview({ db, clientName, userName, onOpen }) {
  const safeDb = db || {};
  const projects = safeDb.projects || [];
  const tasks = safeDb.tasks || [];
  const settings = safeDb.settings || SEED.settings;

  const active = projects.filter((p) => p.status === "Active").length;
  const open = tasks.filter((t) => t.status !== "Done");
  const dueSoon = open.filter((t) => {
    const dd = daysFrom(t.target);
    return dd >= 0 && dd <= 7;
  }).length;
  const overdue = open.filter((t) => daysFrom(t.target) < 0).length;
  const list = projects.filter((p) => p.status !== "Closed");
  const avg = Math.round(list.reduce((s, p) => s + (p.progress || 0), 0) / Math.max(1, list.length));

  const cards = [
    ["Active Projects", active, "var(--accent2)"],
    ["Due This Week", dueSoon, "var(--amber)"],
    ["Overdue Tasks", overdue, "var(--red)"],
    ["Avg. Progress", avg + "%", "var(--green)"]
  ];

  const upcomingProjects = [...projects]
    .filter((p) => p.status !== "Closed")
    .sort((a, b) => {
      const dateA = new Date(a.end || a.end_date || '2099-12-31');
      const dateB = new Date(b.end || b.end_date || '2099-12-31');
      return dateA - dateB;
    })
    .slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="kpi-row">
        {cards.map(([l, v, c]) => (
          <div key={l} className="card kpi">
            <div className="l">{l}</div>
            <div className="v">{v}</div>
            <div style={{ height: 3, width: 36, borderRadius: 9, background: c, marginTop: 10 }} />
          </div>
        ))}
      </div>
      <div className="split-2-1">
        <div className="card" style={{ padding: 20 }}>
          <div className="h3 disp">Projects by progress</div>
          {projects
            .filter((p) => p.status !== "Closed")
            .sort((a, b) => b.progress - a.progress)
            .slice(0, 8)
            .map((p) => (
              <button key={p.id} onClick={() => onOpen(p.id)} style={{ textAlign: "left", width: "100%", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyGroup: "space-between", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, fontSize: 13.5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: statusColor(p.status, settings.projectStatuses) }} />
                    {p.name}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {clientName(p.clientId)} · {p.progress}%
                  </span>
                </div>
                <Bar value={p.progress} color={barColor(p.progress)} />
              </button>
            ))}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="h3 disp">Upcoming deadlines</div>
          {upcomingProjects.map((p) => {
            const endDate = p.end || p.end_date || '2026-12-31';
            const dd = daysFrom(endDate);
            const late = dd < 0;
            const formatted = fmt(endDate);
            const parts = formatted.split(" ");
            const dayNum = parts[0] || "31";
            const monthStr = parts[1] || "DEC";

            return (
              <div key={p.id} onClick={() => onOpen(p.id)} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, cursor: "pointer" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: late ? "#b4503e14" : "var(--surface)",
                    border: "1px solid var(--line)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  <span className="disp" style={{ fontWeight: 800, fontSize: 15, color: late ? "var(--red)" : "var(--ink)", lineHeight: 1 }}>
                    {dayNum}
                  </span>
                  <span className="muted" style={{ fontSize: 9.5, textTransform: "uppercase" }}>
                    {monthStr}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 230, color: "var(--ink)" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: late ? "var(--red)" : "var(--muted)" }}>
                    {p.category || "Full Engineering"} · {late ? `${-dd}d overdue` : `in ${dd}d`}
                  </div>
                </div>
              </div>
            );
          })}

          {upcomingProjects.length === 0 && (
            <div className="muted" style={{ fontSize: 12.5, fontStyle: "italic", textAlign: "center", padding: 12 }}>
              No active project deadlines available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
