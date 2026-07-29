import React from 'react';

export default function History({ db, clearHistory }) {
  const logs = db.history || [];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn sec sm" onClick={clearHistory} disabled={logs.length === 0}>
          🗑 Clear history log
        </button>
      </div>

      <div className="tbl">
        <div className="trow head" style={{ gridTemplateColumns: "1.2fr 1fr 3fr" }}>
          <span>Timestamp</span>
          <span>User</span>
          <span>Action</span>
        </div>
        {logs.map((log) => (
          <div
            key={log.id}
            className="trow body"
            style={{
              gridTemplateColumns: "1.2fr 1fr 3fr",
              background: "#fff",
              borderBottom: "1px solid var(--line)",
              padding: "12px 20px",
              alignItems: "start"
            }}
          >
            <span className="muted" style={{ fontSize: 12 }}>{log.at}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{log.user}</span>
            <span style={{ fontSize: 13, color: "var(--text)" }}>{log.action}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="empty">No history logs yet.</div>}
      </div>
    </div>
  );
}
