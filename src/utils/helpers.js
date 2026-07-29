export const TODAY = new Date("2026-06-08");

export const uid = (p) => p + Math.random().toString(36).slice(2, 8);

export const daysFrom = (iso) => Math.round((new Date(iso) - TODAY) / 86400000);

export const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : "—";

export const PALETTE = ["#2f5d8a", "#b8862b", "#7b8190", "#9aa1ad", "#8a5a9c", "#3b8a86", "#c0762b"];

export const KNOWN = {
  Done: "#2f7d5b",
  Completed: "#2f7d5b",
  "In Progress": "#2f5d8a",
  "On Hold": "#b8862b",
  "Not Started": "#9aa1ad",
  TBC: "#7b8190",
  Active: "#2f7d5b",
  Concept: "#2f5d8a",
  Closed: "#9aa1ad",
  Required: "#7b8190",
  Sent: "#2f5d8a",
  Pending: "#b8862b",
  Rejected: "#b4503e",
  Approved: "#2f7d5b",
  Paid: "#2f7d5b",
  Overdue: "#b4503e",
  Draft: "#7b8190"
};

export const statusColor = (s, list) =>
  KNOWN[s] || PALETTE[((list || []).indexOf(s) < 0 ? 0 : (list || []).indexOf(s)) % PALETTE.length];

export const barColor = (p) => (p >= 80 ? "var(--green)" : p >= 40 ? "var(--accent)" : "var(--amber)");
