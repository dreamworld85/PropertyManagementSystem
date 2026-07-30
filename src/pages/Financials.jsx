import React, { useState } from 'react';
import Tag from '../components/Tag';
import { fmt, statusColor } from '../utils/helpers';

export default function Financials({ db = {}, addInvoice, updateInvoiceStatus, deleteInvoice, setModal, onOpen }) {
  const [q, setQ] = useState("");
  const [sf, setSf] = useState("All");
  const [pf, setPf] = useState("All");

  const safeDb = db || {};
  const invoices = safeDb.invoices || [];
  const projects = safeDb.projects || [];

  const list = invoices.filter((inv) => {
    if (!inv) return false;
    const project = projects.find((p) => String(p.id) === String(inv.projectId) || String(p.uuid) === String(inv.projectId));
    const invNo = String(inv.invoiceNo || inv.invoice_no || inv.id || '').toLowerCase();
    const projName = String(project?.name || '').toLowerCase();
    const queryLower = q.toLowerCase();

    const matchesQuery = invNo.includes(queryLower) || projName.includes(queryLower);
    const matchesStatus = sf === "All" || inv.status === sf;
    const matchesProject = pf === "All" || String(inv.projectId) === String(pf);
    return matchesQuery && matchesStatus && matchesProject;
  });

  const totalInvoiced = invoices.filter((i) => i.status !== "Draft").reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalPending = invoices.filter((i) => i.status === "Pending").reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalOverdue = invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const cards = [
    ["Total Invoiced", "$" + totalInvoiced.toLocaleString(), "var(--ink)"],
    ["Paid Invoices", "$" + totalPaid.toLocaleString(), "var(--green)"],
    ["Pending Invoices", "$" + totalPending.toLocaleString(), "var(--amber)"],
    ["Overdue Invoices", "$" + totalOverdue.toLocaleString(), "var(--red)"]
  ];

  return (
    <div>
      <div className="grid4" style={{ marginBottom: 22 }}>
        {cards.map(([l, v, c]) => (
          <div key={l} className="card kpi">
            <div className="l">{l}</div>
            <div className="v" style={{ color: c }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="searchbox">
          <span className="muted">⌕</span>
          <input placeholder="Search invoices…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <select className="inp" style={{ width: 180 }} value={pf} onChange={(e) => setPf(e.target.value)}>
          <option value="All">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select className="inp" style={{ width: 140 }} value={sf} onChange={(e) => setSf(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
          <option value="Paid">Paid</option>
        </select>

        <button className="btn" onClick={() => setModal({ type: "invoice" })}>
          ＋ New Invoice
        </button>
      </div>

      <div className="tbl">
        <div className="trow head" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr 1.2fr 1fr 1fr" }}>
          <span>Invoice No</span>
          <span>Project</span>
          <span>Amount</span>
          <span>Issue Date</span>
          <span>Due Date</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {list.map((inv) => {
          const proj = db.projects.find((p) => p.id === inv.projectId);
          return (
            <div
              key={inv.id}
              className="trow body"
              style={{
                gridTemplateColumns: "1fr 1.5fr 1fr 1.2fr 1.2fr 1fr 1fr",
                background: "#fff",
                alignItems: "center",
                borderBottom: "1px solid var(--line)"
              }}
            >
              <span style={{ fontWeight: 600 }}>{inv.invoiceNo}</span>
              <button
                onClick={() => proj && onOpen(proj.id)}
                style={{
                  textAlign: "left",
                  color: "var(--accent2)",
                  fontWeight: 500,
                  fontSize: 13.5,
                  border: "none",
                  background: "none",
                  cursor: "pointer"
                }}
              >
                {proj ? proj.name : "Unknown"}
              </button>
              <span>${inv.amount.toLocaleString()}</span>
              <span className="muted">{fmt(inv.issueDate)}</span>
              <span className="muted">{fmt(inv.dueDate)}</span>
              <span>
                <Tag label={inv.status} color={statusColor(inv.status)} />
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={inv.status}
                  onChange={(e) => updateInvoiceStatus(inv.id, e.target.value)}
                  style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--line)", background: "none" }}
                >
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Paid">Paid</option>
                </select>
                <button
                  className="muted"
                  onClick={() => deleteInvoice(inv.id)}
                  style={{ fontSize: 14, padding: "2px 6px", border: "none", background: "none", cursor: "pointer" }}
                  title="Delete invoice"
                >
                  🗑
                </button>
              </span>
            </div>
          );
        })}
        {list.length === 0 && <div className="empty">No invoices found.</div>}
      </div>
    </div>
  );
}
