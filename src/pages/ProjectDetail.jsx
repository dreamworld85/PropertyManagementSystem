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

  const projectInvoices = (db.invoices || []).filter((i) => i.projectId && projIdMatches.includes(String(i.projectId).toLowerCase()));
  const totalInvoiced = projectInvoices.filter((i) => i.status !== "Draft").reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = projectInvoices.filter((i) => i.status === "Paid").reduce((sum, i) => sum + i.amount, 0);
  const totalOutstanding = projectInvoices.filter((i) => i.status === "Pending" || i.status === "Overdue").reduce((sum, i) => sum + i.amount, 0);

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
    const pmId = proj.projectManagerId || proj.pm_id;
    if (pmId) {
      const pmUser = (db.users || []).find(u => String(u.id) === String(pmId) || String(u.uuid) === String(pmId));
      if (pmUser) return pmUser;
    }
    const pmUser = (db.users || []).find(u => u.name === "Saurabh M." || (u.role && u.role.toLowerCase().includes("project manager")));
    return pmUser || { name: "Saurabh M.", role: "Project Manager", email: "pm@dgec.com" };
  })();

  // 3. Robust Teammates Resolution
  const assignedTeammates = (() => {
    const team = [];
    const seen = new Set();

    tasks.forEach(t => {
      if (t.assignee) {
        const u = (db.users || []).find(usr => String(usr.id) === String(t.assignee) || String(usr.uuid) === String(t.assignee) || usr.name === t.assignee);
        if (u && !seen.has(String(u.id))) {
          seen.add(String(u.id));
          team.push({ ...u, taskTitle: t.title, taskStatus: t.status });
        }
      }
    });

    (db.teammates || []).forEach(tm => {
      if (projIdMatches.includes(String(tm.projectId).toLowerCase())) {
        if (!seen.has(String(tm.id || tm.name))) {
          seen.add(String(tm.id || tm.name));
          team.push(tm);
        }
      }
    });

    if (team.length === 0) {
      return (db.users || []).filter(u => !u.role?.toLowerCase().includes("client")).slice(0, 3);
    }
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

          {/* Teammates Cards */}
          {assignedTeammates.map((tm) => (
            <div key={tm.id || tm.name} style={{ padding: 14, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={tm.name} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  {tm.discipline || tm.role || "Engineering Staff"}
                </div>
                <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13.5, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tm.name}
                </div>
                {tm.taskTitle && (
                  <div style={{ fontSize: 11, color: "var(--accent2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    📌 Task: {tm.taskTitle}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="split-1-1">
        <div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div className="h3 disp" style={{ marginBottom: 0 }}>
                Tasks by discipline
              </div>
              {!isClient && (
                <button className="btn sm" onClick={openTask}>
                  ＋ Add task
                </button>
              )}
            </div>
            <p className="muted" style={{ fontSize: 11.5, marginBottom: 14 }}>
              {isClient ? "Read-only view of work in progress." : "Click a status chip to advance it; drag the slider to set % complete."}
            </p>
            {grouped.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No tasks yet.</div>}
            {grouped.map(([disc, ts]) => (
              <div key={disc} style={{ marginBottom: 16 }}>
                <div className="disc">
                  <i />
                  <b>{disc}</b>
                  <span className="muted" style={{ fontSize: 11 }}>({ts.length})</span>
                </div>
                <div style={{ paddingLeft: 14 }}>
                  {ts.map((t) => {
                    const assigneeName = userName(t.assignee);
                    const isUnassigned = !assigneeName || assigneeName.toLowerCase() === "unassigned";
                    const displayName = isUnassigned 
                      ? t.title 
                      : (t.title.toLowerCase().includes(assigneeName.toLowerCase()) ? t.title : `${assigneeName} - ${t.title}`);

                    return (
                      <div key={t.id} className="task" style={{ padding: "14px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 10 }}>
                        {/* 1. Teammates Name - Task */}
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)", marginBottom: 8 }}>
                          {displayName}
                        </div>

                        {/* 2. Progress Bar Directly Below */}
                        {!isClient ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              defaultValue={t.percent}
                              onMouseUp={(e) => setPercent(t.id, +e.target.value)}
                              onTouchEnd={(e) => setPercent(t.id, +e.target.value)}
                              style={{ flex: 1, accentColor: "var(--accent)" }}
                            />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent2)", minWidth: 36, textAlign: "right" }}>
                              {t.percent}%
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700 }}>
                              <span style={{ color: "#64748b" }}>Progress</span>
                              <span style={{ color: "var(--accent2)" }}>{t.percent}%</span>
                            </div>
                            <Bar value={t.percent} color={barColor(t.percent)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Project Financials Card */}
          {!isClient && (
            <div className="card" style={{ padding: 20, marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="h3 disp" style={{ marginBottom: 0 }}>
                  🪙 Project Financials
                </div>
                <button className="btn sm" onClick={() => setModal({ type: "invoice", projectId: proj.id })}>
                  ＋ Create invoice
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "var(--surface)", padding: 12, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Total Invoiced</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>${totalInvoiced.toLocaleString()}</div>
                </div>
                <div style={{ background: "var(--surface)", padding: 12, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Total Paid</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "var(--green)" }}>${totalPaid.toLocaleString()}</div>
                </div>
                <div style={{ background: "var(--surface)", padding: 12, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Outstanding</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "var(--amber)" }}>${totalOutstanding.toLocaleString()}</div>
                </div>
              </div>

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
                        style={{ fontSize: 11, padding: "2px 6px", border: "1px solid var(--line)", borderRadius: 6, background: "none" }}
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
        </div>

        <div className="card" style={{ padding: 20 }}>
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
    </div>
  );
}
